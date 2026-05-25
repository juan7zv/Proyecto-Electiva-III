/**
 * Archivo: server.js
 * Propósito: Punto de entrada del microservicio Auth Service.
 * Decisiones: Se escoge Fastify por su desempeño asincrónico superior.
 * Se configuran plugins clave como fastify-cookie para la manipulación HttpOnly,
 * el requisito central de seguridad impuesto en la sesión.
 */

require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const authController = require('./controllers/auth.controller');
const { initDb } = require('./db');
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5170';
const GATEWAY_SHARED_SECRET = process.env.GATEWAY_SHARED_SECRET || '';

// Registro de plugins
fastify.register(require('@fastify/cors'),
 {
  origin: (origin, cb) => cb(null, !origin || origin === FRONTEND_ORIGIN),
  credentials: true
});

fastify.register(require('@fastify/cookie'), {
  secret: process.env.COOKIE_SECRET || "secreto-seguro-cookie",
  parseOptions: {}
});

fastify.addHook('onRequest', async (req, reply) => {
  // Saltar validación de secret para endpoints públicos de auth
  const publicAuthPaths = ['/health', '/auth/register', '/auth/login', '/auth/refresh', '/auth/users'];
  if (publicAuthPaths.some(path => req.url.startsWith(path))) return;
  
  if (!GATEWAY_SHARED_SECRET || req.url === '/health') return;
  if (req.headers['x-gateway-secret'] !== GATEWAY_SHARED_SECRET) {
    return reply.code(403).send({ error: 'Acceso permitido solo desde API Gateway' });
  }
});

// Rutas de autenticación
fastify.get('/health', async () => ({ status: 'ok', service: 'auth-service' }));
fastify.post('/auth/register', authController.register);
fastify.post('/auth/login', authController.login);
fastify.post('/auth/refresh', authController.refresh);
fastify.post('/auth/logout', authController.logout);
fastify.get('/auth/me', authController.me);
fastify.get('/auth/users/:id', authController.getUserById);

const start = async () => {
  try {
    // Inicializar las tablas relacionales primero (si no existen)
    await initDb();
    
    // El port suele asignarse por Render mediante PORT
    const port = process.env.PORT || 3001;
    await fastify.listen({ port, host: '0.0.0.0' });
    fastify.log.info(`Auth Service corriendo en el puerto ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Exportar fastify app para que en Jest podamos inyectar peticiones sin inicializar red
if (require.main === module) {
  start();
} else {
  module.exports = fastify;
}
