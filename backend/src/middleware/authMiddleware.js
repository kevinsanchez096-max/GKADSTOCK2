const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Middleware para verificar que el usuario esté autenticado mediante JWT
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            console.warn('⚠️ [AUTH] Intento de acceso sin token.');
            return res.status(401).json({ error: 'No autorizado: Falta token de acceso' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No autorizado: Formato de token inválido' });
        }
        
        // A. Verificar sesión en Supabase
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            console.error('🔥 [AUTH] Token inválido o expirado:', authError?.message);
            return res.status(401).json({ error: 'Sesión expirada o token inválido' });
        }

        // --- BYPASS DE RECUPERACIÓN ---
        // Si el usuario está en flujo de recuperación, permitimos el paso con contexto mínimo
        if (user.aud === 'authenticated' && user.recovery_sent_at) {
            req.user = { id: user.id, email: user.email, is_recovery: true };
            return next();
        }

        // B. Obtener Perfil (Auditado con Autoreparación)
        console.log(`[AUTH-DEBUG] Buscando perfil for user.id: ${user.id}`);
        let { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .maybeSingle();

        console.log(`[AUTH-DEBUG] Resultado de profiles:`, { profile, profileError });

        if (profileError) {
            console.error(`🔥 [AUTH] Error DB al recuperar perfil: ${profileError.message}`);
            return res.status(500).json({ error: 'Error de base de datos al validar identidad.' });
        }

        // C. LÓGICA DE AUTO-SANACIÓN: Crear perfil si no existe (Código Rojo de Estabilidad)
        if (!profile) {
            console.warn(`🛠️ [Auto-Healing] Perfil huérfano detectado para ${user.email}. Creando registro base...`);
            
            // 1. Asegurar Organización Maestra "GKAD Admin" (Nivel Dios de Auto-Curación)
            let { data: defaultOrg } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .eq('name', 'GKAD Admin')
                .maybeSingle();

            if (!defaultOrg) {
                const { data: newOrg, error: orgErr } = await supabaseAdmin
                    .from('organizations')
                    .insert([{ name: 'GKAD Admin', is_active: true }])
                    .select('id')
                    .single();
                
                if (!orgErr) defaultOrg = newOrg;
            }

            // 2. Crear el Perfil
            const { data: newProfile, error: createError } = await supabaseAdmin
                .from('profiles')
                .insert([{
                    id: user.id,
                    full_name: user.email.split('@')[0],
                    role: 'admin',
                    organization_id: defaultOrg?.id || null 
                }])
                .select('role, organization_id')
                .single();

            if (createError) {
                console.error(`❌ [Auto-Healing Failed] No se pudo auto-crear perfil:`, createError);
                return res.status(401).json({ error: `No autorizado: Su cuenta no tiene un perfil configurado y la auto-curación falló. Razón: ${createError.message}` });
            }
            profile = newProfile;
        }

        if (!profile.organization_id && profile.role !== 'super_admin') {
            console.warn(`⚠️ [AUTH] Usuario ${user.email} sin organización.`);
            return res.status(403).json({ error: 'Prohibido: Su usuario no pertenece a ninguna empresa activa.' });
        }

        // C. Inyección de Contexto Segura e Inmutable
        req.user = {
            id: user.id,
            email: user.email,
            role: profile.role,
            organization_id: profile.organization_id
        };

        // LOG DE TRAZABILIDAD (CRÍTICO PARA QA)
        console.log(`✅ [SaaS Context] User: ${user.email} | Role: ${profile.role} | Org: ${profile.organization_id || 'SAAS_MASTER'}`);

        return next(); // Único punto de salida exitosa

    } catch (error) {
        console.error('🔥 [AUTH CRITICAL] Fallo interno:', error.message);
        return res.status(500).json({ 
            error: 'Fallo crítico de identidad en el servidor.',
            details: error.message,
            tip: 'Verifique que las variables SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY estén configuradas en el panel de Vercel.'
        });
    }
};

module.exports = authMiddleware;
