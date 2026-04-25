const express = require('express');
const router = express.Router();
const customersController = require('../controllers/customersController');
const authMiddleware = require('../middleware/authMiddleware');

// RUTAS PROTEGIDAS (Zero Trust SaaS)
router.get('/', authMiddleware, customersController.getAllCustomers);
router.post('/', authMiddleware, customersController.createCustomer);
router.patch('/:id', authMiddleware, customersController.updateCustomer);
router.delete('/:id', authMiddleware, customersController.deleteCustomer);

module.exports = router;
