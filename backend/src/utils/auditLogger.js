const { supabaseAdmin } = require('../config/supabase');

/**
 * Registra un evento de auditoría en la base de datos
 * @param {string} level - Nivel del log (INFO, SEC, MOD, SYS, FIN)
 * @param {string} origin - Origen del evento (e.g. 'AuthAPI', 'SaaSManager')
 * @param {string} event - Nombre del evento (e.g. 'AUTH_SUCCESS', 'ORG_CREATED')
 * @param {object} metadata - Datos adicionales en formato JSON
 */
const logAuditEvent = async (level, origin, event, metadata = {}) => {
  try {
    const { error } = await supabaseAdmin
      .from('system_audit_logs')
      .insert([{
        level,
        origin,
        event,
        metadata
      }]);

    if (error) {
      console.error('[AUDIT] Error inserting log:', error.message);
    }
  } catch (err) {
    console.error('[AUDIT] Critical failure:', err.message);
  }
};

module.exports = { logAuditEvent };
