const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const db = require('../src/db');

test('health endpoint returns notification service identity', async () => {
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().service, 'notification-service');
});

test('post notification validates required fields', async () => {
  const response = await app.inject({
    method: 'POST',
    url: '/notifications',
    payload: { type: 'info' }
  });
  assert.equal(response.statusCode, 400);
});

test('get notifications returns rows from database query', async () => {
  const originalQuery = db.query;
  db.query = async () => ({
    rows: [{ id: 'n1', user_id: 'u1', message: 'Hola', read: false }]
  });

  const response = await app.inject({ method: 'GET', url: '/notifications?user_id=u1' });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json()[0].id, 'n1');

  db.query = originalQuery;
});
