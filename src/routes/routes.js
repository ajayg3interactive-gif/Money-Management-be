const express = require('express');
const router = express.Router();
const {getAll,create,update,remove} =require('../controllers/transaction.controller');
const { getColumns } = require('../controllers/columns.controller');

// Transaction
router.get('/', getAll);
router.get('/transaction', getAll);
router.post('/transaction', create);
router.put('/transaction/:id', update);
router.delete('/transaction/:id', remove);

// Columns 
router.get('/columns', getColumns);

module.exports = router;