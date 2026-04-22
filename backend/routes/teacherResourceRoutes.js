import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getResources, createResource, deleteResource } from '../controllers/teacherResourceController.js';

const router = express.Router();
router.use(authenticate);

// Video file upload — accepts mp4/mov/webm up to 100MB.
const resourceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `resource-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const resourceUpload = multer({
  storage: resourceStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video, audio, or image files allowed'), false);
    }
  },
});

router.get('/', getResources);
router.post('/', requireRole('teacher', 'admin'), resourceUpload.single('file'), createResource);
router.delete('/:id', requireRole('teacher', 'admin'), deleteResource);

export default router;
