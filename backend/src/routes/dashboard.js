const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// RUTAS PROTEGIDAS (Zero Trust SaaS)
router.get('/stats', authMiddleware, dashboardController.getKPIs);
router.get('/ranking', authMiddleware, dashboardController.getBestsellers);

module.exports = router;
