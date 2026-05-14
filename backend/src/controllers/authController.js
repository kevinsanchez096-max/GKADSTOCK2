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
            
            // Registro de Auditoría: Login Exitoso
            const { logAuditEvent } = require('../auditLogger');
            logAuditEvent('SEC', 'AuthAPI', 'AUTH_SUCCESS', { 
                user_id: authData.user.id, 
                email: authData.user.email,
                role: profileData.role 
            });

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

    // 3a. Obtener Organización Propia (protegida por JWT — Multi-Tenant seguro)
    getMyOrganization: async (req, res) => {
        try {
            const organizationId = req.user.organization_id;

            if (!organizationId) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Este usuario no pertenece a ninguna organización.' 
                });
            }

            const { data: org, error } = await supabaseAdmin
                .from('organizations')
                .select('*')
                .eq('id', organizationId)
                .single();

            if (error) throw error;
            if (!org) return res.status(404).json({ success: false, message: 'Organización no encontrada.' });

            res.status(200).json({ success: true, data: org });
        } catch (error) {
            console.error('[ORG] Error en getMyOrganization:', error.message);
            res.status(500).json({ success: false, message: translateError(error) });
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
            
            // Registro de Auditoría: Login Exitoso (Activado por el frontend)
            if (req.query.is_login === 'true') {
                const { logAuditEvent } = require('../auditLogger');
                logAuditEvent('SEC', 'AuthAPI', 'AUTH_SUCCESS', { 
                    user_id: userId, 
                    email: profile.email || req.user.email,
                    role: profile.role 
                });
            }

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

    // 4. Registro (Blindado: No crea registros en BD hasta verificación)
    register: async (req, res) => {
        try {
            const { email, password, fullName, orgName, createdBy } = req.body;
            if (!email || !password || !fullName || !orgName) {
                return res.status(400).json({ error: 'Todos los campos son obligatorios' });
            }

            console.log(`🚀 Iniciando registro previo para: ${email}`);

            // 1. Validación preventiva de Organización
            const { data: existingOrg } = await supabaseAdmin
                .from('organizations')
                .select('id')
                .eq('name', orgName)
                .maybeSingle();
            
            if (existingOrg) {
                return res.status(400).json({ error: 'El nombre de la organización ya está registrado.' });
            }

            // 2. Crear Usuario en Auth (Service Role)
            // Guardamos orgName y fullName en la metadata del usuario para recuperarlos al activar.
            const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({ 
                email, 
                password,
                email_confirm: false, // Forzar verificación OTP
                user_metadata: { 
                    full_name: fullName,
                    organization_name: orgName,
                    created_by: createdBy || null
                }
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    return res.status(400).json({ error: 'Este correo electrónico ya está registrado.' });
                }
                throw authError;
            }

            console.log('✅ Usuario creado en Auth (Pendiente). Disparando OTP...');

            // Notificación de intento de registro
            const { sendSystemNotification } = require('../utils/notificationService');
            sendSystemNotification('NEW_USER_PENDING', 'Registro Iniciado', `El usuario ${fullName} ha iniciado el registro para ${orgName}.`, { email, org_name: orgName });

            // Reintento de envío OTP via cliente anónimo (Asegura entrega)
            try {
                const { createClient } = require('@supabase/supabase-js');
                const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
                    auth: { persistSession: false, autoRefreshToken: false }
                });
                await anonClient.auth.resend({ type: 'signup', email: email.toLowerCase() });
            } catch (otpErr) {
                console.warn('⚠️ Reintento OTP:', otpErr.message);
            }

            res.status(201).json({ 
                message: 'Código de verificación enviado. Su cuenta no estará activa hasta que confirme el código.', 
                user: newAuth.user
            });

        } catch (error) {
            console.error('🔥 FALLO EN REGISTRO:', error.message);
            res.status(500).json({ error: translateError(error) });
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
            const organizationIdFromToken = req.user.organization_id;

            if (!organizationIdFromToken) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Operación denegada: Usuario sin organización vinculada.' 
                });
            }

            // 1. Clasificación y Normalización de Campos (Arquitectura Enterprise)
            const profileOnlyFields  = ['full_name'];
            const orgMapping = {
                'organization_name': 'company_name',
                'company_name': 'company_name',
                'email': 'corporate_email',
                'corporate_email': 'corporate_email',
                'address': 'primary_address',
                'primary_address': 'primary_address',
                'phone': 'phone_number',
                'phone_number': 'phone_number',
                'nit': 'tax_id',
                'tax_id': 'tax_id',
                'legal_representative': 'legal_representative',
                'tax_percentage': 'tax_percentage',
                'currency': 'currency',
                'billing_resolution': 'billing_resolution',
                'footer_message': 'footer_message',
                'logo_url': 'logo_url',
                'theme_color': 'theme_color',
                'theme_secondary_color': 'theme_secondary_color',
                'theme_style': 'theme_style'
            };

            const profileUpdates = {};
            const orgUpdates     = { 
                updated_at: new Date().toISOString(),
                updated_by: userId 
            };

            Object.keys(updates).forEach(key => {
                const val = updates[key];
                
                // Sanitización básica: trim y nullify strings vacíos
                const sanitizedVal = (typeof val === 'string' && val.trim() === '') ? null : val;

                if (profileOnlyFields.includes(key)) {
                    profileUpdates[key] = sanitizedVal;
                }

                if (orgMapping[key]) {
                    orgUpdates[orgMapping[key]] = sanitizedVal;
                }
            });

            console.log(`[ENTERPRISE SYNC] Iniciando actualización para Org: ${organizationIdFromToken}`);

            // 2. Transacción Lógica de Actualización
            const results = { profile: null, organization: null };

            // A. Actualizar Perfil (Si aplica)
            if (Object.keys(profileUpdates).length > 0) {
                const { data: pData, error: pErr } = await supabaseAdmin
                    .from('profiles')
                    .update(profileUpdates)
                    .eq('id', userId)
                    .select()
                    .single();
                if (pErr) throw pErr;
                results.profile = pData;
            }

            // B. Actualizar Organización (Solo si es Admin/SuperAdmin y hay cambios)
            if (Object.keys(orgUpdates).length > 2 && ['admin', 'super_admin'].includes(req.user.role)) {
                // Validación adicional de NIT único si se intenta cambiar
                if (orgUpdates.tax_id) {
                    const { data: existingOrg } = await supabaseAdmin
                        .from('organizations')
                        .select('id')
                        .eq('tax_id', orgUpdates.tax_id)
                        .neq('id', organizationIdFromToken)
                        .maybeSingle();
                    
                    if (existingOrg) {
                        return res.status(400).json({ 
                            success: false, 
                            message: 'El NIT/TAX ID ingresado ya está registrado por otra organización.' 
                        });
                    }
                }

                const { data: oData, error: oErr } = await supabaseAdmin
                    .from('organizations')
                    .update(orgUpdates)
                    .eq('id', organizationIdFromToken)
                    .select()
                    .single();
                
                if (oErr) {
                    console.error('[ENTERPRISE SYNC] ❌ Error en organizations:', oErr.message);
                    throw oErr;
                }
                results.organization = oData;
                console.log('[ENTERPRISE SYNC] ✅ Organización sincronizada.');
            }

            // 3. Respuesta Estandarizada V5.0
            const { data: finalProfile, error: refreshErr } = await supabaseAdmin
                .from('profiles')
                .select('*, organizations(*)')
                .eq('id', userId)
                .single();

            // E. Registrar Auditoría de Acceso
            const { logAuditEvent } = require('../auditLogger');
            logAuditEvent('INFO', 'AuthAPI', 'AUTH_SUCCESS', { 
                user_id: userId, 
                email: finalProfile.email,
                organization_id: finalProfile.organization_id 
            });

            if (refreshErr) throw refreshErr;

            // Normalización del objeto organization para el frontend
            const organization = Array.isArray(finalProfile.organizations) 
                ? finalProfile.organizations[0] 
                : finalProfile.organizations;

            res.status(200).json({
                success: true,
                message: 'Perfil y datos corporativos actualizados correctamente.',
                data: { ...finalProfile, organizations: organization }
            });

        } catch (error) {
            console.error('🔥 [ENTERPRISE SYNC CRITICAL]:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Error sistémico al sincronizar datos corporativos.',
                details: error.message 
            });
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
    },
    
    // 10. Activar Cuenta (OTP → Crear Infraestructura en BD)
    // FLUJO SEGURO: La organización y el perfil se crean SOLO si el código OTP
    // es válido. Esto garantiza que no existan usuarios sin verificar en la BD.
    activateAccount: async (req, res) => {
        try {
            const { email, code } = req.body;
            
            if (!email || !code) {
                return res.status(400).json({ error: 'Email y código son requeridos.' });
            }

            // ── A. Verificar el código OTP con Supabase ──────────────────────
            const { createClient } = require('@supabase/supabase-js');
            const tempClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
                auth: { persistSession: false, autoRefreshToken: false }
            });

            const { data: verifyData, error: verifyError } = await tempClient.auth.verifyOtp({
                email,
                token: code,
                type: 'signup'
            });

            if (verifyError || !verifyData.user) {
                return res.status(400).json({ 
                    error: 'Código inválido o expirado.',
                    details: verifyError?.message 
                });
            }

            const userId  = verifyData.user.id;
            const meta    = verifyData.user.user_metadata || {};
            const fullName = meta.full_name || email.split('@')[0];
            const orgName  = meta.organization_name || `Org_${userId.slice(0, 8)}`;

            console.log(`✅ OTP verificado para: ${email}. Creando infraestructura...`);

            // ── B. Verificar si ya existe el perfil (re-intento idempotente) ──
            const { data: existingProfile } = await supabaseAdmin
                .from('profiles')
                .select('organization_id')
                .eq('id', userId)
                .maybeSingle();

            if (existingProfile) {
                // Si ya existe perfil (reintento), solo activar la org
                console.log('ℹ️ Perfil existente, activando organización...');
                await supabaseAdmin
                    .from('organizations')
                    .update({ is_active: true, billing_status: 'activo' })
                    .eq('id', existingProfile.organization_id);
            } else {
                // ── C. Crear Organización (activa desde el inicio) ────────────
                const { data: orgData, error: orgError } = await supabaseAdmin
                    .from('organizations')
                    .insert([{ name: orgName, is_active: true, billing_status: 'activo' }])
                    .select()
                    .single();

                if (orgError) {
                    // Si la org ya existe (raro pero posible), recuperar su ID
                    if (orgError.code === '23505') {
                        console.warn('⚠️ Organización duplicada, recuperando...');
                        const { data: existingOrg } = await supabaseAdmin
                            .from('organizations')
                            .select('id')
                            .eq('name', orgName)
                            .maybeSingle();
                        if (existingOrg) {
                            await supabaseAdmin
                                .from('profiles')
                                .insert([{
                                    id: userId,
                                    full_name: fullName,
                                    organization_id: existingOrg.id,
                                    role: 'admin',
                                    created_by: meta.created_by || null
                                }]);
                        }
                    } else {
                        throw orgError;
                    }
                } else {
                    // ── D. Crear Perfil de usuario ────────────────────────────
                    const { error: profileError } = await supabaseAdmin
                        .from('profiles')
                        .insert([{
                            id: userId,
                            full_name: fullName,
                            organization_id: orgData.id,
                            role: 'admin',
                            created_by: meta.created_by || null
                        }]);

                    if (profileError && profileError.code !== '23505') {
                        throw profileError;
                    }
                }
            }

            console.log(`🎉 Cuenta activada y organización creada para: ${email}`);
            
            // ── E. Notificar al Super Admin (Bypass RLS) ──────────────────────
            try {
                await supabaseAdmin.from('system_notifications').insert([{
                    type: 'ORG_STATUS',
                    title: 'Nuevo Nodo Corporativo',
                    message: `La organización "${orgName}" ha sido inicializada y activada por ${fullName}.`,
                    metadata: { organization: orgName, admin: fullName, email: email }
                }]);
            } catch (notifErr) {
                console.error('⚠️ Fallo al disparar notificación administrativa:', notifErr.message);
            }

            // Retornamos la sesión para auto-login
            res.status(200).json({ 
                message: 'Cuenta activada con éxito. Bienvenido a GKAD STOCK.',
                session: verifyData.session,
                user: verifyData.user
            });
            
        } catch (error) {
            console.error('Error en activateAccount:', error);
            res.status(500).json({ error: 'Error técnico al activar la cuenta.' });
        }
    }
};

module.exports = authController;
