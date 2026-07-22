const express = require('express');
const router = express.Router();
const { register, login, logout, me } = require('../controllers/user.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', requireAuth, me);

module.exports = router;
