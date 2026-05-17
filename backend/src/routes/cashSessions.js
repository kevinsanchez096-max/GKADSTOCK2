const express = require('express');
const router = express.Router();
const cashSessionController = require('../controllers/cashSessionController');
const authMiddleware = require('../middleware/authMiddleware');

// Definir rutas para el control de sesiones de caja
router.get('/active', authMiddleware, cashSessionController.getActiveSession);
router.post('/open', authMiddleware, cashSessionController.openSession);
router.post('/close', authMiddleware, cashSessionController.closeSession);
router.get('/history', authMiddleware, cashSessionController.getHistory);
router.delete('/:id', authMiddleware, cashSessionController.deleteSession);

module.exports = router;
