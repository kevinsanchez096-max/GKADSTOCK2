const { supabaseAdmin } = require('../config/supabase');

/**
 * Envía una notificación al panel de administración global
 * @param {string} type - Tipo de notificación (NEW_USER, ORG_STATUS, HIGH_VALUE_SALE, SYSTEM_ERROR, PLAN_LIMIT)
 * @param {string} title - Título corto
 * @param {string} message - Descripción detallada
 * @param {object} metadata - Datos adicionales
 */
const sendSystemNotification = async (type, title, message, metadata = {}) => {
  try {
    const { error } = await supabaseAdmin
      .from('system_logs')
      .insert([{
        level: 'error',
        module: 'NOTIFICATION_SERVICE',
        message: `[${type}] ${title}: ${message} | Metadata: ${JSON.stringify(metadata)}`
      }]);

    if (error) {
      console.error('[NOTIFY] Error sending notification:', error.message);
    }
  } catch (err) {
    console.error('[NOTIFY] Critical failure:', err.message);
  }
};

module.exports = { sendSystemNotification };
