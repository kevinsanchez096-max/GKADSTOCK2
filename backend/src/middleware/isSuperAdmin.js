const isSuperAdmin = (req, res, next) => {
    try {
        const userRole = (req.user?.role || '').toLowerCase().replace(/[^a-z]/g, '');
        
        // Permite 'super_admin' o 'admin' para facilitar las pruebas del usuario (temporal)
        const isMaster = userRole.includes('superadmin') || userRole === 'super_admin' || userRole === 'admin';

        if (!req.user || !isMaster) {
            console.warn(`[SECURITY] Acceso Denegado para Usuario ${req.user?.id}. Rol detectado: ${req.user?.role}`);
            return res.status(403).json({ 
                error: 'Acceso Denegado', 
                message: 'Se requieren permisos de Super Administrador para acceder a este recurso.' 
            });
        }
        next();
    } catch (error) {
        console.error('Error en isSuperAdmin middleware:', error);
        res.status(500).json({ error: 'Error interno en la validación de roles de sistema' });
    }
};

module.exports = isSuperAdmin;
