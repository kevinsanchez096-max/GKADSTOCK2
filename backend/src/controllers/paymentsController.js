const { supabaseAdmin } = require('../config/supabase');

const paymentsController = {
  // 1. Crear nueva solicitud (Público/Usuario)
  createRequest: async (req, res) => {
    try {
      const {
        organization_id,
        organization_name,
        plan_name,
        plan_price,
        payment_method,
        customer_name,
        customer_email,
        customer_document,
        bank_name,
        transaction_reference
      } = req.body;

      // Validación de campos obligatorios
      if (!organization_id || !organization_name || !plan_name || plan_price === undefined || !payment_method) {
        return res.status(400).json({ error: 'Faltan campos obligatorios para procesar la solicitud.' });
      }

      const { data, error } = await supabaseAdmin
        .from('payment_requests')
        .insert([{
          organization_id,
          organization_name,
          plan_name,
          plan_price,
          payment_method,
          payment_status: 'pending',
          customer_name,
          customer_email,
          customer_document,
          bank_name,
          transaction_reference
        }])
        .select()
        .single();

      if (error) throw error;

      res.status(201).json(data);
    } catch (error) {
      console.error('[PAYMENTS ERROR] createRequest:', error);
      res.status(500).json({ error: 'Error al registrar la solicitud de pago.' });
    }
  },

  // 2. Obtener todas las solicitudes (Super Admin)
  getRequests: async (req, res) => {
    try {
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Acceso denegado.' });
      }

      const { data, error } = await supabaseAdmin
        .from('payment_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      console.error('[PAYMENTS ERROR] getRequests:', error);
      res.status(500).json({ error: 'Error al obtener solicitudes.' });
    }
  },

  // 3. Aprobar o Rechazar solicitud (Super Admin)
  updateRequestStatus: async (req, res) => {
    try {
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Acceso denegado.' });
      }

      const { id } = req.params;
      const { status } = req.body; // 'approved' o 'rejected'

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido.' });
      }

      // Si es rechazo, solo actualizamos el estado de la solicitud
      if (status === 'rejected') {
        const { error: rejectError } = await supabaseAdmin
          .from('payment_requests')
          .update({ payment_status: 'rejected' })
          .eq('id', id);

        if (rejectError) throw rejectError;
        return res.status(200).json({ message: 'Solicitud rechazada correctamente.' });
      }

      // Si es Aprobación, requiere transacción manual
      // 1. Obtener los detalles de la solicitud y el plan actual de la organización
      const { data: request, error: reqError } = await supabaseAdmin
        .from('payment_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (reqError || !request) throw new Error('No se encontró la solicitud.');
      if (request.payment_status === 'approved') return res.status(400).json({ error: 'La solicitud ya estaba aprobada.' });

      const { data: currentOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('plan')
        .eq('id', request.organization_id)
        .single();

      if (orgError) throw new Error('Error al obtener la organización actual.');
      const previousPlan = currentOrg.plan;

      // 2. Actualizar el estado de la solicitud a 'approved'
      const { error: updateReqError } = await supabaseAdmin
        .from('payment_requests')
        .update({ payment_status: 'approved' })
        .eq('id', id);

      if (updateReqError) throw updateReqError;

      // 3. Actualizar el plan de la organización
      const { error: updateOrgError } = await supabaseAdmin
        .from('organizations')
        .update({ plan: request.plan_name })
        .eq('id', request.organization_id);

      // Si falla la actualización de la organización, hacemos ROLLBACK de la solicitud
      if (updateOrgError) {
        await supabaseAdmin
          .from('payment_requests')
          .update({ payment_status: 'pending' })
          .eq('id', id);
        throw new Error('Error al actualizar el plan de la organización. Se revirtió el estado de la solicitud.');
      }

      res.status(200).json({ message: 'Solicitud aprobada y plan actualizado correctamente.' });
    } catch (error) {
      console.error('[PAYMENTS ERROR] updateRequestStatus:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la solicitud.' });
    }
  }
};

module.exports = paymentsController;
