const { supabaseAdmin } = require('./config/supabase');

async function createTestUser() {
    const email = 'test_gkad@example.com';
    const password = 'Password123!';
    
    console.log(`🚀 Creando usuario de prueba: ${email}`);

    // 1. Crear en Auth (confirmado)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Test Bot' }
    });

    if (authError) {
        if (authError.message.includes('already registered')) {
            console.log('ℹ️ El usuario ya existe en Auth. Intentando resetear contraseña...');
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
            const user = listData.users.find(u => u.email === email);
            await supabaseAdmin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
            authData.user = user;
        } else {
            console.error('❌ Error en Auth:', authError.message);
            return;
        }
    }

    // 2. Buscar o crear organización
    let orgId;
    const { data: orgData, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert([{ name: 'Test Org', is_active: true, billing_status: 'activo' }])
        .select()
        .single();

    if (orgError) {
        if (orgError.code === '23505') {
            const { data: existingOrg } = await supabaseAdmin.from('organizations').select('id').eq('name', 'Test Org').single();
            orgId = existingOrg.id;
        } else {
            console.error('❌ Error en Org:', orgError.message);
            return;
        }
    } else {
        orgId = orgData.id;
    }

    // 3. Crear perfil
    const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
            id: authData.user.id,
            full_name: 'Test Bot',
            organization_id: orgId,
            role: 'admin'
        }]);

    if (profileError && profileError.code !== '23505') {
        console.error('❌ Error en Perfil:', profileError.message);
        return;
    }

    console.log('✅ Usuario de prueba listo.');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
}

createTestUser();
