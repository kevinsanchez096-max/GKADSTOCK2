const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const authMiddleware = require('../middleware/authMiddleware');
// RUTAS PROTEGIDAS (Zero Trust SaaS)
router.get('/', authMiddleware, inventoryController.getAllProducts);
router.get('/products', authMiddleware, inventoryController.getAllProducts); // Compatibilidad
router.get('/categories', authMiddleware, inventoryController.getCategories);
router.get('/low-stock', authMiddleware, inventoryController.getLowStockAlerts);
router.get('/movements', authMiddleware, inventoryController.getInventoryMovements);
router.post('/', authMiddleware, inventoryController.createProduct);
router.post('/products', authMiddleware, inventoryController.createProduct); // Compatibilidad
router.post('/categories', authMiddleware, inventoryController.createCategory);
router.patch('/categories/:id', authMiddleware, inventoryController.updateCategory);
router.delete('/categories/:id', authMiddleware, inventoryController.deleteCategory);
router.patch('/:id', authMiddleware, inventoryController.updateProduct);
router.delete('/:id', authMiddleware, inventoryController.deleteProduct);

module.exports = router;
