const { supabaseAdmin } = require('../config/supabase');

/**
 * Función auxiliar para traducir errores técnicos de Supabase/Postgres a Español
 */
const translateError = (error) => {
    const msg = error.message || String(error);
    
    // Traducciones de errores comunes
    if (msg.includes('Invalid API key')) return 'Error de conexión: Llave de API inválida.';
    if (msg.includes('could not find the table')) return 'Error: Faltan tablas en la base de datos (Ejecuta el script SQL).';
    if (msg.includes('Email address "pueba@gmail.com" is invalid')) return 'El formato del correo electrónico es inválido.';
    if (msg.includes('User already registered')) return 'Este correo ya está registrado.';
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('email rate limit exceeded')) return 'Has intentado registrarte demasiadas veces. Por favor, espera unos minutos.';
    if (msg.includes('violates row-level security policy')) return 'Error de permisos: El servidor no puede crear la organización. (Revisar SERVICE_ROLE_KEY).';
    if (msg.includes('Cannot coerce the result')) return 'Error de integridad: El perfil de usuario no se pudo recuperar correctamente.';
    if (msg.includes('Database error')) return 'Error en la base de datos. Verifica la conexión.';
    
    return msg;
};

const authController = {
    // ══════════════════════════════════════════════════════════════════
    // 1. LOGIN STATELESS (Backend como Proxy de Validación)
    // El signInWithPassword ahora se ejecuta EXCLUSIVAMENTE en el Frontend.
    // Este endpoint es un LEGACY FALLBACK que valida credenciales sin mutar
    // el estado del cliente singleton de Node.js.
    // ══════════════════════════════════════════════════════════════════
    login: async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email y contraseña son requeridos' });
            }

            // ── VALIDACIÓN STATELESS: Usamos un cliente efímero para verificar
            // las credenciales SIN mutar el estado del cliente singleton del servidor. ──
            const { createClient } = require('@supabase/supabase-js');
            const tempClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false }
            });
            const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({ email, password });
            if (authError) throw authError;

            // B. Recuperación de Perfil (con supabaseAdmin — Bypass RLS puro)
            let { data: profileData, error: profileError } = await supabaseAdmin
                .from('profiles')
                .select('*, organizations(*)')
                .eq('id', authData.user.id)
                .maybeSingle();

            if (profileError) throw profileError;

            // C. LÓGICA DE AUTOREPARACIÓN (Si no hay perfil pero el usuario existe en Auth)
            if (!profileData) {
                console.log(`🛠️ Detectado perfil huérfano. Iniciando autoreparación administrativa para: ${email}`);

                let { data: orgData, error: orgError } = await supabaseAdmin
                    .from('organizations')
                    .select('*')
                    .eq('name', 'GKAD Admin')
                    .maybeSingle();

                if (!orgData) {
                    const { data: newOrg, error: createOrgErr } = await supabaseAdmin
                        .from('organizations')
                        .insert([{ name: 'GKAD Admin', is_active: true }])
                        .select()
                        .single();
                    if (createOrgErr) throw createOrgErr;
                    orgData = newOrg;
                }

                const isOwner = email.toLowerCase() === 'kevinsantiagosanchez801@gmail.com';
                const role = isOwner ? 'super_admin' : 'admin';
                const fullName = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ');

                const { error: createProfileErr } = await supabaseAdmin
                    .from('profiles')
                    .insert([{
                        id: authData.user.id,
                        full_name: fullName.charAt(0).toUpperCase() + fullName.slice(1),
                        organization_id: orgData.id,
                        role: role
                    }]);

                if (createProfileErr) throw createProfileErr;

                const { data: repairedProfile, error: fetchErr } = await supabaseAdmin
                    .from('profiles')
                    .select('*, organizations(*)')
                    .eq('id', authData.user.id)
                    .single();
                
                if (fetchErr) throw fetchErr;
                profileData = repairedProfile;
            }

            // D. Normalización de la organización
            const organization = Array.isArray(profileData.organizations) 
                ? profileData.organizations[0] 
                : profileData.organizations;

            // E. VALIDACIÓN DE BLOQUEO (SaaS Control & Billing)
            // ── STATELESS: NO llamamos supabase.auth.signOut() ──
            if (organization && (organization.is_active === false || organization.billing_status === 'suspendido')) {
                const blockReason = organization.billing_status === 'suspendido' 
                    ? 'La licencia de su organización se encuentra suspendida por falta de pago.'
                    : 'Su organización ha sido suspendida administrativamente.';

                return res.status(403).json({ 
                    error: 'Acceso Denegado', 
                    message: blockReason 
                });
            }

            // F. Respuesta (Modo AD: Cambio Obligatorio)
            if (profileData.require_password_change) {
                return res.status(200).json({ 
                    requirePasswordChange: true, 
                    user: authData.user,
                    message: 'Cambio de contraseña obligatorio requerido.' 
                });
            }

            const finalProfile = { ...profileData, organizations: organization };
            res.status(200).json({ user: authData.user, session: authData.session, profile: finalProfile });

        } catch (error) {
            console.error('Login Blindado Error:', error.message);
            res.status(401).json({ error: translateError(error) });
        }
    },

    // 2. [MODO AD] Cambio Obligatorio de Contraseña (User Level)
    forceChangePassword: async (req, res) => {
        try {
            const { userId, newPassword } = req.body;

            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }

            // A. Cambiar contraseña en Auth (Bypass RLS)
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, { 
                password: newPassword 
            });

            if (authError) throw authError;

            // B. Desactivar Flag de Cambio Obligatorio
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update({ require_password_change: false })
                .eq('id', userId);

            if (profileError) throw profileError;

            res.status(200).json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
        } catch (error) {
            console.error('Error en forceChangePassword:', error);
            res.status(500).json({ error: 'Error al actualizar la contraseña obligatoria.' });
        }
    },

    // 3. Obtener Sesión Actual (Me)
    getMe: async (req, res) => {
        try {
            const userId = req.user.id;
            const { data: profile, error } = await supabaseAdmin
                .from('profiles')
                .select('*, organizations(*)')
                .eq('id', userId)
                .maybeSingle();

            if (error) throw error;
            if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

            const organization = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations;
            res.status(200).json({ ...profile, organizations: organization });
        } catch (error) {
            res.status(500).json({ error: translateError(error) });
        }
    },

    // 4. Obtener Perfil (Refactorizado)
    getProfile: async (req, res) => {
        try {
            const { userId } = req.params;
            const { data: profile, error } = await supabaseAdmin
                .from('profiles')
                .select('*, organizations(*)')
                .eq('id', userId)
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            if (!profile) return res.status(404).json({ error: 'Perfil no encontrado' });

            const organization = Array.isArray(profile.organizations) ? profile.organizations[0] : profile.organizations;
            res.status(200).json({ ...profile, organizations: organization });
        } catch (error) {
            res.status(500).json({ error: translateError(error) });
        }
    },

    // 3. Cerrar Sesión (STATELESS — El frontend cierra su propia sesión)
    logout: async (req, res) => {
        try {
            // ── STATELESS: No mutamos el cliente singleton del servidor. ──
            // El cierre de sesión real ocurre en el frontend (supabase.auth.signOut()).
            // Este endpoint es un acknowledgment para el cliente.
            console.log(`🔓 [LOGOUT] Sesión cerrada para usuario (gestionado por el frontend).`);
            res.status(200).json({ status: 'Success', message: 'Sesión cerrada correctamente' });
        } catch (error) {
            res.status(500).json({ error: translateError(error) });
        }
    },

    // 4. Registro (Blindado, Resiliente y Transparente)
    register: async (req, res) => {
        try {
            const { email, password, fullName, orgName, createdBy } = req.body;
            if (!email || !password || !fullName || !orgName) {
                return res.status(400).json({ error: 'Todos los campos son obligatorios' });
            }

            console.log(`🚀 Iniciando registro resiliente para: ${email}`);

            // --- Lógica de Poder: Validación de Límites por Plan ---
            if (createdBy) { // Si lo está creando otro usuario (Admin), validar límites
                const { data: orgData } = await supabaseAdmin
                    .from('organizations')
                    .select('plan')
                    .eq('name', orgName)
                    .single();

                if (orgData) {
                    const { count: userCount } = await supabaseAdmin
                        .from('profiles')
                        .select('*', { count: 'exact', head: true })
                        .eq('organization_id', (await supabaseAdmin.from('organizations').select('id').eq('name', orgName).single()).data?.id);

                    const limits = { 'Esencial': 1, 'Avanzado': 3, 'Emprendedor': 25 };
                    if (limits[orgData.plan] && userCount >= limits[orgData.plan]) {
                        return res.status(403).json({ 
                            error: `Límite de usuarios alcanzado para el Plan ${orgData.plan}.`,
                            message: `Su plan actual permite máximo ${limits[orgData.plan]} usuario(s).` 
                        });
                    }
                }
            }

            // ---------------------------------------------------------
            // FASE A: Autenticación (Service Role — STATELESS, sin mutar el singleton)
            // ---------------------------------------------------------
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({ 
                email, 
                password,
                email_confirm: true,
                user_metadata: { full_name: fullName }
            });

            if (authError) {
                console.error('❌ Error en Auth:', authError.message);
                throw authError;
            }

            console.log('✅ Usuario creado en Auth. Pasando a fase de persistencia...');

            // ---------------------------------------------------------
            // FASE B: Administración Dinámica (Usando shared supabaseAdmin)
            // ---------------------------------------------------------
            
            // B. Crear Organización (Resiliente a duplicidad)
            let orgId;
            const { data: orgData, error: orgError } = await supabaseAdmin
                .from('organizations')
                .insert([{ name: orgName, is_active: true }])
                .select()
                .single();

            if (orgError) {
                if (orgError.code === '23505') {
                    console.warn('⚠️ La organización ya existe. Recuperando registro...');
                    const { data: existingOrg } = await supabaseAdmin
                        .from('organizations')
                        .select('id')
                        .eq('name', orgName)
                        .maybeSingle();
                    orgId = existingOrg?.id;
                } else {
                    console.error('❌ Error Administrativo (Organizations):', orgError.message);
                    // REGISTRO ATÓMICO: Si falla la creación de la infraestructura, eliminamos el usuario de Auth
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    return res.status(500).json({ error: 'Fallo al crear organización. Registro abortado por seguridad.' });
                }
            } else {
                orgId = orgData.id;
            }

            if (!orgId) {
                await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                return res.status(500).json({ error: 'Fallo al obtener ID de organización.' });
            }

            console.log(`✅ Organización confirmada (ID: ${orgId}). Creando perfil...`);

            // C. Crear Perfil (Tolerante a Triggers automáticos)
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([{
                    id: authData.user.id,
                    full_name: fullName,
                    organization_id: orgId,
                    role: 'admin',
                    created_by: createdBy || null
                }]);

            if (profileError) {
                if (profileError.code === '23505') {
                    console.warn('ℹ️ El perfil ya fue creado por un proceso externo (Trigger). Continuando...');
                } else {
                    console.error('❌ Error Administrativo (Profiles):', profileError.message);
                    // REGISTRO ATÓMICO: Si falla el perfil, eliminamos el usuario de Auth para evitar huérfanos
                    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
                    return res.status(500).json({ error: 'Fallo al crear perfil de usuario. Registro abortado.' });
                }
            }

            console.log('✨ Registro completado bajo autoridad administrativa resiliente.');
            res.status(201).json({ 
                message: 'Registro exitoso. Bienvenido a GKAD STOCK.', 
                user: authData.user, 
                organization_id: orgId 
            });

        } catch (error) {
            console.error('🔥 FALLO TÉCNICO EN REGISTRO:', error.message);
            res.status(500).json({ 
                error: error.message || 'Error técnico crítico durante el registro',
                details: error
            });
        }
    },

    // 5. Obtener Logs Propios del Usuario
    getMyLogs: async (req, res) => {
        try {
            const { data, error } = await supabaseAdmin
                .from('system_logs')
                .select('*')
                .eq('user_id', req.user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            res.status(200).json(data || []);
        } catch (error) {
            console.error('Error en getMyLogs:', error);
            res.status(500).json({ error: 'No se pudieron recuperar sus registros de actividad.' });
        }
    },

    // 6. Cambiar Contraseña (Seguro)
    changePassword: async (req, res) => {
        try {
            const { newPassword } = req.body;
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }

            const { error } = await supabaseAdmin.auth.admin.updateUserById(
                req.user.id,
                { password: newPassword }
            );

            if (error) throw error;
            res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
        } catch (error) {
            console.error('Error en changePassword:', error);
            res.status(500).json({ error: 'Fallo al actualizar la contraseña del sistema.' });
        }
    },

    updateProfile: async (req, res) => {
        try {
            const updates = req.body;
            const userId = req.user.id;

            // ── Clasificación de campos ───────────────────────────────────────────────
            // Los campos de theming van a AMBAS tablas (profiles y organizations)
            // para que el JOIN del login los devuelva sin importar desde dónde se lean.
            const profileOnlyFields  = ['full_name'];
            const orgOnlyFields      = ['organization_name', 'address', 'phone', 'email',
                                        'tax_percentage', 'currency', 'billing_resolution',
                                        'footer_message', 'logo_url', 'legal_representative', 'nit'];
            const sharedThemeFields  = ['theme_color', 'theme_secondary_color', 'theme_style'];

            const profileUpdates = {};
            const orgUpdates     = {};

            Object.keys(updates).forEach(key => {
                const val = updates[key];

                // Campos exclusivos de la tabla profiles
                if (profileOnlyFields.includes(key)) {
                    profileUpdates[key] = val;
                }

                // Campos exclusivos de la tabla organizations
                if (orgOnlyFields.includes(key)) {
                    if (key === 'organization_name') orgUpdates['name'] = val;
                    else orgUpdates[key] = val;
                }

                // Campos compartidos: se escriben en AMBAS tablas
                if (sharedThemeFields.includes(key)) {
                    profileUpdates[key] = val;
                    orgUpdates[key]     = val;
                }
            });

            console.log(`[updateProfile] User: ${userId}`);
            console.log(`[updateProfile] profileUpdates:`, profileUpdates);
            console.log(`[updateProfile] orgUpdates:`, orgUpdates);

            // A. Obtener el perfil actual para saber la organization_id y el role
            const { data: currentProfile, error: fetchErr } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (fetchErr) throw fetchErr;

            // B. Actualizar Perfil si hay cambios (Admin client para bypass RLS)
            if (Object.keys(profileUpdates).length > 0) {
                const { error: pErr } = await supabaseAdmin
                    .from('profiles')
                    .update(profileUpdates)
                    .eq('id', userId);
                if (pErr) {
                    console.error('[updateProfile] ❌ Error al actualizar profiles:', pErr.message);
                    throw pErr;
                }
                console.log('[updateProfile] ✅ profiles actualizado:', profileUpdates);
            }

            // C. Actualizar Organización si hay cambios (Solo Admin/SuperAdmin)
            if (Object.keys(orgUpdates).length > 0 && ['admin', 'super_admin'].includes(currentProfile.role)) {
                const { error: oErr } = await supabaseAdmin
                    .from('organizations')
                    .update(orgUpdates)
                    .eq('id', currentProfile.organization_id);
                if (oErr) {
                    console.error('[updateProfile] ⚠️ Error al actualizar organizations:', oErr.message, '| Campos:', orgUpdates);
                } else {
                    console.log('[updateProfile] ✅ organizations actualizado:', orgUpdates);
                }
            }

            // D. Retornar perfil refrescado con organización
            const { data: updatedProfile, error: refreshErr } = await supabaseAdmin
                .from('profiles')
                .select('*, organizations(*)')
                .eq('id', userId)
                .single();

            if (refreshErr) throw refreshErr;

            const organization = Array.isArray(updatedProfile.organizations) 
                ? updatedProfile.organizations[0] 
                : updatedProfile.organizations;

            res.status(200).json({ ...updatedProfile, organizations: organization });

        } catch (error) {
            console.error('Error en updateProfile:', error);
            res.status(500).json({ error: 'Fallo al sincronizar cambios de perfil y organización.' });
        }
    },

    // 8. [SÚPER ADMIN] Actualización Segura con Re-autenticación
    updateSecureProfile: async (req, res) => {
        try {
            const userId = req.user.id;
            const { currentPassword, newPassword, newFullName, newEmail } = req.body;

            if (!currentPassword) {
                return res.status(400).json({ error: 'La contraseña actual es obligatoria para validar su identidad.' });
            }

            // A. Obtener el email del usuario para el Double-Check
            const { data: { user: authUser }, error: getAuthError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (getAuthError || !authUser) throw new Error('No se pudo verificar la identidad del usuario en Auth.');

            // B. VALIDACIÓN TÁCTICA: Re-autenticación STATELESS (Double-Check)
            // Usamos un cliente efímero para verificar SIN mutar el singleton.
            const { createClient } = require('@supabase/supabase-js');
            const tempClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false }
            });

            const { error: signInError } = await tempClient.auth.signInWithPassword({
                email: authUser.email,
                password: currentPassword
            });

            if (signInError) {
                return res.status(401).json({ 
                    error: 'Credenciales actuales inválidas. Operación denegada.',
                    message: 'La contraseña actual ingresada no coincide con nuestros registros.' 
                });
            }

            // C. EJECUCIÓN DE CAMBIOS
            let updatePayload = {};
            
            // 1. Actualizar Contraseña / Email en Auth si se solicitó
            const authUpdates = {};
            if (newPassword) {
                if (newPassword.length < 6) return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
                authUpdates.password = newPassword;
            }
            if (newEmail && newEmail !== authUser.email) {
                authUpdates.email = newEmail;
            }

            if (Object.keys(authUpdates).length > 0) {
                const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
                if (authErr) {
                    if (authErr.message.includes('already registered')) {
                        return res.status(400).json({ error: 'El nuevo correo ya está registrado por otro usuario.' });
                    }
                    throw authErr;
                }
            }

            // 2. Actualizar Nombre en Perfil
            if (newFullName) {
                const { error: profError } = await supabaseAdmin
                    .from('profiles')
                    .update({ full_name: newFullName })
                    .eq('id', userId);
                
                if (profError) throw profError;
            }

            // D. Respuesta de Éxito
            res.status(200).json({ 
                message: 'Perfil e identidad actualizados con éxito.',
                updatedName: newFullName || null,
                updatedEmail: newEmail || null
            });

        } catch (error) {
            console.error('🔥 Error en updateSecureProfile:', error);
            res.status(500).json({ 
                error: 'Error sistémico al procesar la actualización segura.',
                details: error.message 
            });
        }
    },

    // 9. [STORAGE] Subida Resiliente de Logo (Desde el Servidor)
    uploadLogo: async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No se recibió ninguna imagen.' });
            }

            const profile = req.user; // Viene del authMiddleware
            if (!profile) return res.status(401).json({ error: 'No autorizado.' });

            const file = req.file;
            const fileExt = file.originalname.split('.').pop();
            const fileName = `org_${profile.organization_id}/${Date.now()}.${fileExt}`;
            const filePath = fileName;

            // Subir usando supabaseAdmin (Bypasses RLS)
            const { data, error: uploadError } = await supabaseAdmin.storage
                .from('logos')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (uploadError) throw uploadError;

            // Obtener URL Pública
            const { data: { publicUrl } } = supabaseAdmin.storage
                .from('logos')
                .getPublicUrl(filePath);

            res.status(200).json({ 
                message: 'Logo subido con éxito.', 
                logo_url: publicUrl 
            });

        } catch (error) {
            console.error('🔥 Error en uploadLogo:', error);
            res.status(500).json({ 
                error: 'Error al procesar la imagen en el servidor.',
                details: error.message 
            });
        }
    }
};

module.exports = authController;
