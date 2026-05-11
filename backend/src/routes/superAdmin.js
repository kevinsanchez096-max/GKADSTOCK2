const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const authMiddleware = require('../middleware/authMiddleware');
const isSuperAdmin = require('../middleware/isSuperAdmin');
const superHardenedMiddleware = require('../middleware/superHardenedMiddleware');

// Todas las rutas de Super Admin requieren JWT y rol 'super_admin'
router.use(authMiddleware);
router.use(isSuperAdmin);

/**
 * RUTAS DE GESTIÓN SAAS
 */

// 1. Listar todas las organizaciones con sus métricas (/api/saas/organizations)
router.get('/organizations', superAdminController.getAllOrganizations);

// 2. Activar/Suspender una organización (/api/saas/organizations/:orgId/status)
router.patch('/organizations/:orgId/status', superAdminController.toggleOrganizationStatus);

// 3. Obtener métricas globales de la plataforma (/api/saas/stats)
router.get('/stats', superAdminController.getGlobalStats);

// 4. Auditoría Global de Usuarios (/api/saas/users)
router.get('/users', superAdminController.getAllUsers);

// 5. Salud del Sistema (/api/saas/health)
router.get('/health', superAdminController.getSystemHealth);

// 6. Obtener usuarios de una organización específica (/api/saas/organizations/:orgId/users)
router.get('/organizations/:orgId/users', superAdminController.getOrgUsers);

// 7. Visor de Logs técnicos (/api/saas/logs)
router.get('/logs', superAdminController.getSystemLogs);

// 7. Auditoría Jerárquica Trazable (/api/saas/audit/user-creation-trace)
router.get('/audit/user-creation-trace', superAdminController.getUserCreationTrace);

// 8. Crear Super Admin (BLINDADO - REQUIERE LLAVE DORADA)
router.post('/super-admins', superHardenedMiddleware, superAdminController.createSuperAdmin);

// 9. Administrar Organizaciones (Creación y Edición)
router.post('/organizations', superAdminController.createOrganization);
router.patch('/organizations/:orgId', superAdminController.updateOrganization);
router.get('/pulse-stats', superAdminController.getPulseStats);
router.delete('/organizations/:orgId', superAdminController.deleteOrganization);
router.post('/organizations/:orgId/users', superAdminController.injectUser);

// 10. Gestión Directa de Usuarios (Modo Dios)
router.patch('/users/:userId', superAdminController.updateUser);
router.delete('/users/:userId', superAdminController.deleteUser);
router.post('/users/:userId/reset-password', superAdminController.resetUserPassword);
module.exports = router;
