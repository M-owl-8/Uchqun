import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getResources, createResource, deleteResource } from '../controllers/teacherResourceController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getResources);
router.post('/', requireRole('teacher', 'admin'), createResource);
router.delete('/:id', requireRole('teacher', 'admin'), deleteResource);

export default router;
