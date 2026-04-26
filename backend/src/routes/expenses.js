const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/authMiddleware');
const checkSubscriptionTier = require('../middleware/checkSubscriptionTier');

// RUTAS PROTEGIDAS DE GESTIÓN DE EGRESOS
router.post('/', authMiddleware, checkSubscriptionTier('Avanzado'), expenseController.createExpense);
router.get('/', authMiddleware, expenseController.getExpenses);

module.exports = router;
