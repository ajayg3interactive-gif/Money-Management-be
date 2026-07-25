const express = require('express');
const router = express.Router();
const { submitFeedback } = require('../controllers/feedback.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { uploadFeedbackImages } = require('../middleware/upload.middleware');

router.post('/', requireAuth, uploadFeedbackImages.array('images', 5), submitFeedback);

module.exports = router;
