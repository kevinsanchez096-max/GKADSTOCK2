const { supabaseAdmin } = require('../config/supabase');

/**
 * CONTROLADOR DE SESIONES DE CAJA — Persistencia en Supabase
 * Migrado desde cash_sessions.json (filesystem efímero) a Supabase (base de datos persistente)
 * para garantizar compatibilidad total con plataformas serverless (Vercel, AWS Lambda, etc.)
 */
const cashSessionController = {
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

    // 1. Obtener estado de caja activo (GET /api/cash-sessions/active)
    getActiveSession: async (req, res) => {
        try {
            const orgId = cashSessionController.getOrgId(req);

            // Buscar sesión activa ('open') de la organización
            const { data: active, error } = await supabaseAdmin
                .from('cash_sessions')
                .select('*')
                .eq('organization_id', orgId)
                .eq('status', 'open')
                .maybeSingle();

            if (error) throw error;

            if (!active) {
                return res.status(200).json({ active: false, session: null });
            }

            // Si está activa, recopilar dinámicamente las ventas y gastos desde su apertura
            const metrics = await cashSessionController.calculateMetrics(orgId, active.opening_time);

            // Intentar recuperar el nombre real del usuario de Supabase
            let realName = active.user_name;
            if (active.user_id) {
                const { data: p } = await supabaseAdmin
                    .from('profiles')
                    .select('full_name')
                    .eq('id', active.user_id)
                    .maybeSingle();
                if (p && p.full_name) {
                    realName = p.full_name;
                }
            }

            res.status(200).json({
                active: true,
                session: {
                    ...active,
                    user_name: realName,
                    sales_cash: metrics.sales_cash,
                    sales_other: metrics.sales_other,
                    total_expenses: metrics.total_expenses,
                    expected_cash: active.opening_balance + metrics.sales_cash - metrics.total_expenses
                }
            });
        } catch (error) {
            console.error('🔥 [CASH ERROR] getActiveSession:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // Helper para calcular métricas de ventas y egresos desde la base de datos
    calculateMetrics: async (orgId, startTime, endTime = null) => {
        try {
            // Consulta de ventas
            let salesQuery = supabaseAdmin
                .from('sales')
                .select('total, payment_method, created_at')
                .eq('organization_id', orgId)
                .gte('created_at', startTime);
            
            if (endTime) {
                salesQuery = salesQuery.lte('created_at', endTime);
            }

            const { data: sales, error: salesError } = await salesQuery;
            if (salesError) throw salesError;

            // Consulta de gastos
            let expensesQuery = supabaseAdmin
                .from('expenses')
                .select('amount, created_at')
                .eq('organization_id', orgId)
                .gte('created_at', startTime);

            if (endTime) {
                expensesQuery = expensesQuery.lte('created_at', endTime);
            }

            const { data: expenses, error: expensesError } = await expensesQuery;
            if (expensesError) throw expensesError;

            let sales_cash = 0;
            let sales_other = 0;

            (sales || []).forEach(sale => {
                const method = (sale.payment_method || 'cash').toLowerCase();
                const total = Number(sale.total) || 0;
                if (method === 'cash' || method === 'efectivo') {
                    sales_cash += total;
                } else {
                    sales_other += total;
                }
            });

            const total_expenses = (expenses || []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

            return {
                sales_cash,
                sales_other,
                total_expenses
            };
        } catch (err) {
            console.error('Error calculando métricas de caja:', err);
            return { sales_cash: 0, sales_other: 0, total_expenses: 0 };
        }
    },

    // 2. Abrir caja (POST /api/cash-sessions/open)
    openSession: async (req, res) => {
        try {
            const orgId = cashSessionController.getOrgId(req);
            const { opening_balance } = req.body;

            if (opening_balance === undefined || opening_balance === null || Number(opening_balance) < 0) {
                return res.status(400).json({ error: 'Debe ingresar un monto inicial positivo para abrir la caja.' });
            }

            // Verificar que no haya otra abierta
            const { data: existing, error: checkError } = await supabaseAdmin
                .from('cash_sessions')
                .select('id')
                .eq('organization_id', orgId)
                .eq('status', 'open')
                .maybeSingle();

            if (checkError) throw checkError;

            if (existing) {
                return res.status(400).json({ error: 'Ya existe una sesión de caja activa abierta para esta organización.' });
            }

            const newSession = {
                organization_id: orgId,
                user_id: req.user.id,
                user_name: req.user.full_name || 'Cajero',
                status: 'open',
                opening_time: new Date().toISOString(),
                closing_time: null,
                opening_balance: Number(opening_balance),
                sales_cash: 0,
                sales_other: 0,
                total_expenses: 0,
                expected_cash: Number(opening_balance),
                actual_cash: null,
                difference: null,
                notes: '',
                auto_closed: false
            };

            const { data: inserted, error: insertError } = await supabaseAdmin
                .from('cash_sessions')
                .insert([newSession])
                .select()
                .single();

            if (insertError) throw insertError;

            // Log de auditoría (Seguro contra fallos de DB/esquema)
            try {
                await supabaseAdmin.from('system_logs').insert([{
                    level: 'info',
                    module: 'cash_register',
                    user_id: req.user.id,
                    organization_id: orgId,
                    message: `Caja ABIERTA por ${inserted.user_name} con base de $${inserted.opening_balance.toLocaleString()}`
                }]);
            } catch (logError) {
                console.error('⚠️ [CASH LOG ERROR] Falló al registrar log de apertura:', logError.message);
            }

            res.status(201).json({ success: true, session: inserted });
        } catch (error) {
            console.error('🔥 [CASH ERROR] openSession:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 3. Cerrar caja (POST /api/cash-sessions/close)
    closeSession: async (req, res) => {
        try {
            const orgId = cashSessionController.getOrgId(req);
            const { actual_cash, notes } = req.body;

            if (actual_cash === undefined || actual_cash === null || Number(actual_cash) < 0) {
                return res.status(400).json({ error: 'Debe ingresar el monto real contado en caja física.' });
            }

            // Buscar la sesión activa
            const { data: active, error: findError } = await supabaseAdmin
                .from('cash_sessions')
                .select('*')
                .eq('organization_id', orgId)
                .eq('status', 'open')
                .maybeSingle();

            if (findError) throw findError;

            if (!active) {
                return res.status(400).json({ error: 'No existe ninguna sesión de caja activa para cerrar.' });
            }

            const closingTime = new Date().toISOString();

            // Calcular métricas consolidadas finales de la sesión
            const metrics = await cashSessionController.calculateMetrics(orgId, active.opening_time, closingTime);
            
            const base = active.opening_balance;
            const expected = base + metrics.sales_cash - metrics.total_expenses;
            const diff = Number(actual_cash) - expected;

            const closedData = {
                status: 'closed',
                closing_time: closingTime,
                sales_cash: metrics.sales_cash,
                sales_other: metrics.sales_other,
                total_expenses: metrics.total_expenses,
                expected_cash: expected,
                actual_cash: Number(actual_cash),
                difference: diff,
                notes: notes || '',
                auto_closed: false
            };

            const { data: closedSession, error: updateError } = await supabaseAdmin
                .from('cash_sessions')
                .update(closedData)
                .eq('id', active.id)
                .select()
                .single();

            if (updateError) throw updateError;

            // Log de auditoría (Seguro contra fallos de DB/esquema)
            const diffMsg = diff === 0 ? 'Caja cuadrada perfectamente' : diff > 0 ? `SOBRANTE de $${diff.toLocaleString()}` : `FALTANTE de $${Math.abs(diff).toLocaleString()}`;
            try {
                await supabaseAdmin.from('system_logs').insert([{
                    level: diff === 0 ? 'info' : 'warning',
                    module: 'cash_register',
                    user_id: req.user.id,
                    organization_id: orgId,
                    message: `Caja CERRADA por ${closedSession.user_name}. Esperado: $${expected.toLocaleString()} | Real: $${closedSession.actual_cash.toLocaleString()} (${diffMsg})`
                }]);
            } catch (logError) {
                console.error('⚠️ [CASH LOG ERROR] Falló al registrar log de cierre:', logError.message);
            }

            res.status(200).json({ success: true, session: closedSession });
        } catch (error) {
            console.error('🔥 [CASH ERROR] closeSession:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 4. Obtener historial de sesiones de caja cerradas (GET /api/cash-sessions/history)
    getHistory: async (req, res) => {
        try {
            res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            const orgId = cashSessionController.getOrgId(req);
            
            const { data: history, error } = await supabaseAdmin
                .from('cash_sessions')
                .select('*')
                .eq('organization_id', orgId)
                .eq('status', 'closed')
                .order('closing_time', { ascending: false });

            if (error) throw error;

            // Enriquecer dinámicamente el nombre real del cajero
            const userIds = [...new Set((history || []).map(s => s.user_id).filter(Boolean))];
            let userNamesMap = {};
            if (userIds.length > 0) {
                const { data: profiles, error: pError } = await supabaseAdmin
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', userIds);
                
                if (!pError && profiles) {
                    profiles.forEach(p => {
                        if (p.full_name) {
                            userNamesMap[p.id] = p.full_name;
                        }
                    });
                }
            }

            const enrichedHistory = (history || []).map(s => ({
                ...s,
                user_name: userNamesMap[s.user_id] || s.user_name || 'Cajero'
            }));

            res.status(200).json(enrichedHistory);
        } catch (error) {
            console.error('🔥 [CASH ERROR] getHistory:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 6. Eliminar un reporte de cierre de caja (DELETE /api/cash-sessions/:id)
    deleteSession: async (req, res) => {
        try {
            const orgId = cashSessionController.getOrgId(req);
            const { id } = req.params;

            // Verificar que existe y pertenece a la organización
            const { data: sessionToDelete, error: findError } = await supabaseAdmin
                .from('cash_sessions')
                .select('*')
                .eq('id', id)
                .eq('organization_id', orgId)
                .maybeSingle();

            if (findError) throw findError;

            if (!sessionToDelete) {
                return res.status(404).json({ error: 'La sesión de caja no existe o no pertenece a su organización.' });
            }

            // Eliminar
            const { error: deleteError } = await supabaseAdmin
                .from('cash_sessions')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;

            // Log de auditoría (Seguro contra fallos de DB/esquema)
            try {
                await supabaseAdmin.from('system_logs').insert([{
                    level: 'warning',
                    module: 'cash_register',
                    user_id: req.user.id,
                    organization_id: orgId,
                    message: `Reporte de cierre de caja (Fecha: ${new Date(sessionToDelete.closing_time || '').toLocaleDateString()}, Base: $${sessionToDelete.opening_balance.toLocaleString()}) ELIMINADO por ${req.user.full_name || 'Admin'}`
                }]);
            } catch (logError) {
                console.error('⚠️ [CASH LOG ERROR] Falló al registrar log de eliminación:', logError.message);
            }

            res.status(200).json({ success: true, message: 'Reporte de cierre de caja eliminado correctamente.' });
        } catch (error) {
            console.error('🔥 [CASH ERROR] deleteSession:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 5. Daemon de Autocierre a las 11:59 PM o sesión vencida de días anteriores
    executeAutoCloseDaemon: async () => {
        try {
            console.log('⏰ Running Cash Register Autocierre Daemon...');
            
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            // Buscar todas las sesiones abiertas
            const { data: openSessions, error } = await supabaseAdmin
                .from('cash_sessions')
                .select('*')
                .eq('status', 'open');

            if (error) throw error;
            if (!openSessions || openSessions.length === 0) return;

            for (const s of openSessions) {
                const openDateStr = s.opening_time.split('T')[0];
                const isPreviousDay = openDateStr < todayStr;
                const isLateNight = now.getHours() === 23 && now.getMinutes() >= 59;

                if (isPreviousDay || isLateNight) {
                    console.log(`⚠️ Auto-cerrando sesión vencida ID ${s.id} (Org: ${s.organization_id})`);
                    
                    const closingTime = isPreviousDay 
                        ? `${openDateStr}T23:59:00.000Z`
                        : `${todayStr}T23:59:00.000Z`;

                    const metrics = await cashSessionController.calculateMetrics(s.organization_id, s.opening_time, closingTime);
                    const base = s.opening_balance;
                    const expected = base + metrics.sales_cash - metrics.total_expenses;

                    const { error: updateError } = await supabaseAdmin
                        .from('cash_sessions')
                        .update({
                            status: 'closed',
                            closing_time: closingTime,
                            sales_cash: metrics.sales_cash,
                            sales_other: metrics.sales_other,
                            total_expenses: metrics.total_expenses,
                            expected_cash: expected,
                            actual_cash: expected,
                            difference: 0,
                            notes: 'Sesión clausurada automáticamente por el daemon del sistema (11:59 PM).',
                            auto_closed: true
                        })
                        .eq('id', s.id);

                    if (updateError) {
                        console.error(`🔥 Error auto-cerrando sesión ${s.id}:`, updateError.message);
                    }

                    // Log de auditoría (Seguro contra fallos de DB/esquema)
                    try {
                        await supabaseAdmin.from('system_logs').insert([{
                            level: 'info',
                            module: 'cash_register',
                            organization_id: s.organization_id,
                            message: `Cierre de Caja AUTOMÁTICO (Daemon). Esperado: $${expected.toLocaleString()} | La caja quedó de un día anterior.`
                        }]);
                    } catch (logError) {
                        console.error('⚠️ [CASH LOG ERROR] Falló al registrar log de autocierre daemon:', logError.message);
                    }
                }
            }

            console.log('✅ Daemon de autocierre completado.');
        } catch (error) {
            console.error('🔥 Error en Daemon de Autocierre de Cajas:', error.message);
        }
    }
};

module.exports = cashSessionController;
