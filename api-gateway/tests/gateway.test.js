const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');

test('health endpoint returns api gateway identity', async () => {
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().service, 'api-gateway');
});

test('protected routes require an access token cookie', async () => {
  const response = await app.inject({ method: 'GET', url: '/api/groups' });
  assert.equal(response.statusCode, 401);
  assert.match(response.json().error, /No autenticado/);
});
