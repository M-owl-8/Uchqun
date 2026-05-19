import express from 'express';
import { authenticate, requireTeacher, requireAdmin } from '../middleware/auth.js';
import { createAttendance, listAttendance, updateAttendance, deleteAttendance } from '../controllers/attendanceController.js';

const router = express.Router();

router.use(authenticate);

router.post('/', requireTeacher, createAttendance);
router.get('/', requireTeacher, listAttendance);
router.patch('/:id', requireTeacher, updateAttendance);
router.delete('/:id', requireAdmin, deleteAttendance);

export default router;
