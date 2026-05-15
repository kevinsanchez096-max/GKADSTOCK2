console.log('🚀 Iniciando Función Vercel: /api/index.js');

try {
  const app = require('../backend/app');
  module.exports = (req, res) => {
    try {
      return app(req, res);
    } catch (handlerErr) {
      console.error('🔥 Error en el manejador de la función:', handlerErr);
      res.status(500).json({ error: 'Runtime Error', details: handlerErr.message });
    }
  };
} catch (initErr) {
  console.error('🔥 Fallo crítico de inicialización:', initErr);
  module.exports = (req, res) => {
    res.status(500).json({ error: 'Initialization Error', details: initErr.message });
  };
}
