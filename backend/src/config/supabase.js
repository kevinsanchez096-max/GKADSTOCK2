const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('❌ ERROR CRÍTICO: Faltan variables SUPABASE en el entorno.');
    console.error('🔍 Detalle:');
    if (!supabaseUrl) console.error('- Falta SUPABASE_URL');
    if (!supabaseAnonKey) console.error('- Falta SUPABASE_ANON_KEY');
    if (!supabaseServiceRoleKey) console.error('- Falta SUPABASE_SERVICE_ROLE_KEY');
    console.warn('⚠️ El servidor se iniciará pero las llamadas a la base de datos fallarán hasta que se configuren las variables.');
}

/**
 * CLIENTE ESTÁNDAR (Sujeto a RLS)
 */
const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
    : { auth: { getUser: () => Promise.resolve({ data: { user: null }, error: new Error('SUPABASE_URL o ANON_KEY no configurados') }) } };

/**
 * CLIENTE ADMINISTRATIVO (Bypass RLS habilitado)
 */
const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
    })
    : { 
        auth: { getUser: () => Promise.resolve({ data: { user: null }, error: new Error('SUPABASE_URL o SERVICE_ROLE_KEY no configurados') }) },
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: new Error('Cliente Admin no inicializado') }) }) }) })
    };

if (!process.env.SUPABASE_URL) console.error('🔥 CRÍTICO: Falta SUPABASE_URL');
if (!process.env.SUPABASE_ANON_KEY) console.error('🔥 CRÍTICO: Falta SUPABASE_ANON_KEY');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.error('🔥 CRÍTICO: Falta SUPABASE_SERVICE_ROLE_KEY');

console.log('✅ Infraestructura de Datos Consolidada (Modo Dual: Public/Admin)');

module.exports = {
    supabase,
    supabaseAdmin
};
