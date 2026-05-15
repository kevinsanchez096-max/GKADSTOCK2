const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('❌ ERROR CRÍTICO: Faltan variables SUPABASE en el entorno.');
    console.warn('⚠️ El servidor se iniciará pero las llamadas a la base de datos fallarán hasta que se configuren las variables.');
}

/**
 * CLIENTE ESTÁNDAR (Sujeto a RLS)
 */
const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
    : null;

/**
 * CLIENTE ADMINISTRATIVO (Bypass RLS habilitado)
 */
const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
    : null;

if (!supabase || !supabaseAdmin) {
    console.error('🔥 No se pudieron inicializar los clientes de Supabase.');
}

console.log('✅ Infraestructura de Datos Consolidada (Modo Dual: Public/Admin)');

module.exports = {
    supabase,
    supabaseAdmin
};
