const { supabaseAdmin } = require('./config/supabase');

async function testTable() {
    try {
        console.log('Probando si existe cash_sessions...');
        const { data, error } = await supabaseAdmin
            .from('cash_sessions')
            .select('*')
            .limit(1);
        
        if (error) {
            console.log('Error recibido:', error.message, 'Código:', error.code);
        } else {
            console.log('¡La tabla EXISTE! Data:', data);
        }
    } catch (err) {
        console.error('Error catastrófico:', err);
    }
}

testTable();
