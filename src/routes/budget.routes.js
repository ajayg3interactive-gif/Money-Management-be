const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/budget.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.use(requireAuth);

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);

module.exports = router;
