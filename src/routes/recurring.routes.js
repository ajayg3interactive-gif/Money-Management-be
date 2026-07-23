const express = require('express');
const router = express.Router();
const {
  getRules,
  createRule,
  setActive,
  removeRule,
  getOccurrences,
  holdOccurrence,
  unholdOccurrence,
} = require('../controllers/recurring.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/rules', getRules);
router.post('/rules', createRule);
router.patch('/rules/:id/active', setActive);
router.delete('/rules/:id', removeRule);

router.get('/occurrences', getOccurrences);
router.post('/occurrences/hold', holdOccurrence);
router.post('/occurrences/unhold', unholdOccurrence);

module.exports = router;
