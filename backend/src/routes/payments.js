const express = require('express');
const router = express.Router();
const paymentsController = require('../controllers/paymentsController');
const authMiddleware = require('../middleware/authMiddleware');

// RUTAS PÚBLICAS (O no requieren autenticación estricta del usuario/organización)
router.post('/request', paymentsController.createRequest);

// RUTAS PROTEGIDAS (Solo Super Admin)
router.get('/requests', authMiddleware, paymentsController.getRequests);
router.put('/requests/:id', authMiddleware, paymentsController.updateRequestStatus);

module.exports = router;
