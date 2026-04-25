// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || ''

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    })

    const { saleData, items } = await req.json()

    const { data, error } = await supabaseClient.rpc('process_sale_transaction', {
      p_organization_id: saleData.organization_id,
      p_user_id: saleData.user_id,
      p_total: saleData.total,
      p_subtotal: saleData.subtotal,
      p_tax: saleData.tax,
      p_payment_method: saleData.payment_method,
      p_amount_received: saleData.amount_received,
      p_change_given: saleData.change_given,
      p_items: items 
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, sale_id: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Error en la transacción' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})