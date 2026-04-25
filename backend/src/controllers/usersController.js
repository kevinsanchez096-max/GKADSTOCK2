const { supabaseAdmin } = require('../config/supabase');

const usersController = {
    // Helper para obtener el ID de organización con validación estricta
    getOrgId: (req) => {
        const user = req.user;
        if (!user) throw new Error('Usuario no autenticado');

        if (user.role === 'super_admin') {
            const explicitId = req.query.organization_id || req.body.organization_id;
            if (explicitId) return explicitId;
            return user.organization_id;
        }

        if (!user.organization_id) {
            throw new Error('Su usuario no tiene una organización vinculada.');
        }
        return user.organization_id;
    },

    // 1. Listar usuarios (FILTRADO)
    getUsers: async (req, res) => {
        try {
            const orgId = usersController.getOrgId(req);
            
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select(`
                    id,
                    full_name,
                    role,
                    status,
                    created_at,
                    organization_id,
                    created_by,
                    organizations (name),
                    creator:profiles!created_by (full_name)
                `)
                .eq('organization_id', orgId) // Filtro crítico
                .order('created_at', { ascending: false });

            if (profileError) throw profileError;

            const consolidatedUsers = profiles.map(profile => ({
                id: profile.id,
                full_name: profile.full_name,
                email: 'gestion@gkad.com', 
                role: profile.role,
                status: profile.status,
                created_at: profile.created_at,
                organization_id: profile.organization_id,
                organization_name: profile.organizations?.name || 'Sistema',
                creator_name: profile.creator?.full_name || 'Sistema'
            }));

            res.status(200).json(consolidatedUsers);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // 2. Crear Nuevo Usuario (INSERCIÓN INMUTABLE + RBAC)
    createUser: async (req, res) => {
        let createdAuthUserId = null;
        try {
            // ── RBAC ESTRICTO: Solo el super_admin puede crear usuarios ──
            if (req.user.role !== 'super_admin') {
                console.warn(`🚫 [RBAC] Usuario ${req.user.email} (rol: ${req.user.role}) intentó crear un usuario. BLOQUEADO.`);
                return res.status(403).json({ error: 'Acceso denegado: Solo el Súper Administrador puede crear usuarios.' });
            }

            const { email, password, fullName, role: newRole } = req.body;
            const orgId = usersController.getOrgId(req);
            const creatorId = req.user.id;
            const creatorRole = req.user.role;

            if (!email || !password || !fullName || !newRole) {
                return res.status(400).json({ error: 'Faltan campos obligatorios' });
            }

            // Permisos de jerarquía
            if (creatorRole !== 'super_admin' && newRole === 'super_admin') {
                return res.status(403).json({ error: 'No tienes permisos para crear Súper Administradores' });
            }

            // 1. Crear en Supabase Auth (Service Role)
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: fullName }
            });

            if (authError) {
                console.error('❌ [AUTH ERROR] Registro fallido:', authError.message);
                throw authError;
            }

            createdAuthUserId = authData.user.id;
            console.log(`✅ [AUTH SUCCESS] Usuario creado en Auth: ${createdAuthUserId}`);

            // 2. Crear Perfil (Usando Service Role para Bypas de RLS)
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: createdAuthUserId,
                    full_name: fullName,
                    organization_id: orgId,
                    role: newRole,
                    created_by: creatorId 
                }]);

            if (profileError) {
                console.error('❌ [DB ERROR] Fallo al insertar perfil:', profileError.message);
                
                // ROLLBACK ATÓMICO: Borrar de Auth si el perfil falla
                console.warn(`[ROLLBACK] Eliminando usuario Auth huérfano: ${createdAuthUserId}`);
                await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
                
                throw new Error(`Error de Base de Datos (RLS/Integridad): ${profileError.message}`);
            }

            console.log(`✅ [VINCULACIÓN OK] Colaborador registrado y vinculado a la Org: ${orgId}`);

            res.status(201).json({ 
                message: 'Colaborador registrado con éxito', 
                user: { id: createdAuthUserId, email, fullName, role: newRole } 
            });

        } catch (error) {
            console.error('🔥 [FATAL CREATE USER ERROR]:', error.message);
            res.status(500).json({ error: error.message || 'Error sistémico en el registro de colaboradores.' });
        }
    },

    // 3. Eliminar Usuario (FILTRADO Y VERIFICADO)
    deleteUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const orgId = usersController.getOrgId(req);
            const creatorRole = req.user.role;

            // 1. Verificar pertenencia del objetivo
            const { data: targetProfile, error: fetchError } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', userId)
                .single();

            if (fetchError || !targetProfile) return res.status(404).json({ error: 'Usuario no encontrado.' });

            if (creatorRole !== 'super_admin' && targetProfile.organization_id !== orgId) {
                return res.status(403).json({ error: 'No tienes permiso para borrar este usuario (Violación de Inquilino).' });
            }

            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError) throw authError;

            res.status(200).json({ message: 'Usuario purgado correctamente.' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = usersController;
