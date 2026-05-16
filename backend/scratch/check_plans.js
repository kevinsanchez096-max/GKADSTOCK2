const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function checkPlans() {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('id, name, plan, billing_status, license_price');
  
  if (error) {
    console.error("Error querying organizations:", error);
    return;
  }
  console.log("Current organizations plans:");
  console.table(data);
}

checkPlans();
