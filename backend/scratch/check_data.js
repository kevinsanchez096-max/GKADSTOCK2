require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no definidos.');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

const checkData = async () => {
  console.log('✅ Verificando Integridad de Datos (Notificaciones y Logs)');
  
  const { data: notifications, error: notifError } = await supabaseAdmin
    .from('system_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (notifError) {
    console.error('❌ Error leyendo notificaciones:', notifError.message);
  } else {
    console.log('\n🔔 Últimas 5 Notificaciones:');
    console.log(JSON.stringify(notifications, null, 2));
  }

  const { data: logs, error: logError } = await supabaseAdmin
    .from('system_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logError) {
    console.error('❌ Error leyendo logs:', logError.message);
  } else {
    console.log('\n📜 Últimos 5 Logs de Auditoría:');
    console.log(JSON.stringify(logs, null, 2));
  }
};

checkData();
