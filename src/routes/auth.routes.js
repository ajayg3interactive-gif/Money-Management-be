const express = require('express');
const router = express.Router();
const { register, login, logout, me, updateProfile, uploadAvatar, deleteAvatar } = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { uploadAvatar: uploadAvatarMiddleware } = require('../middleware/upload.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, updateProfile);
router.post('/me/avatar', requireAuth, uploadAvatarMiddleware.single('avatar'), uploadAvatar);
router.delete('/me/avatar', requireAuth, deleteAvatar);

module.exports = router;
