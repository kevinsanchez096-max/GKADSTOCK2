const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnostic() {
    try {
        console.log('--- DIAGNÓSTICO DE SEGURIDAD MULTI-TENANCY ---');
        
        // 1. Obtener todas las organizaciones
        const { data: orgs } = await supabase.from('organizations').select('id, name');
        console.log('\n[ORGANIZACIONES]');
        orgs?.forEach(o => console.log(`${o.id} | ${o.name}`));

        // 2. Obtener todos los perfiles y su vinculación
        const { data: profiles } = await supabase.from('profiles').select('full_name, organization_id, organizations(name)');
        console.log('\n[PERFILES]');
        profiles?.forEach(p => console.log(`${p.full_name.padEnd(25)} | Org: ${p.organizations?.name || 'VINCULACIÓN ROTA'} | ID: ${p.organization_id}`));

        // 3. Muestreo de productos y su organización
        const { data: products } = await supabase.from('products').select('name, organization_id');
        console.log('\n[PRODUCTOS (Muestra)]');
        products?.slice(0, 10).forEach(prod => console.log(`${prod.name.padEnd(25)} | OrgID: ${prod.organization_id}`));

        // 4. Verificar si hay productos sin organización
        const { count: nullOrgCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).is('organization_id', null);
        console.log(`\nPRODUCTOS SIN ORGANIZACIÓN (LEAK POTENCIAL): ${nullOrgCount}`);

    } catch (error) {
        console.error('Error en diagnóstico:', error);
    }
}

diagnostic();
