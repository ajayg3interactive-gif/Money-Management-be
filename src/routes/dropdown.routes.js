const express = require('express');
const router = express.Router();
const { getByType } = require('../controllers/dropdown.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/:type', getByType);

module.exports = router;
