// refs #02-010 — document filePath stored temp disk path that is wiped on container restart
import { jest } from '@jest/globals';

const mockUploadFile = jest.fn();
const mockDocumentCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockReadFile = jest.fn();
const mockUnlink = jest.fn().mockResolvedValue(undefined);
const mockFileTypeFromBuffer = jest.fn();

jest.unstable_mockModule('../config/storage.js', () => ({
  uploadFile: mockUploadFile,
  deleteFile: jest.fn(),
}));

jest.unstable_mockModule('file-type', () => ({
  fileTypeFromBuffer: mockFileTypeFromBuffer,
}));

jest.unstable_mockModule('../models/Document.js', () => ({
  default: { create: mockDocumentCreate },
}));

jest.unstable_mockModule('../models/User.js', () => ({
  default: {},
}));

jest.unstable_mockModule('fs', () => ({
  default: {
    promises: { readFile: mockReadFile, unlink: mockUnlink },
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
  },
  promises: { readFile: mockReadFile, unlink: mockUnlink },
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
}));

// Mock all other models used by receptionController to prevent DB connections
const noop = { findAll: jest.fn(), findOne: jest.fn(), create: jest.fn(), findByPk: jest.fn() };
jest.unstable_mockModule('../models/Child.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/Group.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/TeacherRating.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/GovernmentMessage.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/School.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/Activity.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/Media.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/Meal.js', () => ({ default: noop }));
jest.unstable_mockModule('../models/Progress.js', () => ({ default: noop }));
jest.unstable_mockModule('../config/database.js', () => ({ default: { transaction: jest.fn() } }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const { uploadDocument } = await import('../controllers/receptionController.js');

const mkRes = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

describe('#02-010 reception uploadDocument persists to cloud storage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('calls uploadFile() instead of saving temp disk path', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('pdf-content'));
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });
    mockUploadFile.mockResolvedValue({ url: 'https://appwrite.example/file-id', path: 'file-id' });
    mockDocumentCreate.mockResolvedValue({ id: 'doc-1', filePath: 'https://appwrite.example/file-id' });

    const req = {
      body: { documentType: 'license' },
      file: { path: '/tmp/uchqun-uploads-temp/test.pdf', filename: 'test.pdf', originalname: 'license.pdf', size: 1024, mimetype: 'application/pdf' },
      user: { id: 'user-1', update: mockUserUpdate },
    };
    const res = mkRes();

    await uploadDocument(req, res);

    // Must call cloud storage, not persist the temp path
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.any(Buffer),
      'test.pdf',
      'application/pdf'
    );

    // Document.create must receive the persistent URL, not the temp path
    expect(mockDocumentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ filePath: 'https://appwrite.example/file-id' })
    );
    expect(mockDocumentCreate).not.toHaveBeenCalledWith(
      expect.objectContaining({ filePath: '/tmp/uchqun-uploads-temp/test.pdf' })
    );

    // Temp file must be cleaned up
    expect(mockUnlink).toHaveBeenCalledWith('/tmp/uchqun-uploads-temp/test.pdf');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('rejects file with mismatched magic bytes (BACKEND-006)', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('not-really-a-pdf'));
    mockFileTypeFromBuffer.mockResolvedValue({ mime: 'application/zip', ext: 'zip' });

    const req = {
      body: { documentType: 'license' },
      file: { path: '/tmp/uchqun-uploads-temp/evil.pdf', filename: 'evil.pdf', originalname: 'evil.pdf', size: 512, mimetype: 'application/pdf' },
      user: { id: 'user-1', update: mockUserUpdate },
    };
    const res = mkRes();

    await uploadDocument(req, res);

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects file when fileType detection returns null (BACKEND-006)', async () => {
    mockReadFile.mockResolvedValue(Buffer.from('\x00\x00\x00\x00'));
    mockFileTypeFromBuffer.mockResolvedValue(null);

    const req = {
      body: { documentType: 'passport' },
      file: { path: '/tmp/uchqun-uploads-temp/unknown.bin', filename: 'unknown.bin', originalname: 'unknown.bin', size: 4, mimetype: 'image/jpeg' },
      user: { id: 'user-1', update: mockUserUpdate },
    };
    const res = mkRes();

    await uploadDocument(req, res);

    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
