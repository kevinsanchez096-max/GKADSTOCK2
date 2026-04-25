const express = require('express');
const router = express.Router();
const suppliersController = require('../controllers/suppliersController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, suppliersController.getAllSuppliers);
router.post('/', authMiddleware, suppliersController.createSupplier);
router.patch('/:id', authMiddleware, suppliersController.updateSupplier);
router.delete('/:id', authMiddleware, suppliersController.deleteSupplier);

module.exports = router;
