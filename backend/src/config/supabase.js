const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('❌ ERROR CRÍTICO: Faltan variables SUPABASE en el .env');
}

/**
 * CLIENTE ESTÁNDAR (Sujeto a RLS)
 * Se usa para operaciones que deben respetar la identidad del usuario logueado.
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

/**
 * CLIENTE ADMINISTRATIVO (Bypass RLS habilitado)
 * Se usa para el Panel SaaS, Auditoría Global y Provisión de Inquilinos.
 */
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
});

console.log('✅ Infraestructura de Datos Consolidada (Modo Dual: Public/Admin)');

module.exports = {
    supabase,
    supabaseAdmin
};
