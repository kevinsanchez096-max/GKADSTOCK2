
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'c:/Users/Kevin/OneDrive/Escritorio/GKADSTOCK/GKADSTOCK2/backend/.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncNotifications() {
  console.log('🚀 Iniciando sincronización histórica de notificaciones...');

  // 1. Obtener todas las organizaciones
  const { data: orgs, error: orgsErr } = await supabase
    .from('organizations')
    .select('*, profiles(*)');

  if (orgsErr) {
    console.error('Error al obtener organizaciones:', orgsErr);
    return;
  }

  // 2. Obtener notificaciones existentes para evitar duplicados
  const { data: existingNotifs } = await supabase
    .from('system_notifications')
    .select('metadata');

  const existingOrgIds = new Set(
    existingNotifs
      ?.filter(n => n.metadata?.organization_id || n.metadata?.organization)
      .map(n => n.metadata?.organization_id || n.metadata?.organization)
  );

  const newNotifications = [];

  for (const org of orgs) {
    // Si ya tiene una notificación (por ID o por nombre en metadata antigua), omitir
    if (existingOrgIds.has(org.id) || existingOrgIds.has(org.name)) continue;

    const admin = org.profiles?.find(p => p.role === 'admin' || p.role === 'super_admin') || org.profiles?.[0];
    const adminName = admin ? admin.full_name : 'Sistema';
    
    console.log(`+ Preparando notificación para: ${org.name} (${org.created_at})`);

    newNotifications.push({
      type: 'ORG_STATUS',
      title: 'Nuevo Nodo Corporativo',
      message: `La organización "${org.name}" ha sido inicializada y activada por ${adminName}.`,
      created_at: org.created_at, // Mantener la fecha original
      metadata: { 
        organization: org.name, 
        organization_id: org.id,
        admin: adminName, 
        email: admin?.email || 'N/A',
        is_backfill: true
      }
    });
  }

  if (newNotifications.length > 0) {
    const { error: insertErr } = await supabase
      .from('system_notifications')
      .insert(newNotifications);

    if (insertErr) {
      console.error('Error al insertar notificaciones:', insertErr);
    } else {
      console.log(`✅ Se han sincronizado ${newNotifications.length} registros históricos.`);
    }
  } else {
    console.log('ℹ️ No se encontraron registros faltantes.');
  }
}

syncNotifications();
