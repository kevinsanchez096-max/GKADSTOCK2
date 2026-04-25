const { supabaseAdmin } = require('../config/supabase');
const supabase = require('../lib/supabase');

const inventoryController = {
  // Helper para obtener el ID de organización con validación estricta (Zero-Trust)
  getOrgId: (req) => {
    const user = req.user;
    if (!user) throw new Error('Usuario no autenticado en el contexto');

    // ── SEGURIDAD MULTI-TENANT ──────────────────────────────────────────────
    // Los usuarios normales (admin, cashier, etc.) SIEMPRE usan el org_id
    // de su JWT. Nunca se acepta un org_id externo para evitar fugas cross-tenant.
    // SOLO el super_admin puede consultar otra organización explícitamente.
    // ────────────────────────────────────────────────────────────────────────
    if (user.role === 'super_admin') {
      const explicitId = req.query.organization_id || req.body.organization_id;
      if (explicitId && explicitId !== user.organization_id) {
        // Auditar acceso cross-tenant del super_admin
        console.warn(`[SECURITY] Super Admin ${user.email} accediendo a org externa: ${explicitId}`);
        return explicitId;
      }
      return user.organization_id;
    }

    // Usuarios normales: FORZAR el org_id del JWT — ignorar cualquier param externo
    if (!user.organization_id) {
      throw new Error('Su usuario no tiene una organización vinculada. Contacte soporte.');
    }

    // Detección de intento de suplantación de organización
    const requestedOrgId = req.query.organization_id || req.body.organization_id;
    if (requestedOrgId && requestedOrgId !== user.organization_id) {
      console.error(`[SECURITY ALERT] 🚨 Intento de acceso cross-tenant detectado! User: ${user.email} (Org: ${user.organization_id}) intentó acceder a Org: ${requestedOrgId}. BLOQUEADO.`);
      // Se ignora el parámetro externo y se usa el del JWT (no se lanza error para no revelar la tabla)
    }

    return user.organization_id;
  },

  // 1. Obtener todos los productos (FILTRADO)
  getAllProducts: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      console.log(`[INVENTORY] Listando productos para Org: ${orgId}`);

      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;
      res.status(200).json(data || []);
    } catch (error) {
      console.error('🔥 [INVENTORY ERROR] getAllProducts:', error.message);
      res.status(500).json({ error: error.message || 'Error al recuperar inventario' });
    }
  },

  // 2. Crear un producto (INSERCIÓN INMUTABLE)
    createProduct: async (req, res) => {
      try {
        const orgId = inventoryController.getOrgId(req);
        const { name, sku, category_id, price, stock, unit, min_stock, barcode, is_weighted } = req.body;
        
        const { data, error } = await supabaseAdmin
          .from('products')
          .insert([{ 
            name, 
            sku, 
            category_id, 
            price, 
            stock, 
            unit: is_weighted ? 'kg' : (unit || 'unid'), 
            min_stock, 
            barcode,
            is_weighted: !!is_weighted,
            organization_id: orgId 
          }])
        .select()
        .single();

      if (error) throw error;

      // 3. REGISTRO AUTOMÁTICO EN KARDEX (Si nace con stock > 0)
      if (Number(stock) > 0) {
        console.log(`[KARDEX] Registrando carga inicial de ${stock} unidades para: ${name}`);
        await supabase
          .from('inventory_movements')
          .insert([{
            organization_id: orgId,
            product_id: data.id,
            product_name: name, // Audit Forever
            quantity_added: Number(stock),
            movement_type: 'IN'
          }]);
      }

      res.status(201).json(data);
    } catch (error) {
      console.error('🔥 [INVENTORY ERROR] createProduct:', error.message);
      res.status(500).json({ error: error.message });
    }
  },

  // 3. Alertas de stock bajo
  getLowStockAlerts: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('organization_id', orgId)
        .lt('stock', 10); 

      if (error) throw error;
      res.status(200).json(data || []);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  
  // 4. Obtener categorías (FILTRADO)
  getCategories: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      console.log(`[INVENTORY] Listando categorías para Org: ${orgId}`);

      const { data, error } = await supabaseAdmin
        .from('categories')
        .select('*')
        .eq('organization_id', orgId)
        .order('name', { ascending: true });

      if (error) throw error;
      res.status(200).json(data || []);
    } catch (error) {
      console.error('🔥 [INVENTORY ERROR] getCategories:', error.message);
      res.status(500).json({ error: error.message || 'Error al recuperar categorías' });
    }
  },

  // 5. Crear una categoría
  createCategory: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      const { name } = req.body;

      if (!name) return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });

      // 1. Verificación manual de duplicados para devolver error amigable
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('organization_id', orgId)
        .ilike('name', name.trim())
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: `La categoría '${name}' ya existe para su organización.` });
      }
      
      // 2. Inserción Blindada
      const { data, error } = await supabaseAdmin
        .from('categories')
        .insert([{ 
           name: name.trim(), 
           organization_id: orgId 
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);

    } catch (error) {
      console.error('🔥 [CATEGORÍA ERROR]:', error.message);
      res.status(500).json({ error: error.message || 'Error al procesar la categoría' });
    }
  },

  updateCategory: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      const { id } = req.params;
      const { name } = req.body;

      // 1. Verificación manual de duplicados para devolver error amigable
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('organization_id', orgId)
        .ilike('name', name.trim())
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ error: `La categoría '${name}' ya existe para su organización.` });
      }

      const { data, error } = await supabaseAdmin
        .from('categories')
        .update({ name: name.trim() })
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();
        
      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('🔥 [CATEGORÍA UPDATE ERROR]:', error.message);
      res.status(500).json({ error: error.message || 'Error al actualizar la categoría' });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      const { id } = req.params;

      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId);

      if (error) {
        if (error.code === '23503') {
           return res.status(400).json({ error: 'No se puede eliminar. Hay productos vinculados a esta categoría.' });
        }
        throw error;
      }
      
      res.json({ message: 'Categoría eliminada' });
    } catch (error) {
      console.error('🔥 [CATEGORÍA DELETE ERROR]:', error.message);
      res.status(500).json({ error: error.message || 'Error al eliminar la categoría' });
    }
  },

  // 6. Actualizar un producto (PATCH/PUT) + TRAZABILIDAD KARDEX
  updateProduct: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      const { id } = req.params;
      const { name, sku, category_id, price, stock, unit, min_stock, barcode, is_weighted } = req.body;

      // 1. Obtener estado previo para el Kardex
      const { data: existing, error: fetchError } = await supabase
        .from('products')
        .select('id, stock, name')
        .eq('id', id)
        .eq('organization_id', orgId)
        .single();

      if (fetchError || !existing) {
        return res.status(404).json({ error: 'Producto no encontrado o no autorizado' });
      }

      const prevStock = Number(existing.stock || 0);
      const newStockValue = Number(stock);
      const isStockIncrease = newStockValue > prevStock;

      // 2. Ejecutar Update del producto
      const { data, error } = await supabaseAdmin
        .from('products')
        .update({
          name, 
          sku, 
          category_id, 
          price, 
          stock: newStockValue, 
          unit: is_weighted ? 'kg' : (unit || 'unid'), 
          min_stock, 
          barcode,
          is_weighted: !!is_weighted
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 3. REGISTRO AUTOMÁTICO EN KARDEX (Si hubo ingreso de mercancía)
      if (isStockIncrease) {
        const diff = newStockValue - prevStock;
        console.log(`[KARDEX] Registrando ingreso de ${diff} unidades para: ${existing.name}`);
        
        await supabase
          .from('inventory_movements')
          .insert([{
            organization_id: orgId,
            product_id: id,
            product_name: existing.name, // Persistencia Audit Forever
            quantity_added: diff,
            movement_type: 'IN'
          }]);
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('🔥 [INVENTORY ERROR] updateProduct:', error.message);
      res.status(500).json({ error: error.message });
    }
  },

  // 8. Obtener Movimientos de Inventario (KARDEX)
  getInventoryMovements: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      const { date } = req.query; // Formato YYYY-MM-DD
      
      let query = supabase
        .from('inventory_movements')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (date) {
        // Filtrar por fecha exacta usando cast a DATE de Postgres para mayor robustez
        query = query.filter('created_at', 'gte', `${date}T00:00:00.000Z`)
                     .filter('created_at', 'lte', `${date}T23:59:59.999Z`);
      }

      const { data, error } = await query;
      if (error) throw error;

      res.status(200).json(data || []);
    } catch (error) {
      console.error('🔥 [KARDEX ERROR] getMovements:', error.message);
      res.status(500).json({ error: error.message || 'Error al recuperar auditoría' });
    }
  },

  // 7. Eliminar un producto (FÍSICO)
  deleteProduct: async (req, res) => {
    try {
      const orgId = inventoryController.getOrgId(req);
      const { id } = req.params;

      const { data, error } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', id)
        .eq('organization_id', orgId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Producto no encontrado o no redirigido' });
      }

      res.status(200).json({ success: true, message: 'Producto eliminado correctamente' });
    } catch (error) {
      console.error('🔥 [INVENTORY ERROR] deleteProduct:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = inventoryController;
