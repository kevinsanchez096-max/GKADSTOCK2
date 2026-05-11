
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Kevin/OneDrive/Escritorio/GKADSTOCK/GKADSTOCK2/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncAllHistorical() {
  console.log('🚀 Iniciando sincronización profunda de registros históricos...');

  // 1. Obtener todos los perfiles y sus organizaciones
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('*, organizations(*)');

  if (profErr) {
    console.error('Error al obtener perfiles:', profErr);
    return;
  }

  // 2. Obtener notificaciones existentes de tipo NEW_USER
  const { data: existingUserNotifs } = await supabase
    .from('system_notifications')
    .select('metadata')
    .eq('type', 'NEW_USER');

  const existingUserIds = new Set(existingUserNotifs?.map(n => n.metadata?.user_id));

  const newNotifications = [];

  for (const prof of profiles) {
    if (existingUserIds.has(prof.id)) continue;

    const orgName = prof.organizations?.name || 'Desconocida';
    
    console.log(`+ Preparando notificación de USUARIO para: ${prof.full_name} (${prof.created_at})`);

    newNotifications.push({
      type: 'NEW_USER',
      title: 'Nuevo Registro de Usuario',
      message: `El usuario ${prof.full_name} se ha unido a la organización "${orgName}".`,
      created_at: prof.created_at,
      metadata: { 
        user_id: prof.id,
        full_name: prof.full_name,
        organization: orgName,
        role: prof.role,
        is_backfill: true
      }
    });
  }

  if (newNotifications.length > 0) {
    const { error: insertErr } = await supabase
      .from('system_notifications')
      .insert(newNotifications);

    if (insertErr) {
      console.error('Error al insertar notificaciones de usuarios:', insertErr);
    } else {
      console.log(`✅ Se han sincronizado ${newNotifications.length} usuarios históricos.`);
    }
  } else {
    console.log('ℹ️ No se encontraron usuarios faltantes.');
  }
}

syncAllHistorical();
