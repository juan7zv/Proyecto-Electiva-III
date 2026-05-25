require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const db = require('./db');
const { startConsumer } = require('./worker');

const PORT = Number(process.env.PORT || 3006);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5170';
const GATEWAY_SHARED_SECRET = process.env.GATEWAY_SHARED_SECRET || '';

fastify.register(cors, {
  origin: (origin, cb) => cb(null, !origin || origin === FRONTEND_ORIGIN),
  credentials: true
});

fastify.addHook('onRequest', async (req, reply) => {
  if (!GATEWAY_SHARED_SECRET || req.url === '/health') return;
  if (req.headers['x-gateway-secret'] !== GATEWAY_SHARED_SECRET) {
    return reply.code(403).send({ error: 'Acceso permitido solo desde API Gateway' });
  }
});

fastify.get('/health', async () => ({ status: 'ok', service: 'notification-service' }));

fastify.get('/notifications', async (req) => {
  const userId = req.headers['x-user-id'] || req.query.user_id;
  if (!userId) {
    return [];
  }
  const params = [userId];
  let sql = `
    SELECT id, user_id, type, message, group_id, group_name, amount::float, read, created_at
    FROM notifications
    WHERE user_id = $1
  `;
  if (req.query.type) {
    params.push(req.query.type);
    sql += ` AND type = $2`;
  }
  sql += ` ORDER BY created_at DESC`;
  const result = await db.query(sql, params);
  return result.rows;
});

fastify.post('/notifications', async (req, reply) => {
  const { user_id, type = 'info', message, group_id, group_name = '', amount = null } = req.body || {};
  if (!user_id || !message) {
    return reply.code(400).send({ error: 'user_id y message son requeridos' });
  }
  const result = await db.query(
    `INSERT INTO notifications (user_id, type, message, group_id, group_name, amount)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, type, message, group_id, group_name, amount::float, read, created_at`,
    [user_id, type, message, group_id, group_name, amount]
  );
  return reply.code(201).send(result.rows[0]);
});

fastify.patch('/notifications/:id/read', async (req, reply) => {
  const userId = req.headers['x-user-id'] || req.query.user_id;
  if (!userId) {
    return reply.code(401).send({ error: 'Usuario autenticado requerido' });
  }
  const result = await db.query(
    `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id, read`,
    [req.params.id, userId]
  );
  if (!result.rows[0]) return reply.code(404).send({ error: 'Notificacion no encontrada' });
  return result.rows[0];
});

fastify.patch('/notifications/read-all', async (req) => {
  const userId = req.headers['x-user-id'] || req.query.user_id;
  if (!userId) {
    return { updated_count: 0 };
  }
  const result = await db.query(
    `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE RETURNING id`,
    [userId]
  );
  return { updated_count: result.rowCount };
});

async function start() {
  await db.initDb();
  startConsumer(fastify.log).catch((error) => fastify.log.warn({ error: error.message }, 'notification worker disabled'));
  await fastify.listen({ host: '0.0.0.0', port: PORT });
}

if (require.main === module) {
  start().catch((error) => {
    fastify.log.error(error);
    process.exit(1);
  });
}

module.exports = fastify;
