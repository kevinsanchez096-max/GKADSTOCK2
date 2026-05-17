// [BLINDAJE GLOBAL ANTI-CAÍDAS]
// Ninguna excepción ni promesa asíncrona no capturada debe matar el proceso.
process.on('uncaughtException', (err) => { 
    console.error('CRÍTICO - Excepción no capturada:', err); 
});
process.on('unhandledRejection', (reason, promise) => { 
    console.error('CRÍTICO - Promesa rechazada no manejada:', reason); 
});

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');

const app = express();

// Middlewares Globales
app.use(helmet()); // Seguridad de cabeceras HTTP
// Configuración estricta de CORS (Producción vs Desarrollo)
// Configuración de CORS dinámica
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'https://gkadstock-2.vercel.app',
  'https://gkadstock-2-noww.vercel.app' // Añadido para el despliegue actual
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir cualquier subdominio de vercel.app en producción por seguridad y flexibilidad
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(morgan('dev')); // Logger de solicitudes
app.use(express.json()); // Parsing de JSON

/**
 * RUTAS DEL SISTEMA (REST API)
 */
const inventoryRoutes = require('./src/routes/inventory');
const authRoutes = require('./src/routes/auth');
const salesRoutes = require('./src/routes/sales');
const dashboardRoutes = require('./src/routes/dashboard');
const saasRoutes = require('./src/routes/superAdmin');
const expenseRoutes = require('./src/routes/expenses');
const userRoutes = require('./src/routes/users');
const customersRoutes = require('./src/routes/customers');
const suppliersRoutes = require('./src/routes/suppliers');
const cashSessionsRoutes = require('./src/routes/cashSessions');

// Punto de Entrada Salud
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Servidor GKAD STOCK operativo' });
});
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'Servidor GKAD STOCK operativo (root)' });
});

// Router Principal para unificar rutas
const mainRouter = express.Router();

mainRouter.use('/inventory', inventoryRoutes);
mainRouter.use('/auth', authRoutes);
mainRouter.use('/sales', salesRoutes);
mainRouter.use('/dashboard', dashboardRoutes);
mainRouter.use('/saas', saasRoutes);
mainRouter.use('/expenses', expenseRoutes);
mainRouter.use('/users', userRoutes);
mainRouter.use('/customers', customersRoutes);
mainRouter.use('/suppliers', suppliersRoutes);
mainRouter.use('/cash-sessions', cashSessionsRoutes);

// Configuración del Daemon de Autocierre de Cajas a las 11:59 PM (Chequeo cada minuto)
const cashSessionController = require('./src/controllers/cashSessionController');
// Ejecutar una vez al arrancar
setTimeout(() => {
    cashSessionController.executeAutoCloseDaemon();
}, 5000);
// Programar ejecución periódica cada 60 segundos
setInterval(() => {
    cashSessionController.executeAutoCloseDaemon();
}, 60000);

// Montaje Dual (Local vs Vercel)
app.use('/api', mainRouter);
app.use('/', mainRouter);

// Manejador de errores global
app.use((err, req, res, next) => {
    console.error('❌ Error Global de Ruta:', {
        message: err.message || err,
        path: req.path,
        method: req.method
    });
    
    const statusCode = err.status || 500;
    
    // Notificación: Error Crítico (Segura)
    try {
        const { sendSystemNotification } = require('./src/utils/notificationService');
        if (sendSystemNotification) {
            sendSystemNotification('SYSTEM_ERROR', 'Error Crítico', err.message || 'Error desconocido');
        }
    } catch (notifErr) {
        console.error('⚠️ Fallo al enviar notificación de error:', notifErr.message);
    }

    res.status(statusCode).json({
        error: 'Fallo interno del servidor',
        details: err.message || 'Sin detalles adicionales',
        path: req.path
    });
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(4000, () => {
    console.log('Servidor local en puerto 4000');
  });
}
