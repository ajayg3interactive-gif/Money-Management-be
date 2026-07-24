const express = require('express');
const router = express.Router();
const { getSummary } = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/summary', getSummary);

module.exports = router;
