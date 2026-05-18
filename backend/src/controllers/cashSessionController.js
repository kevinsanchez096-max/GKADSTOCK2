const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'cash_sessions.json');

// Flag global de control para evitar ejecuciones concurrentes del daemon de autocierre
let isAutoCloseRunning = false;

// Inicializar archivo de datos de forma segura
function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf8');
    }
}

function readSessions() {
    ensureDataFile();
    try {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(content || '[]');
    } catch (error) {
        console.error('Error leyendo sesiones de caja:', error);
        return [];
    }
}

function writeSessions(sessions) {
    ensureDataFile();
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2), 'utf8');
    } catch (error) {
        console.error('Error escribiendo sesiones de caja:', error);
    }
}

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
            // Autocierre Pasivo Secuencial: valida y cierra cajas del día anterior antes de consultar el estado
            await cashSessionController.executeAutoCloseDaemon().catch(err => {
                console.error('⚠️ [CASH LAZY AUTOCLOSE ERROR]:', err.message);
            });

            const orgId = cashSessionController.getOrgId(req);
            const sessions = readSessions();
            
            // Buscar sesión activa ('open') de la organización
            const active = sessions.find(s => s.organization_id === orgId && s.status === 'open');
            
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

            const sessions = readSessions();
            
            // Verificar que no haya otra abierta
            const hasActive = sessions.some(s => s.organization_id === orgId && s.status === 'open');
            if (hasActive) {
                return res.status(400).json({ error: 'Ya existe una sesión de caja activa abierta para esta organización.' });
            }

            const newSession = {
                id: require('crypto').randomUUID(),
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

            sessions.push(newSession);
            writeSessions(sessions);

            // Log de auditoría (Seguro contra fallos de DB/esquema)
            try {
                await supabaseAdmin.from('system_logs').insert([{
                    level: 'info',
                    module: 'cash_register',
                    user_id: req.user.id,
                    organization_id: orgId,
                    message: `Caja ABIERTA por ${newSession.user_name} con base de $${newSession.opening_balance.toLocaleString()}`
                }]);
            } catch (logError) {
                console.error('⚠️ [CASH LOG ERROR] Falló al registrar log de apertura:', logError.message);
            }

            res.status(201).json({ success: true, session: newSession });
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

            const sessions = readSessions();
            const activeIndex = sessions.findIndex(s => s.organization_id === orgId && s.status === 'open');

            if (activeIndex === -1) {
                return res.status(400).json({ error: 'No existe ninguna sesión de caja activa para cerrar.' });
            }

            const active = sessions[activeIndex];
            const closingTime = new Date().toISOString();

            // Calcular métricas consolidadas finales de la sesión
            const metrics = await cashSessionController.calculateMetrics(orgId, active.opening_time, closingTime);
            
            const base = active.opening_balance;
            const expected = base + metrics.sales_cash - metrics.total_expenses;
            const diff = Number(actual_cash) - expected;

            const closedSession = {
                ...active,
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

            sessions[activeIndex] = closedSession;
            writeSessions(sessions);

            // Log de auditoría (Seguro contra fallos de DB/esquema)
            const diffMsg = diff === 0 ? 'Caja cuadradra perfectamente' : diff > 0 ? `SOBRANTE de $${diff.toLocaleString()}` : `FALTANTE de $${Math.abs(diff).toLocaleString()}`;
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
            const sessions = readSessions();
            
            // Filtrar las cerradas de esta organización ordenadas de más reciente a más antigua
            const history = sessions
                .filter(s => s.organization_id === orgId && s.status === 'closed')
                .sort((a, b) => new Date(b.closing_time) - new Date(a.closing_time));

            // Enriquecer dinámicamente el nombre real del cajero si está como "Cajero" o para asegurar
            const userIds = [...new Set(history.map(s => s.user_id).filter(Boolean))];
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

            const enrichedHistory = history.map(s => ({
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
            const sessions = readSessions();

            const sessionIndex = sessions.findIndex(s => s.id === id);
            if (sessionIndex === -1) {
                return res.status(404).json({ error: 'La sesión de caja no existe.' });
            }

            const sessionToDelete = sessions[sessionIndex];

            // Si el usuario no es super_admin, verificar que la sesión pertenezca a su organización
            if (req.user.role !== 'super_admin' && sessionToDelete.organization_id !== orgId) {
                return res.status(403).json({ error: 'No tiene permisos para eliminar esta sesión de caja.' });
            }
            
            // Eliminar de la lista
            sessions.splice(sessionIndex, 1);
            writeSessions(sessions);

            // Log de auditoría (Seguro contra fallos de DB/esquema)
            try {
                await supabaseAdmin.from('system_logs').insert([{
                    level: 'warning',
                    module: 'cash_register',
                    user_id: req.user.id,
                    organization_id: sessionToDelete.organization_id,
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
        if (isAutoCloseRunning) {
            console.log('Daemon ya en ejecución. Omitiendo.');
            return;
        }
        isAutoCloseRunning = true;

        try {
            console.log('⏰ Running Cash Register Autocierre Daemon...');
            const sessions = readSessions();
            let modified = false;

            const now = new Date();
            
            // Helper para obtener la fecha local de Colombia en formato YYYY-MM-DD
            const getColombiaDateString = (d) => {
                try {
                    return d.toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' });
                } catch (e) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            };

            // Helper para obtener la hora y minutos en la zona horaria de Colombia
            const getColombiaHoursAndMinutes = (d) => {
                try {
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: 'America/Bogota',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: false
                    });
                    const parts = formatter.formatToParts(d);
                    const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
                    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
                    return { hour, minute };
                } catch (e) {
                    return { hour: d.getHours(), minute: d.getMinutes() };
                }
            };

            const todayStr = getColombiaDateString(now);
            const { hour, minute } = getColombiaHoursAndMinutes(now);

            for (let i = 0; i < sessions.length; i++) {
                const s = sessions[i];
                if (s.status !== 'open') continue;

                // Comparar usando fechas locales de Colombia para evitar desfases de zona horaria (UTC vs Colombia GMT-5)
                const openDate = new Date(s.opening_time);
                const ageMs = now.getTime() - openDate.getTime();
                if (ageMs < 10 * 60 * 1000) continue;

                const openDateStr = getColombiaDateString(openDate);
                const isPreviousDay = openDateStr < todayStr;
                
                // Si la hora en Colombia es las 11:59 PM (23:59) o posterior
                const isLateNight = hour === 23 && minute >= 59;

                if (isPreviousDay || isLateNight) {
                    console.log(`⚠️ Auto-cerrando sesión vencida ID ${s.id} (Org: ${s.organization_id})`);
                    
                    // Definir tiempo de cierre: 23:59:00 en el horario local de Colombia
                    const closingTime = `${isPreviousDay ? openDateStr : todayStr}T23:59:00-05:00`;

                    const metrics = await cashSessionController.calculateMetrics(s.organization_id, s.opening_time, closingTime);
                    const base = s.opening_balance;
                    const expected = base + metrics.sales_cash - metrics.total_expenses;

                    sessions[i] = {
                        ...s,
                        status: 'closed',
                        closing_time: closingTime,
                        sales_cash: metrics.sales_cash,
                        sales_other: metrics.sales_other,
                        total_expenses: metrics.total_expenses,
                        expected_cash: expected,
                        actual_cash: expected, // En autocierre asumimos cuadrado
                        difference: 0,
                        notes: 'Sesión clausurada automáticamente por el daemon del sistema (11:59 PM).',
                        auto_closed: true
                    };

                    modified = true;

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

            if (modified) {
                writeSessions(sessions);
                console.log('✅ Base de cajas actualizada con los autocierres.');
            }
        } catch (error) {
            console.error('🔥 Error en Daemon de Autocierre de Cajas:', error.message);
        } finally {
            isAutoCloseRunning = false;
        }
    }
};

module.exports = cashSessionController;
