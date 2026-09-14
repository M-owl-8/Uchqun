import logger from './logger.js';

/**
 * Strip embedded metadata (EXIF/IPTC/XMP) from uploaded images.
 *
 * Why: photographs taken on phones routinely carry GPS coordinates, the device
 * serial, and a capture timestamp. This platform stores photographs of
 * identified children in special-education schools, so a media library that
 * preserves originals byte-for-byte is publishing the location of those
 * children. Uploads were previously stored exactly as received.
 *
 * sharp drops all metadata on re-encode unless withMetadata() is called, so a
 * decode/encode round trip is the strip. The one thing that must survive is
 * EXIF *orientation*: it is metadata, so discarding it naively leaves
 * phone photos rotated. `.rotate()` with no argument bakes the existing
 * orientation into the pixels first, then the tag is dropped harmlessly.
 *
 * This must never block an upload. sharp is a native module that has failed to
 * load in containers before (mediaController loads it lazily for exactly that
 * reason), so every failure path returns the original buffer and logs.
 */

// Animated GIFs need `{ animated: true }` and a different encoder path; a plain
// re-encode would silently flatten them to a single frame. GIFs are not a
// meaningful EXIF carrier, so they pass through untouched.
const STRIPPABLE = new Set(['image/jpeg', 'image/png', 'image/webp']);

let sharpModule;
let sharpUnavailable = false;

async function getSharp() {
  if (sharpUnavailable) return null;
  if (!sharpModule) {
    try {
      sharpModule = (await import('sharp')).default;
    } catch (error) {
      sharpUnavailable = true;
      logger.warn('sharp unavailable — image metadata will not be stripped', { error: error.message });
      return null;
    }
  }
  return sharpModule;
}

/**
 * @param {Buffer} buffer - raw image bytes
 * @param {string} mime   - detected (not client-declared) MIME type
 * @returns {Promise<{buffer: Buffer, stripped: boolean}>}
 */
export async function stripImageMetadata(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return { buffer, stripped: false };
  }
  if (!STRIPPABLE.has(mime)) {
    return { buffer, stripped: false };
  }

  const sharp = await getSharp();
  if (!sharp) return { buffer, stripped: false };

  try {
    const pipeline = sharp(buffer, { failOn: 'none' }).rotate();

    let out;
    if (mime === 'image/jpeg') {
      out = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    } else if (mime === 'image/png') {
      out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    } else {
      out = await pipeline.webp({ quality: 90 }).toBuffer();
    }

    if (!out || out.length === 0) {
      logger.warn('Metadata strip produced an empty buffer — keeping original', { mime });
      return { buffer, stripped: false };
    }

    return { buffer: out, stripped: true };
  } catch (error) {
    // A corrupt or exotic image must not fail the upload — it already passed
    // magic-byte validation, so store it as-is and record that it kept metadata.
    logger.warn('Image metadata strip failed — storing original', { mime, error: error.message });
    return { buffer, stripped: false };
  }
}

export default stripImageMetadata;
