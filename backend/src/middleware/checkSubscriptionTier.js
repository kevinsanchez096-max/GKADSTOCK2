const { supabaseAdmin } = require('../config/supabase');

/**
 * Middleware para validar el nivel de suscripción (Tier) de la organización.
 * Bloquea el acceso a rutas/operaciones no permitidas por el plan actual.
 */
const checkSubscriptionTier = (requiredTier) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // El Super Admin tiene acceso total (bypass)
      if (user.role === 'super_admin') {
        return next();
      }

      // Obtener el plan de la organización
      const { data: org, error } = await supabaseAdmin
        .from('organizations')
        .select('plan, billing_status, is_active')
        .eq('id', user.organization_id)
        .single();

      if (error || !org) {
        return res.status(404).json({ error: 'Organización no encontrada' });
      }

      // Validar si la cuenta está activa
      if (!org.is_active || org.billing_status === 'suspendido') {
        return res.status(403).json({ 
          error: 'Suscripción inactiva', 
          message: 'Su acceso ha sido restringido por falta de pago o suspensión administrativa.' 
        });
      }

      // Jerarquía de Planes: Esencial (1) < Avanzado (2) < Emprendedor (3) < Premium (4)
      const tierHierarchy = {
        'Esencial': 1,
        'Avanzado': 2,
        'Emprendedor': 3,
        'Premium': 4
      };

      const userTierScore = tierHierarchy[org.plan] || 0;
      const requiredTierScore = tierHierarchy[requiredTier] || 0;

      if (userTierScore < requiredTierScore) {
        return res.status(403).json({
          error: 'Actualización Requerida',
          message: `El módulo solicitado requiere un plan ${requiredTier} o superior. Su plan actual es: ${org.plan}.`
        });
      }

      next();
    } catch (error) {
      console.error('[SUBSCRIPTION_CHECK] Error:', error);
      res.status(500).json({ error: 'Error al validar nivel de suscripción' });
    }
  };
};

module.exports = checkSubscriptionTier;
