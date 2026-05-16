const { supabaseAdmin } = require('../config/supabase');
const { checkPlanLimit } = require('../middleware/planLimits');

const suppliersController = {
  // GET /api/suppliers
  getAllSuppliers: async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('suppliers')
        .select('*')
        .eq('organization_id', req.user.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ error: 'Error al obtener proveedores' });
    }
  },

  // POST /api/suppliers
  createSupplier: async (req, res) => {
    try {
      const orgId = req.user.organization_id;

      // ── PLAN LIMIT CHECK: SUPPLIERS ─────────────────────────────────────
      const limitCheck = await checkPlanLimit(orgId, 'suppliers');
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.message });
      }

      const { company_name, contact_name, tax_id, email, phone, address, notes } = req.body;

      const { data, error } = await supabaseAdmin
        .from('suppliers')
        .insert([{
          organization_id: orgId,
          company_name,
          contact_name,
          tax_id,
          email,
          phone,
          address,
          notes
        }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(data);
    } catch (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({ error: 'Error al crear proveedor' });
    }
  },

  // PATCH /api/suppliers/:id
  updateSupplier: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabaseAdmin
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', req.user.organization_id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ error: 'Error al actualizar proveedor' });
    }
  },

  // DELETE /api/suppliers/:id
  deleteSupplier: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabaseAdmin
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('organization_id', req.user.organization_id);

      if (error) throw error;
      res.json({ message: 'Proveedor eliminado' });
    } catch (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({ error: 'Error al eliminar proveedor' });
    }
  }
};

module.exports = suppliersController;
