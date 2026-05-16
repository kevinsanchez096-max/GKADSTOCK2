/**
 * ── PLAN LIMITS MIDDLEWARE ──────────────────────────────────────────────────
 * Enforces usage limits for organizations on the Starter plan.
 * Only the 'Starter' plan has restrictions. All other plans (Esencial,
 * Avanzado, Premium, or any plan with license_price > 0) have no limits.
 * ────────────────────────────────────────────────────────────────────────────
 */
const { supabaseAdmin } = require('../config/supabase');

const STARTER_LIMITS = {
  products: 20,
  categories: 5,
  customers: 2,
  suppliers: 5,
};

/**
 * Checks if an organization on the Starter plan has reached its limit
 * for a given resource table.
 * 
 * @param {string} orgId - The organization UUID
 * @param {string} table - The Supabase table name ('products', 'categories', 'customers', 'suppliers')
 * @returns {{ allowed: boolean, message?: string, currentCount?: number, limit?: number }}
 */
async function checkPlanLimit(orgId, table) {
  // 1. Get the organization's plan
  const { data: org, error: orgError } = await supabaseAdmin
    .from('organizations')
    .select('plan')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    console.error(`[PLAN_LIMITS] Error fetching org plan for ${orgId}:`, orgError?.message);
    // Fail-open: if we can't determine the plan, allow the operation
    return { allowed: true };
  }

  // 2. Only restrict if plan is exactly 'Starter'
  if (org.plan !== 'Starter') {
    return { allowed: true };
  }

  // 3. Count current records for this org in the target table
  const limit = STARTER_LIMITS[table];
  if (!limit) {
    // No limit defined for this table — allow
    return { allowed: true };
  }

  const { count, error: countError } = await supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if (countError) {
    console.error(`[PLAN_LIMITS] Error counting ${table} for org ${orgId}:`, countError.message);
    return { allowed: true };
  }

  // 4. Enforce the limit
  if (count >= limit) {
    return {
      allowed: false,
      message: `Has alcanzado el límite de tu plan (${count}/${limit}). Actualiza tu suscripción para continuar.`,
      currentCount: count,
      limit,
    };
  }

  return { allowed: true, currentCount: count, limit };
}

module.exports = { checkPlanLimit, STARTER_LIMITS };
