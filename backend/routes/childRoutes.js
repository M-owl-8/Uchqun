import express from 'express';
import { getChildren, getChild, updateChild, deleteChild, updateChildAvatar, checkChildAccess } from '../controllers/childController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { updateChildValidator, childIdValidator } from '../validators/childValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { uploadChildPhoto } from '../middleware/uploadChildren.js';

const router = express.Router();

router.use(authenticate);

// GET endpoints
router.get('/', getChildren);
router.get('/:id', childIdValidator, handleValidationErrors, getChild);

// DELETE child endpoint — admin / reception of the same school only
router.delete('/:id',
    requireRole('admin', 'reception', 'government'),
    childIdValidator,
    handleValidationErrors,
    deleteChild
);

// PUT endpoints - tahrirlash uchun
router.put('/:id/avatar', childIdValidator, handleValidationErrors, updateChildAvatar);

// Update child with photo support
router.put(
    '/:id',
    checkChildAccess,
    uploadChildPhoto.single('photo'),
    updateChildValidator,
    handleValidationErrors,
    updateChild
);

export default router;