const { supabaseAdmin } = require('../config/supabase');

/**
 * CONTROLADOR DASHBOARD: Análisis de Datos y KPIs
 */
const dashboardController = {
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

    // 1. Obtener KPIs (FILTRADOS Y ROBUSTOS)
    getKPIs: async (req, res) => {
        try {
            const orgId = dashboardController.getOrgId(req);
            console.log(`[DASHBOARD] Calculando KPIs para Org: ${orgId}`);

            const [products, expenses, sales, lowStock, categories, saleItems] = await Promise.all([
                supabaseAdmin.from('products').select('stock, cost_price, price').eq('organization_id', orgId),
                supabaseAdmin.from('expenses').select('amount').eq('organization_id', orgId),
                supabaseAdmin.from('sales').select('total').eq('organization_id', orgId),
                supabaseAdmin.from('products').select('*', { count: 'exact' }).eq('organization_id', orgId).lt('stock', 5),
                supabaseAdmin.from('categories').select('*', { count: 'exact' }).eq('organization_id', orgId),
                supabaseAdmin.from('sale_items').select('quantity, products!inner(cost_price)').eq('products.organization_id', orgId)
            ]);

            const totalInventoryValue = products.data?.reduce((acc, p) => acc + (p.stock * (p.cost_price || 0)), 0) || 0;
            const totalProductsCount = products.data?.length || 0;
            const totalSales = sales.data?.reduce((acc, s) => acc + Number(s.total), 0) || 0;
            const totalExpenses = expenses.data?.reduce((acc, e) => acc + Number(e.amount), 0) || 0;
            const totalCost = saleItems.data?.reduce((acc, item) => acc + (item.quantity * (item.products?.cost_price || 0)), 0) || 0;

            res.status(200).json({
                totalProducts: totalProductsCount,
                inventoryValue: totalInventoryValue,
                activeCategories: categories.count || 0,
                lowStockCount: lowStock.count || 0,
                totalSales,
                totalExpenses,
                netUtility: (totalSales - totalCost) - totalExpenses
            });

        } catch (error) {
            console.error('🔥 [DASHBOARD ERROR] getKPIs:', error.message);
            res.status(500).json({ error: error.message || 'Error al calcular métricas' });
        }
    },

    // 2. Obtener Ranking de Productos (FILTRADO)
    getBestsellers: async (req, res) => {
        try {
            const orgId = dashboardController.getOrgId(req);

            const { data: salesItems, error } = await supabaseAdmin
                .from('sale_items')
                .select(`
                    quantity,
                    products!inner(name, organization_id)
                `)
                .eq('products.organization_id', orgId);

            if (error) throw error;

            const ranking = salesItems.reduce((acc, item) => {
                const name = item.products.name;
                acc[name] = (acc[name] || 0) + item.quantity;
                return acc;
            }, {});

            const sortedRanking = Object.entries(ranking)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, quantity]) => ({ name, quantity }));

            res.status(200).json(sortedRanking);

        } catch (error) {
            console.error('🔥 [DASHBOARD ERROR] getBestsellers:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = dashboardController;
