import multer from 'multer';

const storage = multer.memoryStorage();

const csvFilter = (req, file, cb) => {
  const ok = file.originalname.toLowerCase().endsWith('.csv') ||
    ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain'].includes(file.mimetype);
  if (ok) {
    cb(null, true);
  } else {
    cb(null, false);
    req._importFileRejected = true;
  }
};

export const uploadImportCsv = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: csvFilter,
});

export const handleImportUploadError = (err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, error: { code: 'IMPORT_FILE_TOO_LARGE' } });
  }
  next(err);
};
