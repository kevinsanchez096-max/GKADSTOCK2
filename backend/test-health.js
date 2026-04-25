async function verifyRestoration() {
    console.log('🔍 Iniciando verificación de restauración SaaS...');
    
    try {
        // 1. Verificar Health Check (Público o SaaS)
        const res = await fetch('http://localhost:3000/api/saas/health');
        const health = await res.json();
        console.log('✅ Health Check:', health);
        
        if (health.database === 'connected') {
            console.log('✨ Conexión a Base de Datos: OPERATIVA');
        }

        // 2. Intentar obtener logs (verificar endpoint)
        const resLogs = await fetch('http://localhost:3000/api/saas/logs');
        if (resLogs.status === 401) {
            console.log('✅ Endpoint de Logs protegido (esperado).');
        } else {
            const logs = await resLogs.json();
            console.log('✅ Logs Check:', logs.length, 'registros encontrados.');
        }

    } catch (error) {
        console.error('❌ Error en la verificación:', error.message);
    }
}

verifyRestoration();
