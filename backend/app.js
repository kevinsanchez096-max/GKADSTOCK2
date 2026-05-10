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
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://gkadstock-2.vercel.app'] 
  : ['http://localhost:5173', 'http://localhost:3000']; // Para no romper tu entorno de pruebas local

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
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

// Montaje Dual (Local vs Vercel)
app.use('/api', mainRouter);
app.use('/', mainRouter);

// Manejador de errores global
app.use((err, req, res, next) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    console.error('❌ Error Global de Ruta:', {
        message: err.message || err,
        code: err.code,
        status: err.status || 500,
        stack: isDevelopment ? err.stack : undefined
    });
    
    const statusCode = err.status || 500;
    const errorResponse = {
        error: isDevelopment 
            ? (err.message || 'Error interno del servidor')
            : 'Error interno del servidor, pero el sistema sigue en línea.',
        ...(isDevelopment && { details: err.message, code: err.code })
    };
    
    // Notificación: Error Crítico
    const { sendSystemNotification } = require('./src/utils/notificationService');
    sendSystemNotification('SYSTEM_ERROR', 'Error Crítico del Sistema', `Se ha detectado un error sistémico: ${err.message || 'Error desconocido'}`, { path: req.path, method: req.method, code: err.code });

    res.status(statusCode).json(errorResponse);
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(4000, () => {
    console.log('Servidor local en puerto 4000');
  });
}
