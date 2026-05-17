const { supabaseAdmin } = require('../config/supabase');
const fs = require('fs');
const path = require('path');

/**
 * CONTROLADOR DE VENTAS (POS): Facturación Atómica e Inventario
 */
const salesController = {
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

    // 1. Procesar una Nueva Venta (POST /api/sales/process)
    processNewSale: async (req, res) => {
        let createdSaleId = null;
        try {
            const { items, saleData } = req.body;
            const orgId = salesController.getOrgId(req);
            const userId = req.user.id;

            if (!items || items.length === 0) {
                return res.status(400).json({ error: 'La venta no tiene ítems' });
            }

            // --- VALIDACIÓN DE CAJA ACTIVA ---
            const sessionsPath = path.join(__dirname, '../../data/cash_sessions.json');
            let hasActiveSession = false;
            try {
                if (fs.existsSync(sessionsPath)) {
                    const sessionsContent = fs.readFileSync(sessionsPath, 'utf8');
                    const sessions = JSON.parse(sessionsContent || '[]');
                    hasActiveSession = sessions.some(s => s.organization_id === orgId && s.status === 'open');
                }
            } catch (fsErr) {
                console.error('Error al leer sesiones en validación de venta:', fsErr);
            }

            if (!hasActiveSession) {
                return res.status(400).json({ error: 'Operación denegada. Debe abrir la caja (sesión de caja activa) antes de registrar cualquier venta.' });
            }

            console.log(`🚀 [FACTURACIÓN] Iniciando transacción POS en Node.js (Org: ${orgId})`);
            
            // --- VALIDACIÓN DE STOCK CERO (Pre-flight check) ---
            const productIds = items.map(i => i.product_id);
            const { data: dbProducts, error: dbError } = await supabaseAdmin
                .from('products')
                .select('id, name, stock')
                .in('id', productIds)
                .eq('organization_id', orgId);

            if (dbError) throw dbError;

            // Mapeamos temporalmente el stock disponible para verificar
            const stockMap = {};
            dbProducts.forEach(p => stockMap[p.id] = p);

            for (const item of items) {
                const dbProduct = stockMap[item.product_id];
                if (!dbProduct) {
                    return res.status(400).json({ error: 'Producto no encontrado o no pertenece a su organización.' });
                }
                if (dbProduct.stock < item.quantity) {
                    console.warn(`[STOCK INSUFICIENTE] Prod: ${dbProduct.name} (Req: ${item.quantity}, Hay: ${dbProduct.stock})`);
                    return res.status(400).json({ error: `Stock insuficiente para el producto: ${dbProduct.name}` });
                }
            }

            // --- PASO A: CREAR HEAD DE VENTA ---
            // Enviamos únicamente columnas certificadas por el esquema base de Supabase
            const newSale = {
                organization_id: orgId,
                user_id: req.user?.id || saleData.user_id,
                total: saleData.total,
                payment_method: saleData.payment_method
                // Se ocultan discount, amount_received, etc. para evitar Cache/Schema Errors de PostgREST
            };

            const { data: saleHead, error: saleError } = await supabaseAdmin
                .from('sales')
                .insert([newSale])
                .select()
                .single();

            if (saleError) throw saleError;
            createdSaleId = saleHead.id;

            // --- PASO B: INSERTAR SALE_ITEMS ---
            // Data Sanitization Estricta
            const saleItems = items.map(item => ({
                sale_id: createdSaleId,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price, // Filtrado estricto al esquema real de tabla 'sale_items'
                subtotal: item.quantity * item.price, // Obligatorio por RLS / DB Schema
                organization_id: orgId // Bypass estricto de seguridad RLS
            }));

            const { error: itemsError } = await supabaseAdmin
                .from('sale_items')
                .insert(saleItems);

            if (itemsError) throw itemsError;

            // --- PASO C: ACTUALIZAR INVENTARIO Y REGISTRAR KARDEX ---
            const kardexMovements = [];

            // Iteramos las descargas de inventario
            for (const item of items) {
                const dbProduct = stockMap[item.product_id];
                const currentStock = dbProduct.stock;
                const newStock = currentStock - item.quantity;

                const { error: updateError } = await supabaseAdmin
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', item.product_id)
                    .eq('organization_id', orgId);

                if (updateError) throw updateError;

                kardexMovements.push({
                    organization_id: orgId,
                    product_id: item.product_id,
                    product_name: dbProduct.name, // Tracking inmutable
                    quantity_added: item.quantity, // En positivo (la dirección la dictamina el string 'OUT')
                    movement_type: 'OUT' // <-- CUMPLE RESTRICCIÓN RLS
                    // Removidos reference_id y user_id porque la tabla inventory_movements actual no tiene esas columnas.
                });
            }

            if (kardexMovements.length > 0) {
                const { error: kardexError } = await supabaseAdmin
                    .from('inventory_movements')
                    .insert(kardexMovements);
                
                if (kardexError) {
                    console.error('🔥 [KARDEX ERROR NO-FATAL]:', kardexError);
                    // Decidimos no abortar la venta si solo falla el tracking estadístico, 
                    // aunque en un sistema estricto debería lanzarse 'throw kardexError'.
                    throw kardexError;
                }
            }

            // [EXITO TRANSACCIONAL]
            console.log(`✅ [VENTA EXITOSA] Factura: ${createdSaleId} consolidada.`);

            // Notificación: Venta de Alto Valor
            if (saleData.total >= 500000) {
                const { sendSystemNotification } = require('../utils/notificationService');
                sendSystemNotification('HIGH_VALUE_SALE', 'Venta de Alto Valor', `Se ha registrado una venta de $${saleData.total.toLocaleString()} en la organización ${orgId}.`, { sale_id: createdSaleId, total: saleData.total, org_id: orgId });
            }

            res.status(201).json({ 
                success: true, 
                message: 'Venta registrada con éxito', 
                sale_id: createdSaleId 
            });

        } catch (error) {
            console.error('🔥 [SALES ERROR] processNewSale:', error.message);
            // --- ROLLBACK DE EMERGENCIA ---
            if (createdSaleId) {
                console.warn(`[ROLLBACK] Reviertiendo cabeza de venta: ${createdSaleId}`);
                await supabaseAdmin.from('sales').delete().eq('id', createdSaleId);
                // (Debido al `ON DELETE CASCADE` de FK, eliminar sales eliminará los sale_items automáticamente)
            }

            res.status(500).json({ error: error.message || 'Error al procesar la venta en Node.' });
        }
    },

    // 2. Obtener Historial de Ventas (FILTRADO)
    getSalesHistory: async (req, res) => {
        try {
            const orgId = salesController.getOrgId(req);
            const limit = parseInt(req.query.limit) || 50; 
            console.log(`[SALES] Listando historial para Org: ${orgId} | Límite: ${limit}`);

            const { data, error } = await supabaseAdmin
                .from('sales')
                .select(`
                    *,
                    profiles (full_name),
                    sale_items (
                        quantity,
                        products (cost_price)
                    )
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;
            
            const enrichedData = (data || []).map(sale => {
                const total_cost = sale.sale_items?.reduce((acc, item) => {
                    const cp = item.products?.cost_price || 0;
                    return acc + (item.quantity * cp);
                }, 0) || 0;
                
                const { sale_items, ...rest } = sale;
                return {
                    ...rest,
                    total_cost
                };
            });
            
            res.status(200).json(enrichedData);
        } catch (error) {
            console.error('🔥 [SALES ERROR] getSalesHistory:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 3. Obtener Detalle de una Venta (FILTRADO Y VERIFICADO)
    getSaleDetail: async (req, res) => {
        try {
            const { saleId } = req.params;
            const orgId = salesController.getOrgId(req);

            const { data: sale, error: saleError } = await supabaseAdmin
                .from('sales')
                .select('organization_id')
                .eq('id', saleId)
                .maybeSingle();

            if (saleError || !sale || sale.organization_id !== orgId) {
                return res.status(403).json({ error: 'No tienes permiso para ver esta venta o no existe' });
            }

            const { data, error } = await supabaseAdmin
                .from('sale_items')
                .select(`
                    *,
                    products (name, sku)
                `)
                .eq('sale_id', saleId);

            if (error) throw error;
            res.status(200).json(data || []);
        } catch (error) {
            console.error('🔥 [SALES ERROR] getSaleDetail:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 4. Arqueo de Caja (FILTRADO)
    getDailyClosing: async (req, res) => {
        try {
            const orgId = salesController.getOrgId(req);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            console.log(`[SALES] Generando arqueo para Org: ${orgId}`);

            const [salesResponse, expensesResponse] = await Promise.all([
                supabaseAdmin.from('sales')
                    .select('total, payment_method')
                    .eq('organization_id', orgId)
                    .gte('created_at', today.toISOString()),
                supabaseAdmin.from('expenses')
                    .select('amount')
                    .eq('organization_id', orgId)
                    .gte('created_at', today.toISOString())
            ]);

            if (salesResponse.error) throw salesResponse.error;
            if (expensesResponse.error) throw expensesResponse.error;

            const totalsByMethod = salesResponse.data.reduce((acc, sale) => {
                const method = sale.payment_method || 'other';
                acc[method] = (acc[method] || 0) + Number(sale.total);
                return acc;
            }, {});

            const totalSales = salesResponse.data.reduce((acc, s) => acc + Number(s.total), 0);
            const totalExpenses = expensesResponse.data.reduce((acc, e) => acc + Number(e.amount), 0);

            res.status(200).json({
                date: today.toISOString().split('T')[0],
                totalsByMethod,
                totalSales,
                totalExpenses,
                balance: totalSales - totalExpenses
            });

        } catch (error) {
            console.error('🔥 [SALES ERROR] getDailyClosing:', error.message);
            res.status(500).json({ error: error.message });
        }
    },

    // 5. Procesar Devolución (Logística Inversa)
    processSaleReturn: async (req, res) => {
        try {
            const { saleId } = req.params;
            const { itemsToReturn } = req.body; // Array de { product_id, quantity }
            const orgId = salesController.getOrgId(req);

            console.log(`🚀 [DEVOLUCIÓN] Iniciando retorno para Factura: ${saleId} | Org: ${orgId}`);

            // 1. Verificar existencia y propiedad de la venta
            const { data: sale, error: saleError } = await supabaseAdmin
                .from('sales')
                .select('*')
                .eq('id', saleId)
                .eq('organization_id', orgId)
                .single();

            if (saleError || !sale) {
                return res.status(404).json({ error: 'Venta no encontrada o acceso denegado' });
            }

            // 2. Procesar Devolución de Stock (Kardex Reverso)
            for (const item of itemsToReturn) {
                const qty = Number(item.quantity);
                if (qty <= 0) continue;

                console.log(`📦 [RESTOCK] Producto: ${item.product_id} | Cantidad: ${qty}`);

                // A. Incrementar Stock Físico
                // Usamos una operación de incremento directa para evitar condiciones de carrera (RPC)
                const { error: stockError } = await supabaseAdmin.rpc('increment_stock', {
                    p_product_id: item.product_id,
                    p_quantity: qty
                });

                if (stockError) {
                    // Si el RPC falla, intentamos update tradicional como fallback
                    console.warn(`⚠️ [FALLO RPC] Usando fallback update para stock: ${item.product_id}`);
                    const { data: currentProd } = await supabaseAdmin
                        .from('products')
                        .select('stock, name')
                        .eq('id', item.product_id)
                        .single();
                    
                    if (currentProd) {
                        await supabaseAdmin
                            .from('products')
                            .update({ stock: Number(currentProd.stock) + qty })
                            .eq('id', item.product_id);

                        // Registro en Kardex (Manual Fallback)
                        await supabaseAdmin
                            .from('inventory_movements')
                            .insert([{
                                organization_id: orgId,
                                product_id: item.product_id,
                                product_name: currentProd.name,
                                quantity_added: qty,
                                movement_type: 'RETURN'
                            }]);
                    }
                }
            }

            // 3. Actualizar Estado de la Venta
            // Determinamos si es total o parcial (lógica simplificada por ahora)
            const isTotalReturn = itemsToReturn.length >= (sale.items_count || 1); 
            const newStatus = isTotalReturn ? 'returned' : 'partially_returned';

            const { error: updateError } = await supabaseAdmin
                .from('sales')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', saleId);

            if (updateError) throw updateError;

            res.status(200).json({ 
                success: true, 
                message: `Devolución procesada como ${newStatus}`,
                status: newStatus 
            });

        } catch (error) {
            console.error('🔥 [RETURN ERROR]:', error.message);
            res.status(500).json({ error: error.message });
        }
    }
};

module.exports = salesController;
