const express = require('express');
const router = express.Router();
const salesController = require('../controllers/salesController');
const authMiddleware = require('../middleware/authMiddleware');

// 1. Procesar venta (POST /api/sales/process)
router.post('/process', authMiddleware, salesController.processNewSale);

// 2. Historial de ventas (GET /api/sales/history)
router.get('/history', authMiddleware, salesController.getSalesHistory);

// 3. Cierre de caja (GET /api/sales/closing)
router.get('/closing', authMiddleware, salesController.getDailyClosing);

// 4. Detalle de venta (GET /api/sales/:saleId)
router.get('/:saleId', authMiddleware, salesController.getSaleDetail);

// 5. Procesar Devolución (POST /api/sales/:saleId/return)
router.post('/:saleId/return', authMiddleware, salesController.processSaleReturn);

module.exports = router;
