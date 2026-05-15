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
        if (!supabase) throw new Error('Cliente Supabase no inicializado.');

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Sesión expirada o token inválido' });
        }

        // --- BYPASS DE RECUPERACIÓN (Simplificado) ---
        if (user.recovery_sent_at) {
            req.user = { id: user.id, email: user.email, is_recovery: true };
            return next();
        }

        // B. Obtener Perfil
        if (!supabaseAdmin) throw new Error('Cliente Admin no inicializado. Revise variables de entorno en Vercel.');

        let { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        // Si no hay perfil, inyectamos uno temporal para evitar crash
        if (!profile) {
            profile = { role: 'user', organization_id: null };
        }

        // C. Inyección de Contexto
        req.user = {
            id: user.id,
            email: user.email,
            role: profile.role,
            organization_id: profile.organization_id
        };

        return next();

    } catch (error) {
        console.error('🔥 [AUTH ERROR]:', error.message);
        return res.status(500).json({ 
            error: 'Error de autenticación en el servidor',
            details: error.message 
        });
    }
};

module.exports = authMiddleware;
