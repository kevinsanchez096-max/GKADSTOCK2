const { supabase, supabaseAdmin } = require('../config/supabase');

/**
 * Middleware de autenticación con auto-curación de perfiles.
 * Verifica JWT, obtiene perfil y vincula organización automáticamente si falta.
 */
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
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

        // B. Obtener Perfil
        if (!supabaseAdmin) throw new Error('Cliente Admin no inicializado. Revise variables de entorno en Vercel.');

        let { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) throw profileError;

        // C. Auto-curación: Si no hay perfil o no tiene organización, intentar vincular
        if (!profile || !profile.organization_id) {
            const { data: org } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .eq('admin_email', user.email)
                .maybeSingle();

            if (org) {
                // Vincular automáticamente el perfil con la organización encontrada
                await supabaseAdmin
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        organization_id: org.id,
                        role: profile?.role || 'admin',
                        updated_at: new Date().toISOString()
                    });

                req.user = {
                    id: user.id,
                    email: user.email,
                    role: profile?.role || 'admin',
                    organization_id: org.id
                };
                console.log('🔧 [AUTH] Auto-curación: Perfil vinculado a organización', org.id);
                return next();
            }

            // Sin organización encontrada — error controlado
            return res.status(500).json({
                error: 'Su usuario no tiene una organización vinculada. Contacte soporte.'
            });
        }

        // D. Inyección de Contexto (flujo normal)
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
