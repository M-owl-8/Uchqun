import { jest } from '@jest/globals';

/**
 * Regression guard: POST /reception/documents was wired to the MEDIA multer
 * (`upload`), whose fileFilter allows only images and video. Reception's UI
 * offers `.pdf` (reception/src/components/DocumentUpload.jsx) and the
 * controller's DOCUMENT_ALLOWED_MIMES includes application/pdf — so every PDF
 * upload was rejected by middleware before the controller ran.
 *
 * These tests exercise the real multer fileFilter functions, not mocks.
 */

const { upload, uploadDocumentSingle, handleUploadError } = await import('../middleware/upload.js');

// Reach into the configured multer instance and run its fileFilter directly.
const runFilter = (multerInstance, mimetype) =>
  new Promise((resolve) => {
    const file = { mimetype, originalname: 'doc.pdf' };
    multerInstance.fileFilter({}, file, (err, accepted) =>
      resolve({ accepted: accepted === true, err }),
    );
  });

// uploadDocumentSingle is upload.single('file') on the document multer; the
// instance itself hangs off the returned middleware's closure, so assert via a
// freshly imported document multer instead.
const { uploadDocument } = await import('../middleware/upload.js');

describe('reception document upload — MIME filter', () => {
  it('the DOCUMENT multer accepts application/pdf', async () => {
    const { accepted, err } = await runFilter(uploadDocument, 'application/pdf');
    expect(err).toBeFalsy();
    expect(accepted).toBe(true);
  });

  it('the DOCUMENT multer accepts images', async () => {
    for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
      const { accepted } = await runFilter(uploadDocument, mime);
      expect(accepted).toBe(true);
    }
  });

  it('the DOCUMENT multer rejects video', async () => {
    const { accepted, err } = await runFilter(uploadDocument, 'video/mp4');
    expect(accepted).toBe(false);
    expect(err).toBeInstanceOf(Error);
  });

  it('the MEDIA multer rejects application/pdf — proving the two are not interchangeable', async () => {
    const { accepted, err } = await runFilter(upload, 'application/pdf');
    expect(accepted).toBe(false);
    expect(err).toBeInstanceOf(Error);
  });

  it('exports uploadDocumentSingle as usable middleware', () => {
    expect(typeof uploadDocumentSingle).toBe('function');
  });
});

describe('handleUploadError', () => {
  const mkRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('returns 400 with a size-limit-agnostic message on LIMIT_FILE_SIZE', async () => {
    // Must be a REAL MulterError — handleUploadError branches on
    // `err instanceof multer.MulterError`, so a hand-rolled Error with the
    // right .name silently falls through to the generic branch and the
    // assertion below would pass without exercising this code path at all.
    const multer = (await import('multer')).default;
    const err = new multer.MulterError('LIMIT_FILE_SIZE');
    expect(err instanceof multer.MulterError).toBe(true);

    const res = mkRes();
    handleUploadError(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('File too large');
    // Must not claim 50MB — documents cap at 10MB and share this handler.
    expect(body.message).not.toMatch(/50\s*MB/i);
    expect(body.message).toMatch(/maximum allowed size/i);
  });

  it('passes through when there is no error', () => {
    const next = jest.fn();
    handleUploadError(null, {}, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });
});
