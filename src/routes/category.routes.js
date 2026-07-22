const express = require('express');
const router = express.Router();
const { getAll } = require('../controllers/category.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/', getAll);

module.exports = router;
