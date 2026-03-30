import express from 'express';
import { getChildren, getChild, updateChild, deleteChild } from '../controllers/childController.js';
import { authenticate, requireParent } from '../middleware/auth.js';
import { updateChildValidator, childIdValidator } from '../validators/childValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { uploadChildPhoto } from '../middleware/uploadChildren.js';

const router = express.Router();

router.use(authenticate);

// GET endpoints
router.get('/', getChildren);
router.get('/:id', childIdValidator, handleValidationErrors, getChild);

// DELETE child endpoint
router.delete('/:id', 
    childIdValidator, 
    handleValidationErrors, 
    deleteChild
);

// PUT endpoints - tahrirlash uchun
router.put(
    '/:id/avatar',
    childIdValidator,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { id } = req.params;
            const { photo } = req.body;
            
            const Child = (await import('../models/Child.js')).default;
            
            // Check if child exists and belongs to parent
            const child = await Child.findOne({
                where: { 
                    id, 
                    parentId: req.user.id 
                }
            });
            
            if (!child) {
                return res.status(404).json({ 
                    error: 'Child not found or you do not have permission' 
                });
            }
            
            // Update only photo field
            await child.update({ 
                photo,
                updatedAt: new Date()
            });
            
            await child.reload();
            
            // Format response
            const childData = child.toJSON();
            childData.age = child.getAge ? child.getAge() : null;
            
            res.json({
                success: true,
                message: 'Avatar updated successfully',
                data: childData
            });
            
        } catch (error) {
            console.error('Update avatar error:', error);
            res.status(500).json({ 
                error: 'Failed to update avatar',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
);

// Update child with photo support (BETTER VERSION)
router.put(
    '/:id',
    // First check child exists
    async (req, res, next) => {
        try {
            const Child = (await import('../models/Child.js')).default;
            const { id } = req.params;
            
            const child = await Child.findOne({
                where: { 
                    id, 
                    parentId: req.user.id 
                }
            });
            
            if (!child) {
                return res.status(404).json({ 
                    error: 'Child not found or you do not have permission' 
                });
            }
            
            req.child = child; // Attach child to request
            next();
        } catch (error) {
            console.error('Child check error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    },
    // Then handle file upload (if multipart/form-data)
    uploadChildPhoto.single('photo'),
    // Then validate
    updateChildValidator,
    handleValidationErrors,
    // Finally update
    updateChild
);

// Test endpoint
router.post('/test-upload', uploadChildPhoto.single('photo'), (req, res) => {
    console.log('=== TEST UPLOAD ===');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    if (req.file) {
        res.json({ 
            success: true, 
            message: 'File received!', 
            file: {
                filename: req.file.filename,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: req.file.path
            }
        });
    } else {
        res.json({ 
            success: false, 
            message: 'No file received',
            body: req.body,
            headers: req.headers
        });
    }
});

export default router;