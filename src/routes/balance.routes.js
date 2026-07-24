const express = require('express');
const router = express.Router();
const { getBalance, saveBalance, getCurrencies, getTotal } = require('../controllers/balance.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/', getBalance);
router.put('/', saveBalance);
router.get('/total', getTotal);
router.get('/currencies', getCurrencies);

module.exports = router;
