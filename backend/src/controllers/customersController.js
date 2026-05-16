const { supabaseAdmin } = require('../config/supabase');
const { checkPlanLimit } = require('../middleware/planLimits');

const customersController = {
  // GET /api/customers
  getAllCustomers: async (req, res) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('organization_id', req.user.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Error al obtener clientes' });
    }
  },

  // POST /api/customers
  createCustomer: async (req, res) => {
    try {
      const orgId = req.user.organization_id;

      // ── PLAN LIMIT CHECK: CUSTOMERS ────────────────────────────────────
      const limitCheck = await checkPlanLimit(orgId, 'customers');
      if (!limitCheck.allowed) {
        return res.status(403).json({ error: limitCheck.message });
      }

      const { name, document_type, document_number, email, phone, address, notes } = req.body;

      const { data, error } = await supabaseAdmin
        .from('customers')
        .insert([{
          organization_id: orgId,
          name,
          document_type,
          document_number,
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
      console.error('Error creating customer:', error);
      res.status(500).json({ error: 'Error al crear cliente' });
    }
  },

  // PATCH /api/customers/:id
  updateCustomer: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const { data, error } = await supabaseAdmin
        .from('customers')
        .update(updates)
        .eq('id', id)
        .eq('organization_id', req.user.organization_id)
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ error: 'Error al actualizar cliente' });
    }
  },

  // DELETE /api/customers/:id
  deleteCustomer: async (req, res) => {
    try {
      const { id } = req.params;

      const { error } = await supabaseAdmin
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('organization_id', req.user.organization_id);

      if (error) throw error;
      res.json({ message: 'Cliente eliminado temporalmente (baja lógica o física)' });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ error: 'Error al eliminar cliente' });
    }
  }
};

module.exports = customersController;
