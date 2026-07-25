const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, register, login, logout, me, updateProfile, uploadAvatar, deleteAvatar, markTourSeen } = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { uploadAvatar: uploadAvatarMiddleware } = require('../middleware/upload.middleware');

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);
router.put('/me', requireAuth, updateProfile);
router.post('/me/avatar', requireAuth, uploadAvatarMiddleware.single('avatar'), uploadAvatar);
router.delete('/me/avatar', requireAuth, deleteAvatar);
router.patch('/me/tour', requireAuth, markTourSeen);

module.exports = router;
