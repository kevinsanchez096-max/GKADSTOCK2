/**
 * @module superHardenedMiddleware
 * @description BLINDAJE DE SEGURIDAD NIVEL 1: PATRÓN DE LA LLAVE DORADA
 * 
 * Este middleware proporciona una capa de seguridad inquebrantable para endpoints
 * de infraestructura crítica (como la creación de otros Super Admins).
 * 
 * Solo permite el acceso si el ID del usuario autenticado coincide con la
 * variable de entorno INITIAL_SUPER_ADMIN_ID.
 */

const superHardenedMiddleware = (req, res, next) => {
  try {
    const initialAdminId = process.env.INITIAL_SUPER_ADMIN_ID;

    if (!initialAdminId) {
      console.error('❌ SEÑAL DE ALERTA: INITIAL_SUPER_ADMIN_ID no configurada en el .env');
      return res.status(500).json({ 
        error: 'Error de Configuración de Seguridad', 
        message: 'El sistema de blindaje no está configurado correctamente.' 
      });
    }

    if (!req.user || req.user.id !== initialAdminId) {
      console.warn(`🛑 INTENTO DE ACCESO NO AUTORIZADO A INFRAESTRUCTURA: User ${req.user?.id || 'Anónimo'}`);
      return res.status(403).json({ 
        error: 'Acceso Denegado (Llave Dorada Requerida)', 
        message: 'No tienes permisos de infraestructura para realizar esta acción. Solo el Administrador Inicial puede ejecutar este comando.' 
      });
    }

    console.log('🔑 Blindaje superado: Acceso concedido al Administrador Inicial.');
    next();
  } catch (error) {
    console.error('Error en superHardenedMiddleware:', error);
    res.status(500).json({ error: 'Error interno en el escudo de seguridad' });
  }
};

module.exports = superHardenedMiddleware;
