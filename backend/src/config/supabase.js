const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Inicialización defensiva pero funcional
const supabase = (supabaseUrl && supabaseAnonKey) 
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey)
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('⚠️ ADVERTENCIA: Variables de Supabase incompletas en el entorno.');
}

module.exports = {
    supabase,
    supabaseAdmin
};
