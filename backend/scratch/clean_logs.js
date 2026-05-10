const { supabaseAdmin } = require('../src/config/supabase');

async function cleanLogs() {
  const { data, error } = await supabaseAdmin
    .from('system_audit_logs')
    .delete()
    .eq('level', 'TEST');
  
  if (error) {
    console.error('Error cleaning logs:', error);
  } else {
    console.log('Test logs cleaned successfully.');
  }
  process.exit();
}

cleanLogs();
