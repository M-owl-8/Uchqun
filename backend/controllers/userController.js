import User from '../models/User.js';
import { emitToUser } from '../config/socket.js';
import logger from '../utils/logger.js';

export const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, notificationPreferences } = req.body;
    
    // Use the user from the middleware (already authenticated)
    const user = req.user;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update data object
    const updateData = {};
    if (firstName !== undefined && firstName !== null) updateData.firstName = firstName;
    if (lastName !== undefined && lastName !== null) updateData.lastName = lastName;
    if (phone !== undefined && phone !== null) updateData.phone = phone;
    if (notificationPreferences !== undefined && notificationPreferences !== null) {
      updateData.notificationPreferences = notificationPreferences;
    }

    // Validate required fields
    if (updateData.firstName === '' || updateData.lastName === '') {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Update the user
    await user.update(updateData);

    // Reload to get fresh data
    await user.reload();

    const userData = user.toJSON();

    // Emit real-time update to user (for other devices)
    emitToUser(user.id, 'user:updated', {
      user: userData,
      timestamp: new Date().toISOString(),
    });

    res.json(userData);
  } catch (error) {
    logger.error('Update profile error', { error: error.message, stack: error.stack });
    const errorMessage = error.message || 'Failed to update profile';
    res.status(500).json({ error: errorMessage });
  }
};

export const updateAvatar = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: 'Avatar image is required' });
    }
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store avatar as a base64 data URI directly in the DB so it survives
    // Railway container restarts (which wipe ephemeral disk and any uploaded
    // files). Using TEXT column on users.avatar.
    const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const mimetype = req.file.mimetype || '';
    if (!ALLOWED_MIMETYPES.has(mimetype)) {
      return res.status(415).json({ error: 'Unsupported file type. Use JPEG, PNG, WebP, or GIF.' });
    }
    const MAX_BYTES = 1.5 * 1024 * 1024; // ~1.5 MB raw before base64
    if (req.file.buffer.length > MAX_BYTES) {
      return res.status(413).json({
        error: 'Avatar too large',
        message: 'Please pick an image smaller than 1.5 MB.',
      });
    }
    const dataUri = `data:${mimetype};base64,${req.file.buffer.toString('base64')}`;

    await user.update({ avatar: dataUri });
    await user.reload();

    const userData = user.toJSON();

    // Emit real-time update to user (for other devices)
    emitToUser(user.id, 'user:updated', {
      user: userData,
      timestamp: new Date().toISOString(),
    });

    res.json(userData);
  } catch (error) {
    logger.error('Update avatar error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'Failed to update avatar' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and contain uppercase, lowercase, and a digit' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    logger.error('Change password error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to change password' });
  }
};

