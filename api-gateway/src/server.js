require('dotenv').config();

const fastify = require('fastify')({ logger: true });
const cookie = require('@fastify/cookie');
const cors = require('@fastify/cors');
const rateLimit = require('@fastify/rate-limit');
const jwt = require('jsonwebtoken');
const { request } = require('undici');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-jwt-backend-split';
const PORT = Number(process.env.PORT || 8080);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5170';
const GATEWAY_SHARED_SECRET = process.env.GATEWAY_SHARED_SECRET || '';

const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  users: process.env.USER_GROUP_SERVICE_URL || 'http://localhost:8082',
  expenses: process.env.EXPENSE_SERVICE_URL || 'http://localhost:8081',
  debts: process.env.DEBT_SERVICE_URL || 'http://localhost:8000',
  reports: process.env.REPORT_SERVICE_URL || 'http://localhost:8083',
  notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3006',
  ai: process.env.AI_SERVICE_URL || 'http://localhost:8007'
};

fastify.register(cors, {
  origin: (origin, cb) => cb(null, !origin || origin === FRONTEND_ORIGIN),
  credentials: true
});
fastify.register(cookie);
fastify.register(rateLimit, { max: 200, timeWindow: '1 minute' });

function getUser(req) {
  const token = req.cookies?.access_token;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAuth(req, reply, done) {
  const user = getUser(req);
  if (!user) {
    reply.status(401).send({ error: 'No autenticado o access_token expirado' });
    return;
  }
  req.user = user;
  done();
}

async function proxyTo(baseUrl, req, reply, prefixToStrip) {
  const targetPath = req.url.replace(prefixToStrip, '') || '/';
  const target = new URL(targetPath, baseUrl);
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {});
  const started = Date.now();
  
  // Reconstruir header Cookie desde cookies parseadas
  let cookieHeader = '';
  if (req.cookies && typeof req.cookies === 'object') {
    cookieHeader = Object.entries(req.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  }
  
  const headers = {
    'content-type': req.headers['content-type'] || 'application/json',
    cookie: cookieHeader || req.headers.cookie || ''
  };

  if (req.user) {
    headers['x-user-id'] = req.user.user_id || req.user.id || '';
    headers['x-user-email'] = req.user.email || '';
  }
  if (GATEWAY_SHARED_SECRET) {
    headers['x-gateway-secret'] = GATEWAY_SHARED_SECRET;
  }

  try {
    req.log.info(
      { method: req.method, target: target.href, userId: req.user?.user_id || req.user?.id || null },
      'proxy request started'
    );
    const upstream = await request(target, {
      method: req.method,
      headers,
      body,
      bodyTimeout: 7000,
      headersTimeout: 7000
    });

    const text = await upstream.body.text();
    const contentType = upstream.headers['content-type'] || 'application/json';
    req.log.info(
      {
        method: req.method,
        target: target.href,
        statusCode: upstream.statusCode,
        contentType,
        elapsedMs: Date.now() - started
      },
      'proxy response received'
    );
    if (upstream.headers['set-cookie']) {
      reply.header('set-cookie', upstream.headers['set-cookie']);
    }
    reply.code(upstream.statusCode).header('content-type', contentType).send(text);
  } catch (error) {
    req.log.warn(
      { error: error.message, target: target.href, elapsedMs: Date.now() - started },
      'upstream unavailable'
    );
    reply.code(503).send({
      error: 'Servicio temporalmente no disponible',
      upstream: baseUrl,
      detail: error.message
    });
  }
}

fastify.get('/health', async () => ({ status: 'ok', service: 'api-gateway' }));

fastify.get('/api/health', async () => {
  const checks = await Promise.all(Object.entries(services).map(async ([name, url]) => {
    try {
      const res = await request(`${url}/health`, { method: 'GET', bodyTimeout: 1500, headersTimeout: 1500 });
      return [name, { status: res.statusCode < 500 ? 'ok' : 'degraded', url }];
    } catch {
      return [name, { status: 'down', url }];
    }
  }));
  return Object.fromEntries(checks);
});

fastify.all('/api/auth/*', (req, reply) => proxyTo(services.auth, req, reply, '/api'));
fastify.all('/api/users/*', { preHandler: requireAuth }, (req, reply) => proxyTo(services.users, req, reply, '/api'));
fastify.all('/api/groups*', { preHandler: requireAuth }, (req, reply) => proxyTo(services.users, req, reply, '/api'));
fastify.all('/api/expenses*', { preHandler: requireAuth }, (req, reply) => proxyTo(services.expenses, req, reply, '/api'));
fastify.all('/api/balances*', { preHandler: requireAuth }, (req, reply) => proxyTo(services.debts, req, reply, '/api'));
fastify.all('/api/debts*', { preHandler: requireAuth }, (req, reply) => proxyTo(services.debts, req, reply, '/api'));
fastify.all('/api/reports*', { preHandler: requireAuth }, (req, reply) => proxyTo(services.reports, req, reply, '/api/reports'));
fastify.all('/api/notifications*', { preHandler: requireAuth }, (req, reply) => proxyTo(services.notifications, req, reply, '/api'));
fastify.all('/api/ai*', { preHandler: requireAuth }, (req, reply) => proxyTo(services.ai, req, reply, '/api/ai'));

if (require.main === module) {
  fastify.listen({ host: '0.0.0.0', port: PORT }).catch((error) => {
    fastify.log.error(error);
    process.exit(1);
  });
}

module.exports = fastify;
