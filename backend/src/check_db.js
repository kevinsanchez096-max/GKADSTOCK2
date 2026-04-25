const { supabaseAdmin } = require('./config/supabase');

async function diagnostic() {
    try {
        console.log('--- DIAGNÓSTICO DE MULTI-TENANCY ---');
        
        // 1. Ver organizaciones
        const { data: orgs } = await supabaseAdmin.from('organizations').select('id, name');
        console.log('\nOrganizaciones registradas:', orgs);

        // 2. Ver usuarios y sus organizaciones
        const { data: profiles } = await supabaseAdmin.from('profiles').select('full_name, organization_id, organizations(name)');
        console.log('\nPerfiles y sus organizaciones:', profiles);

        // 3. Ver conteo de productos por organización
        const { data: products } = await supabaseAdmin.from('products').select('organization_id');
        const counts = products.reduce((acc, p) => {
            acc[p.organization_id] = (acc[p.organization_id] || 0) + 1;
            return acc;
        }, {});
        console.log('\nProductos por Organization ID:', counts);

    } catch (error) {
        console.error('Error en diagnóstico:', error);
    }
}

diagnostic();
