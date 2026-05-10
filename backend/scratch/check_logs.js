const { supabaseAdmin } = require('../src/config/supabase');

async function checkLogs() {
  const { data, error } = await supabaseAdmin
    .from('system_audit_logs')
    .select('*')
    .limit(10);
  
  if (error) {
    console.error('Error fetching logs:', error);
  } else {
    console.log('Current logs in DB:', JSON.stringify(data, null, 2));
  }
  process.exit();
}

checkLogs();
