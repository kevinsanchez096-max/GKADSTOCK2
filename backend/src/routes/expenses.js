const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware');

// RUTAS PROTEGIDAS DE GESTIÓN DE EGRESOS
router.post('/', authMiddleware, expenseController.createExpense);
router.get('/', authMiddleware, expenseController.getExpenses);

module.exports = router;
