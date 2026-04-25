const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');
const isSuperAdmin = require('../middleware/isSuperAdmin');

// RUTAS PROTEGIDAS PARA GESTIÓN DE PERSONAL
// Lectura: Administradores y Súper Admins
// Escritura: SOLO Súper Administrador (RBAC Estricto)

// 1. Obtener usuarios (GET /api/users) — Lectura permitida a admins
router.get('/', authMiddleware, usersController.getUsers);

// 2. Crear usuario (POST /api/users) — SOLO super_admin
router.post('/', authMiddleware, isSuperAdmin, usersController.createUser);

// 3. Eliminar usuario (DELETE /api/users/:userId) — SOLO super_admin
router.delete('/:userId', authMiddleware, isSuperAdmin, usersController.deleteUser);

module.exports = router;
