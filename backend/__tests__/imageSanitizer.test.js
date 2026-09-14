import { jest } from '@jest/globals';
import sharp from 'sharp';
import { stripImageMetadata } from '../utils/imageSanitizer.js';

/**
 * EXIF/GPS stripping on uploaded images. These tests use real sharp encodes,
 * not mocks — a mocked sharp would pass even if the strip did nothing.
 */

// sharp requires every EXIF value to be a string.
const GPS_EXIF = {
  IFD0: { Copyright: 'Uchqun test' },
  GPSIFD: {
    GPSLatitudeRef: 'N',
    GPSLatitude: '41/1, 18/1, 412/10',
    GPSLongitudeRef: 'E',
    GPSLongitude: '69/1, 16/1, 125/10',
  },
};

const makeJpegWithGps = () =>
  sharp({ create: { width: 32, height: 32, channels: 3, background: '#4488cc' } })
    .jpeg()
    .withMetadata({ exif: GPS_EXIF })
    .toBuffer();

describe('stripImageMetadata', () => {
  it('removes EXIF (including GPS) from a JPEG that has it', async () => {
    const dirty = await makeJpegWithGps();
    const before = await sharp(dirty).metadata();
    expect(before.exif).toBeTruthy(); // fixture really is dirty

    const { buffer, stripped } = await stripImageMetadata(dirty, 'image/jpeg');
    expect(stripped).toBe(true);

    const after = await sharp(buffer).metadata();
    expect(after.exif).toBeFalsy();
    expect(after.iptc).toBeFalsy();
    expect(after.xmp).toBeFalsy();
  });

  it('the stripped JPEG contains no GPS bytes anywhere in the file', async () => {
    const dirty = await makeJpegWithGps();
    const { buffer } = await stripImageMetadata(dirty, 'image/jpeg');
    // 'GPS' appears in the EXIF tag table of the dirty file; it must be gone.
    expect(buffer.includes(Buffer.from('Uchqun test'))).toBe(false);
    expect(dirty.includes(Buffer.from('Uchqun test'))).toBe(true);
  });

  it('keeps the image decodable and the same dimensions', async () => {
    const dirty = await makeJpegWithGps();
    const { buffer } = await stripImageMetadata(dirty, 'image/jpeg');
    const md = await sharp(buffer).metadata();
    expect(md.width).toBe(32);
    expect(md.height).toBe(32);
    expect(md.format).toBe('jpeg');
  });

  it('applies EXIF orientation to the pixels before dropping the tag', async () => {
    // orientation 6 = rotate 90deg. A 40x20 image must come back 20x40.
    const rotated = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#fff' } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();

    const { buffer } = await stripImageMetadata(rotated, 'image/jpeg');
    const md = await sharp(buffer).metadata();
    expect(md.width).toBe(20);
    expect(md.height).toBe(40);
    expect(md.exif).toBeFalsy();
  });

  it('strips PNG and WebP too', async () => {
    for (const [fmt, mime] of [['png', 'image/png'], ['webp', 'image/webp']]) {
      const base = sharp({ create: { width: 16, height: 16, channels: 3, background: '#123456' } });
      const src = await (fmt === 'png' ? base.png() : base.webp()).toBuffer();
      const { stripped, buffer } = await stripImageMetadata(src, mime);
      expect(stripped).toBe(true);
      expect((await sharp(buffer).metadata()).format).toBe(fmt);
    }
  });

  it('passes GIFs through untouched (a plain re-encode would flatten animation)', async () => {
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    const { buffer, stripped } = await stripImageMetadata(gif, 'image/gif');
    expect(stripped).toBe(false);
    expect(buffer).toBe(gif);
  });

  it('passes video through untouched', async () => {
    const buf = Buffer.from([0, 1, 2, 3]);
    const out = await stripImageMetadata(buf, 'video/mp4');
    expect(out).toEqual({ buffer: buf, stripped: false });
  });

  it('returns the original buffer rather than throwing on corrupt input', async () => {
    const junk = Buffer.from('not really a jpeg at all');
    const { buffer, stripped } = await stripImageMetadata(junk, 'image/jpeg');
    expect(stripped).toBe(false);
    expect(buffer).toBe(junk); // upload must not be blocked
  });

  it('handles empty / non-buffer input without throwing', async () => {
    expect(await stripImageMetadata(Buffer.alloc(0), 'image/jpeg')).toEqual({
      buffer: expect.any(Buffer),
      stripped: false,
    });
    const notBuf = await stripImageMetadata(null, 'image/jpeg');
    expect(notBuf.stripped).toBe(false);
  });
});
