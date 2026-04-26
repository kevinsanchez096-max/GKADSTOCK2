const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const authMiddleware = require('../middleware/authMiddleware');

// 1. Iniciar Sesión (POST /api/auth/login)
router.post('/login', authController.login);

// 2. Registrar (POST /api/auth/register)
router.post('/register', authController.register);

// 3. Cerrar Sesión (POST /api/auth/logout)
router.post('/logout', authController.logout);

// 4. Obtener Sesión Actual (GET /api/auth/me) - PROTEGIDA
router.get('/me', authMiddleware, authController.getMe);

// [MODO AD] Cambio Forzado de Contraseña (POST /api/auth/force-change-password)
router.post('/force-change-password', authController.forceChangePassword);

// 4a. Obtener Perfil Propio por Token (GET /api/auth/profile) - PROTEGIDA
//     El frontend llama esta URL con el JWT para restaurar la sesión.
router.get('/profile', authMiddleware, authController.getMe);

// 4b. Obtener Perfil por ID Externo (GET /api/auth/profile/:userId) - Legado
router.get('/profile/:userId', authController.getProfile);

// 5. Mis Logs (GET /api/auth/my-logs) - PROTEGIDA
router.get('/my-logs', authMiddleware, authController.getMyLogs);

// 6. Cambiar Contraseña (POST /api/auth/change-password) - PROTEGIDA
router.post('/change-password', authMiddleware, authController.changePassword);

// 7. Actualizar Perfil (PATCH /api/auth/profile) - PROTEGIDA
router.patch('/profile', authMiddleware, authController.updateProfile);

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// 8. [SECURITY] Actualización Segura de Perfil (POST /api/auth/profile/update-secure)
router.post('/profile/update-secure', authMiddleware, authController.updateSecureProfile);

// 9. [STORAGE] Subir Logo vía Backend (POST /api/auth/upload-logo)
router.post('/upload-logo', authMiddleware, upload.single('logo'), authController.uploadLogo);

// 10. Activar Organización (POST /api/auth/activate) - PROTEGIDA
router.post('/activate', authMiddleware, authController.activate);

module.exports = router;
