const { supabaseAdmin: supabase } = require('../config/supabase');

const PLAN_PRICES = {
    'Esencial': 39000,
    'Avanzado': 65000,
    'Emprendedor': 95000,
    'Premium': 145000
};

const superAdminController = {
    // 1. Obtener todas las Organizaciones
    getAllOrganizations: async (req, res) => {
        try {
            console.log('🚀 [FALLBACK] Iniciando Fusión en Memoria (Plan B)...');

            // CONSULTA A: Organizaciones (Plana y segura)
            const { data: orgs, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });

            if (orgError) throw orgError;

            // CONSULTA B: Perfiles Globales (Usamos auth.admin para bypass RLS)
            // Nota: Usamos el cliente administrativo para ver TODOS los perfiles de TODAS las orgs
            const { data: allProfiles, error: profError } = await supabase
                .from('profiles')
                .select('id, organization_id, role');

            if (profError) throw profError;

            console.log(`📊 [STATS] Orgs: ${orgs?.length} | Perfiles Totales Rescatados: ${allProfiles?.length}`);
            console.log('✅ [IDENTIDAD] Súper Admin recuperó visión global de la tabla profiles.');

            // FUSIÓN DE DATOS EN NODE.JS (Bypassing Supabase Join issues)
            const formattedOrgs = orgs.map(org => {
                // Filtramos los perfiles que pertenecen a esta organización
                const orgProfiles = allProfiles.filter(p => p.organization_id === org.id);
                
                return {
                    id: org.id,
                    name: org.company_name || org.name, // Fallback por migración
                    company_name: org.company_name || org.name,
                    tax_id: org.tax_id,
                    corporate_email: org.corporate_email,
                    legal_representative: org.legal_representative,
                    phone_number: org.phone_number,
                    primary_address: org.primary_address,
                    logo_url: org.logo_url,
                    tax_percentage: org.tax_percentage || 0,
                    currency: org.currency || 'COP',
                    billing_resolution: org.billing_resolution,
                    footer_message: org.footer_message,
                    theme_color: org.theme_color,
                    theme_secondary_color: org.theme_secondary_color,
                    theme_style: org.theme_style || 'solid',
                    is_active: org.is_active,
                    created_at: org.created_at,
                    plan: org.plan || 'Starter',
                    health_status: org.health_status || 'Saludable',
                    billing_status: org.billing_status || 'activo',
                    next_billing_date: org.next_billing_date,
                    license_price: org.license_price || 50000,
                    userCount: orgProfiles.length,
                    adminCount: orgProfiles.filter(p => {
                        const role = (p.role || '').toLowerCase();
                        return role === 'admin' || role === 'super_admin';
                    }).length,
                    vendedorCount: orgProfiles.filter(p => {
                        const role = (p.role || '').toLowerCase();
                        return role === 'vendedor' || role === 'cashier' || role === 'seller';
                    }).length
                };
            });

            // CONSULTA C: Conteo de Eliminadas (Basado en Logs Históricos)
            const { count: deletedCount } = await supabase
                .from('system_audit_logs')
                .select('id', { count: 'exact', head: true })
                .eq('event', 'ORG_DELETED');

            res.status(200).json({
                success: true,
                message: 'Organizaciones recuperadas correctamente.',
                data: formattedOrgs,
                summary: {
                    total: orgs.length,
                    active: orgs.filter(o => o.is_active && (!o.billing_status || o.billing_status.toLowerCase() === 'activo')).length,
                    suspended: orgs.filter(o => !o.is_active || (o.billing_status && o.billing_status.toLowerCase() !== 'activo')).length,
                    deleted: deletedCount || 0
                }
            });
        } catch (error) {
            console.error('❌ [FATAL] Error en getAllOrganizations (Plan B):', error);
            res.status(500).json({ error: 'Error al listar las organizaciones (Fallo en Fusión).' });
        }
    },

    // 2. Activar/Suspender Organización
    toggleOrganizationStatus: async (req, res) => {
        try {
            const { orgId } = req.params;
            const { is_active } = req.body;
            const { data, error } = await supabase
                .from('organizations')
                .update({ is_active })
                .eq('id', orgId)
                .select()
                .single();

            if (error) throw error;

            // Registro de Auditoría: Cambio de Estado de Org
            const { logAuditEvent } = require('../auditLogger');
            logAuditEvent('MOD', 'SaaSManager', orgId, is_active ? 'ORG_ACTIVATED' : 'ORG_SUSPENDED', { 
                org_id: orgId, 
                executor: req.user.id 
            });

            // Notificación: Cambio de Estado de Org
            const { sendSystemNotification } = require('../utils/notificationService');
            sendSystemNotification('ORG_STATUS', is_active ? 'Organización Activada' : 'Organización Suspendida', `La organización con ID ${orgId} ha sido ${is_active ? 'activada' : 'suspendida'}.`, { org_id: orgId, executor: req.user.id });

            res.status(200).json({ message: is_active ? 'Activada' : 'Suspendida', organization: data });
        } catch (error) {
            res.status(500).json({ error: 'Error al cambiar estado.' });
        }
    },

    // 3. Estadísticas Globales (Reforzado para Demo)
    getGlobalStats: async (req, res) => {
        try {
            const { range } = req.query;
            const [orgResponse, userResponse, attentionResponse] = await Promise.all([
                supabase.from('organizations').select('id', { count: 'exact', head: true }),
                supabase.from('profiles').select('id', { count: 'exact', head: true }),
                supabase.from('organizations').select('id', { count: 'exact', head: true }).or('health_status.eq.Atención,health_status.eq.Crítico')
            ]);

            const { data: activeOrgs } = await supabase.from('organizations').select('license_price').eq('billing_status', 'activo');
            const totalMRR = (activeOrgs || []).reduce((sum, org) => sum + Number(org.license_price || 0), 0);

            // ── CÁLCULO DE SALUD DE NEGOCIO ──
            const { data: healthOrgs } = await supabase.from('organizations').select('health_status, billing_status');
            const totalOrgs = healthOrgs?.length || 0;
            const healthyOrgs = (healthOrgs || []).filter(o => o.health_status === 'Saludable').length;
            const activeBillingOrgs = (healthOrgs || []).filter(o => o.billing_status === 'activo').length;
            const efficiency = totalOrgs > 0 ? Math.round((healthyOrgs / totalOrgs) * 100) : 100;
            const retention = totalOrgs > 0 ? Math.round((activeBillingOrgs / totalOrgs) * 100) : 100;

            const pulseData = await superAdminController.getPulseLogic(range || 'Mes');

            res.status(200).json({
                totalOrganizations: orgResponse.count || 0,
                totalUsers: userResponse.count || 0,
                activeUsersToday: pulseData.activeToday,
                requiresAttention: attentionResponse.count || 0,
                totalMRR: totalMRR,
                dailyActivity: pulseData.activity,
                growthData: await superAdminController.calculateGrowthData(range || 'Mes'),
                businessHealth: {
                    efficiency,
                    retention,
                    summary: efficiency > 80 ? `Ecosistema estable (${efficiency}%).` : `Atención requerida (${efficiency}%).`
                }
            });
        } catch (error) {
            console.error('❌ [STATS ERROR]:', error);
            res.status(500).json({ error: 'Error en analíticas.' });
        }
    },

    getPulseStats: async (req, res) => {
        try {
            const { range } = req.query;
            const data = await superAdminController.getPulseLogic(range || 'Mes');
            res.status(200).json(data);
        } catch (error) {
            res.status(500).json({ error: 'Error en pulso.' });
        }
    },

    getPulseLogic: async (range) => {
        let startDate = new Date();
        let activityMap = {};
        const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

        if (range === 'Hoy') {
            startDate.setHours(0, 0, 0, 0);
            for (let i = 0; i < 24; i += 4) { activityMap[`${i}:00`] = new Set(); }
        } else if (range === 'Semana') {
            startDate.setDate(startDate.getDate() - 7);
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                activityMap[days[d.getDay()]] = new Set();
            }
        } else if (range === 'Año') {
            startDate.setFullYear(startDate.getFullYear() - 1);
            const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            for (let i = 11; i >= 0; i--) {
                const d = new Date(); d.setMonth(d.getMonth() - i);
                activityMap[monthsShort[d.getMonth()]] = new Set();
            }
        } else {
            startDate.setDate(startDate.getDate() - 30);
            ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].forEach(s => activityMap[s] = new Set());
        }

        const { data: logs } = await supabase.from('system_audit_logs').select('created_at, metadata').gte('created_at', startDate.toISOString());

        (logs || []).forEach(log => {
            if (!log.metadata?.user_id) return;
            const date = new Date(log.created_at);
            if (range === 'Hoy') {
                const hour = Math.floor(date.getHours() / 4) * 4;
                activityMap[`${hour}:00`]?.add(log.metadata.user_id);
            } else if (range === 'Semana') {
                activityMap[days[date.getDay()]]?.add(log.metadata.user_id);
            } else if (range === 'Año') {
                const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                activityMap[monthsShort[date.getMonth()]]?.add(log.metadata.user_id);
            } else {
                const diff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
                const week = Math.min(4, Math.floor(diff / 7) + 1);
                activityMap[`Sem ${5-week}`]?.add(log.metadata.user_id);
            }
        });

        const activity = Object.keys(activityMap).map(name => ({ name, users: activityMap[name].size }));
        const todayName = days[new Date().getDay()];
        const activeToday = range === 'Hoy' ? activityMap[`${Math.floor(new Date().getHours()/4)*4}:00`]?.size : activityMap[todayName]?.size;

        return { activity, activeToday: activeToday || 1 };
    },

    calculateGrowthData: async (range) => {
        const { data: orgs } = await supabase
            .from('organizations')
            .select('created_at, license_price, is_active, billing_status');

        const { data: deletionLogs } = await supabase
            .from('system_audit_logs')
            .select('created_at, metadata')
            .eq('event', 'ORG_DELETED');

        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const now = new Date();
        const results = [];

        let iterations = 6;
        let step = 'month';

        if (range === 'Año') iterations = 12;
        if (range === 'Semana') { iterations = 7; step = 'day'; }
        if (range === 'Hoy') { iterations = 6; step = 'hour'; }

        for (let i = iterations - 1; i >= 0; i--) {
            let label = '';
            let endOfPeriod = new Date();

            if (step === 'month') {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                label = months[d.getMonth()];
                endOfPeriod = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
            } else if (step === 'day') {
                const d = new Date(); d.setDate(d.getDate() - i);
                label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                endOfPeriod = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
            } else {
                const d = new Date(); d.setHours(d.getHours() - (i * 4));
                label = `${d.getHours()}:00`;
                endOfPeriod = d;
            }
            
            // Suscripciones Activas: Orgs que existen y están activas
            const activeMRR = (orgs || [])
                .filter(o => new Date(o.created_at) <= endOfPeriod && o.billing_status === 'activo')
                .reduce((sum, o) => sum + Number(o.license_price || 0), 0);

            // Pérdidas por Suspensión: Orgs que existen pero no están activas
            const suspendedMRR = (orgs || [])
                .filter(o => new Date(o.created_at) <= endOfPeriod && o.billing_status !== 'activo')
                .reduce((sum, o) => sum + Number(o.license_price || 0), 0);

            // Pérdidas por Eliminación: Orgs que ya no existen (registradas en logs)
            const deletedMRR = (deletionLogs || [])
                .filter(log => new Date(log.created_at) <= endOfPeriod)
                .reduce((sum, log) => sum + Number(log.metadata?.lost_mrr || 0), 0);

            results.push({
                name: label,
                mrr: activeMRR,
                churn: suspendedMRR + deletedMRR
            });
        }
        return results;
    },

    // 4. Obtener Usuarios de una Organización
    getOrgUsers: async (req, res) => {
        try {
            const { orgId } = req.params;
            console.log(`🔍 [DEBUG] Solicitando personal para Org ID: ${orgId}`);
            
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('organization_id', orgId.trim())
                .order('role', { ascending: true });

            if (profileError) throw profileError;

            const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
            
            const formattedUsers = profiles.map(p => ({
                id: p.id,
                full_name: p.full_name,
                email: authUsers.find(u => u.id === p.id)?.email || 'S/D',
                role: p.role,
                status: p.status || 'active',
                last_active: authUsers.find(u => u.id === p.id)?.last_sign_in_at
            }));

            res.status(200).json(formattedUsers);
        } catch (error) {
            res.status(500).json({ error: 'Error al recuperar personal.' });
        }
    },

    // 5. [MODO DIOS] Eliminar Organización (Cascada)
    deleteOrganization: async (req, res) => {
        try {
            const { orgId } = req.params;
            console.log(`🧨 [PURGE] Iniciando borrado total de Org: ${orgId}`);

            // 0. Rescatar datos para auditoría histórica de pérdidas
            const { data: orgData } = await supabase
                .from('organizations')
                .select('name, license_price')
                .eq('id', orgId)
                .single();

            // A. Rescatar IDs de usuarios para limpieza en Auth
            const { data: profiles } = await supabase.from('profiles').select('id').eq('organization_id', orgId);

            // B. Borrado Masivo (Tablas de Negocio)
            await Promise.all([
                supabase.from('sales').delete().eq('organization_id', orgId),
                supabase.from('inventory_movements').delete().eq('organization_id', orgId),
                supabase.from('products').delete().eq('organization_id', orgId),
                supabase.from('expenses').delete().eq('organization_id', orgId),
                supabase.from('system_logs').delete().eq('organization_id', orgId)
            ]);

            // C. Borrado de Perfiles y Organización (Identidad y Padre)
            await supabase.from('profiles').delete().eq('organization_id', orgId);
            
            // Registro de Auditoría de Pérdida Financiera antes de borrar el nodo
            const { logAuditEvent } = require('../auditLogger');
            logAuditEvent('MOD', 'SaaSManager', orgId, 'ORG_DELETED', { 
                org_id: orgId, 
                org_name: orgData?.name,
                lost_mrr: orgData?.license_price || 0,
                executor: req.user.id 
            });

            // Notificación: Eliminación de Organización
            const { sendSystemNotification } = require('../utils/notificationService');
            sendSystemNotification('ORG_DELETED', 'Organización Eliminada', `La organización '${orgData?.name || orgId}' ha sido eliminada permanentemente el ${new Date().toLocaleString('es-ES')}.`, { org_id: orgId, executor: req.user.id });

            const { error: orgError } = await supabase.from('organizations').delete().eq('id', orgId);

            if (orgError) {
                console.error('❌ [PURGE ERROR] No se pudo borrar la tabla organizations:', orgError);
                throw orgError;
            }

            // D. Limpieza de Supabase Auth (Service Role) - Blindado
            if (profiles && profiles.length > 0) {
                console.log(`🔐 [AUTH PURGE] Eliminando ${profiles.length} usuarios de la capa de autenticación...`);
                await Promise.all(profiles.map(async (p) => {
                    try {
                        await supabase.auth.admin.deleteUser(p.id);
                    } catch (e) {
                        console.warn(`⚠️ [AUTH WARN] No se pudo borrar usuario ${p.id} (podría no existir):`, e.message);
                    }
                }));
            }

            res.status(200).json({ message: 'Purga total completada. Datos e identidades eliminadas.' });
        } catch (error) {
            console.error('🔥 [PURGE CRITICAL ERROR]:', error);
            res.status(500).json({ error: 'Fallo en borrado destructivo. Verifique logs del servidor.' });
        }
    },

    // 6. [RESTAURADO] Trazabilidad Jerárquica
    getUserCreationTrace: async (req, res) => {
        try {
            const { data: profiles } = await supabase.from('profiles').select('*, organizations(name)');
            const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();

            const enriched = profiles.map(p => ({
                ...p,
                email: authUsers?.find(u => u.id === p.id)?.email || 'N/D',
                organization_name: p.organizations?.name || 'Sistema'
            }));

            const buildTree = (parentId = null) => {
                return enriched
                    .filter(p => p.created_by === parentId)
                    .map(p => ({
                        id: p.id,
                        full_name: p.full_name,
                        email: p.email,
                        role: p.role,
                        children: buildTree(p.id)
                    }));
            };

            res.status(200).json(buildTree());
        } catch (error) {
            res.status(500).json({ error: 'Error en trazabilidad.' });
        }
    },

    // 7. [RESTAURADO] Crear Super Admin
    createSuperAdmin: async (req, res) => {
        try {
            const { email, password, full_name } = req.body;
            const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name, role: 'super_admin' }
            });

            if (authError) throw authError;

            await supabase.from('profiles').insert([{
                id: user.id,
                full_name,
                role: 'super_admin',
                status: 'active'
            }]);

            res.status(201).json({ message: 'Súper Admin creado con éxito.' });
        } catch (error) {
            res.status(500).json({ error: 'Error al crear super-admin.' });
        }
    },

    // 8. Gestión Maestra de Usuarios
    updateUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const { full_name, role, status, email } = req.body;

            console.log(`[MASTER SYNC] Payload recibido para ${userId}:`, JSON.stringify({ full_name, role, status, email }));

            // 1. Actualizar Perfil en Base de Datos
            const { data: updateData, error: profileError } = await supabase
                .from('profiles')
                .update({ full_name, role, status })
                .eq('id', userId)
                .select();

            if (profileError) {
                console.error('[DB ERROR] Detalle del fallo:', profileError);
                return res.status(500).json({ error: `Error DB: ${profileError.message} (Código: ${profileError.code})` });
            }

            console.log('[DB SUCCESS] Respuesta de actualización:', JSON.stringify(updateData));

            // 2. Actualizar Auth si hay cambios de email
            if (email) {
                console.log(`[AUTH SYNC] Intentando actualizar email a: ${email}`);
                const { error: authError } = await supabase.auth.admin.updateUserById(userId, { email });
                if (authError) {
                    console.error('[AUTH ERROR] Detalle:', authError);
                    if (authError.message.includes('already registered') || authError.message.includes('exists')) {
                        return res.status(400).json({ error: 'El nuevo correo ya está registrado por otro usuario.' });
                    }
                    return res.status(400).json({ error: `Auth Error: ${authError.message}` });
                }
            }

            res.status(200).json({ message: 'Sincronización maestra completada.' });
        } catch (error) {
            console.error('[FATAL SYNC ERROR]:', error);
            res.status(500).json({ error: 'Error sistémico en la sincronización maestra.' });
        }
    },

    deleteUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', userId).single();

            if (profile && profile.role === 'admin') {
                const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).eq('role', 'admin');
                if (count <= 1) return res.status(403).json({ error: 'No puedes borrar al último administrador.' });
            }

            await supabase.from('profiles').delete().eq('id', userId);
            await supabase.auth.admin.deleteUser(userId);
            res.status(200).json({ message: 'Usuario purgado.' });
        } catch (error) {
            res.status(500).json({ error: 'Error en eliminación.' });
        }
    },

    // 10. [MODO DIOS AD] Restablecer Contraseña Personalizada
    resetUserPassword: async (req, res) => {
        try {
            const { userId } = req.params;
            const { newPassword } = req.body;
            
            const passwordToSet = newPassword || 'GkadTemp2026*';

            // A. Actualizar en Supabase Auth (Capa de Autenticación) usando el Service Role
            const { error: authError } = await supabase.auth.admin.updateUserById(userId, { 
                password: passwordToSet 
            });

            if (authError) throw authError;

            // B. Activar Flag de Cambio Obligatorio en Perfil (Capa de Negocio)
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ require_password_change: true })
                .eq('id', userId);

            if (profileError) throw profileError;

            res.status(200).json({ 
                message: 'Contraseña restablecida por el Súper Administrador.',
                tempPassword: passwordToSet 
            });
        } catch (error) {
            console.error('Error en resetUserPassword:', error);
            res.status(500).json({ error: 'Fallo sistémico al forzar cambio de clave administrativa.' });
        }
    },

    getAllUsers: async (req, res) => {
        const { data } = await supabase.from('profiles').select('*, organizations(name)');
        res.status(200).json(data);
    },
    getSystemHealth: async (req, res) => { 
        const start = Date.now();
        try {
            const { error } = await supabase.from('organizations').select('id', { count: 'exact', head: true });
            const latency = Date.now() - start;
            
            res.status(200).json({ 
                status: 'operational',
                latency: `${latency}ms`,
                database: error ? 'disconnected' : 'connected',
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            res.status(200).json({ 
                status: 'degraded',
                latency: '--',
                database: 'error',
                timestamp: new Date().toISOString()
            });
        }
    },
    getSystemLogs: async (req, res) => { 
        try {
            const { data, error } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50);
            if (error) throw error;
            res.status(200).json(data || []); 
        } catch (err) {
            console.error('Error fetching logs:', err);
            res.status(200).json([]);
        }
    },
    // 11. [ATÓMICO] Nueva organización con Provisión de Administrador
    createOrganization: async (req, res) => {
        let createdOrgId = null;
        let createdAuthUserId = null;

        try {
            const { name, plan, adminFullName, adminEmail, adminPassword } = req.body;
            const superAdminId = req.user.id; // El Súper Admin que ejecuta la acción

            if (!name || !adminEmail || !adminPassword || !adminFullName) {
                return res.status(400).json({ error: 'Faltan datos obligatorios para la provisión del inquilino.' });
            }

            // PASO 1: Crear la Organización
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .insert([{ 
                    name, 
                    plan: plan || 'Esencial',
                    license_price: PLAN_PRICES[plan] || 39000,
                    health_status: 'Saludable',
                    is_active: true
                }])
                .select()
                .single();

            if (orgError) {
                console.error('[PROVISIÓN] Fallo al crear organización:', orgError);
                throw new Error(`Error DB (Org): ${orgError.message}`);
            }

            createdOrgId = orgData.id;
            console.log(`[PROVISIÓN] Organización '${name}' creada con ID: ${createdOrgId}`);

            // PASO 2: Crear el Administrador en Auth (Service Role)
            const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
                email: adminEmail,
                password: adminPassword,
                email_confirm: true,
                user_metadata: { full_name: adminFullName, role: 'admin' }
            });

            if (authError) {
                console.error('[PROVISIÓN] Fallo al crear admin en Auth:', authError);
                throw new Error(`Error Auth: ${authError.message}`);
            }

            createdAuthUserId = user.id;
            console.log(`[PROVISIÓN] Usuario admin creado en Auth con ID: ${createdAuthUserId}`);

            // PASO 3: Crear el Perfil del Administrador vinculado a la nueva Org
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: createdAuthUserId,
                    organization_id: createdOrgId,
                    full_name: adminFullName,
                    role: 'admin',
                    status: 'active',
                    created_by: superAdminId // TRAZABILIDAD
                }]);

            if (profileError) {
                console.error('[PROVISIÓN] Fallo al crear perfil vinculante:', profileError);
                throw new Error(`Error DB (Perfil): ${profileError.message}`);
            }

            console.log(`✅ [VINCULACIÓN] Perfil del administrador [${createdAuthUserId}] vinculado con éxito a la organización [${createdOrgId}]`);

            // Notificación: Creación de Organización
            const { sendSystemNotification } = require('../utils/notificationService');
            sendSystemNotification('ORG_CREATED', 'Nueva Organización', `Se ha creado '${name}' exitosamente el ${new Date().toLocaleString('es-ES')}.`, { org_id: createdOrgId, executor: superAdminId });

            // Registro de Auditoría: Creación de Organización
            const { logAuditEvent } = require('../auditLogger');
            logAuditEvent('MOD', 'SaaSManager', createdOrgId, 'ORG_CREATED', { 
                org_id: createdOrgId, 
                org_name: name,
                admin_email: adminEmail,
                executor: superAdminId 
            });

            res.status(201).json({ 
                message: 'Provisión atómica completada con éxito.',
                organization: orgData,
                admin: { id: createdAuthUserId, email: adminEmail }
            });

        } catch (error) {
            console.error('🔥 [PROVISIÓN FATAL ERROR]:', error); // Log de diagnóstico completo

            // ROLLBACK MANUAL CON SEGURIDAD (DRY - Lógica de limpieza)
            try {
                if (createdOrgId) {
                    console.warn(`[ROLLBACK] Eliminando organización huérfana: ${createdOrgId}`);
                    await supabase.from('organizations').delete().eq('id', createdOrgId);
                }

                if (createdAuthUserId) {
                    console.warn(`[ROLLBACK] Eliminando usuario Auth huérfano: ${createdAuthUserId}`);
                    // Usamos admin.deleteUser para limpiar la cuenta de Supabase Auth
                    const { error: delError } = await supabase.auth.admin.deleteUser(createdAuthUserId);
                    if (delError) console.error('[ROLLBACK ERROR] No se pudo borrar el usuario Auth:', delError.message);
                }
            } catch (rollbackError) {
                console.error('[ROLLBACK CRITICAL] Fallo en la limpieza post-error:', rollbackError.message);
            }

            // ENVIAR EL ERROR REAL AL FRONTEND
            const errorMessage = error.message || 'Error desconocido en la provisión';
            res.status(500).json({ 
                error: `Fallo en provisión (Rollback Ejecutado): ${errorMessage}` 
            });
        }
    },
    updateOrganization: async (req, res) => {
        const { orgId } = req.params;
        const updateData = { ...req.body };

        // Si se cambia el plan, actualizar el precio automáticamente
        if (updateData.plan && PLAN_PRICES[updateData.plan]) {
            updateData.license_price = PLAN_PRICES[updateData.plan];
        }

        const { data, error } = await supabase
            .from('organizations')
            .update(updateData)
            .eq('id', orgId)
            .select()
            .single();

        if (error) return res.status(500).json(error);
        res.status(200).json(data);
    },

    // 12. [MODO DIOS] Inyectar Usuario Directamente
    injectUser: async (req, res) => {
        try {
            const { orgId } = req.params;
            const { email, password, full_name, role } = req.body;
            const superAdminId = req.user.id; // El Súper Admin autenticado

            if (!email || !password || !full_name || !role) {
                return res.status(400).json({ error: 'Faltan datos obligatorios para la inyección.' });
            }

            // --- Lógica de Poder: Validación de Límites por Plan ---
            const { data: orgData } = await supabase
                .from('organizations')
                .select('plan')
                .eq('id', orgId)
                .single();

            if (orgData) {
                const { count: userCount } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_id', orgId);

                const limits = { 'Esencial': 1, 'Avanzado': 3, 'Emprendedor': 25 };
                if (limits[orgData.plan] && userCount >= limits[orgData.plan]) {
                    return res.status(403).json({ 
                        error: `Límite de usuarios alcanzado para el Plan ${orgData.plan}.`,
                        message: `El plan actual de esta empresa permite máximo ${limits[orgData.plan]} usuario(s).` 
                    });
                }
            }

            // A. Crear usuario en Auth usando la llave administrativa (SERVICE_ROLE)
            const { data: { user }, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name, role }
            });

            if (authError) {
                // Capturar específicamente el error de email duplicado
                if (authError.message.includes('already registered')) {
                    return res.status(400).json({ error: 'Este correo ya pertenece a otro usuario en el sistema.' });
                }
                // Si la clave es muy débil u otro error de Auth
                return res.status(400).json({ error: `Auth Error: ${authError.message}` });
            }

            // B. Crear perfil vinculado a la organización y con trazabilidad jerárquica
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    organization_id: orgId,
                    full_name,
                    role,
                    status: 'active',
                    created_by: superAdminId // OBLIGATORIO PARA TRAZABILIDAD
                }]);

            if (profileError) {
                // Rollback: Si falla el perfil, eliminamos el usuario de Auth para evitar huérfanos
                console.error('Fallo al crear perfil, revirtiendo Auth:', profileError);
                await supabase.auth.admin.deleteUser(user.id);
                return res.status(500).json({ error: `Error de Base de Datos: ${profileError.message}` });
            }

            res.status(201).json({ 
                message: 'Usuario inyectado con éxito.',
                user: { id: user.id, email, full_name, role }
            });

        } catch (error) {
            console.error('Fallo crítico en injectUser:', error);
            res.status(500).json({ error: 'Fallo sistémico en la inyección de usuario.' });
        }
    }
};

module.exports = superAdminController;
