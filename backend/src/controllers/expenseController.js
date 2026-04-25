const { supabaseAdmin } = require('../config/supabase');

/**
 * CONTROLADOR DE GASTOS: Registro de Egresos y Auditoría
 */
const expenseController = {
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

    // 1. Crear un Gasto (POST /api/expenses - INSERCIÓN INMUTABLE)
    createExpense: async (req, res) => {
        try {
            const { description, category, amount } = req.body;
            const orgId = expenseController.getOrgId(req);
            const userId = req.user.id;

            if (!description || !category || !amount) {
                return res.status(400).json({ error: 'Faltan datos obligatorios (Descripción, Categoría o Monto)' });
            }

            const { data: expense, error } = await supabaseAdmin
                .from('expenses')
                .insert([{ 
                    organization_id: orgId, 
                    user_id: userId, 
                    description, 
                    category, 
                    amount 
                }])
                .select()
                .single();

            if (error) throw error;

            await supabaseAdmin.from('system_logs').insert([{
                level: 'info',
                module: 'finances',
                user_id: userId,
                organization_id: orgId,
                message: `Registro de Gasto: ${category} - ${description} ($${amount})`,
                details: { expense_id: expense.id, category, amount }
            }]);

            res.status(201).json({ success: true, data: expense });
        } catch (error) {
            console.error('🔥 [EXPENSES ERROR] createExpense:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 2. Obtener Gastos (GET /api/expenses - FILTRADO)
    getExpenses: async (req, res) => {
        try {
            const orgId = expenseController.getOrgId(req);
            console.log(`[EXPENSES] Listando egresos para Org: ${orgId}`);

            const { data, error } = await supabaseAdmin
                .from('expenses')
                .select(`
                    *,
                    profiles:user_id (full_name)
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            res.status(200).json(data || []);
        } catch (error) {
            console.error('🔥 [EXPENSES ERROR] getExpenses:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = expenseController;
