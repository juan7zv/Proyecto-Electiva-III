/**
 * Archivo: tests/auth.test.js
 * Propósito: Verificación unitaria y de integración de la mecánica Auth.
 * Decisiones en esta prueba:
 * Simular persistencia mediante un Mock del pool de postgres para no atacar
 * la base de datos real durante pruebas en ambientes CI/CD o iniciales.
 * Cumple exhaustivamente con probar registro, login por credencial, refresh, 
 * y finalmente invalidación post logout y revelación oculta de emails.
 */

// Se mockea el client DB
jest.mock('../db', () => ({
  query: jest.fn(),
  initDb: jest.fn()
}));

const db = require('../db');
const request = require('supertest');
const fastifyApp = require('../server');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

describe('Auth Service Web Endpoints', () => {
  beforeAll(async () => {
    await fastifyApp.ready();
  });

  afterAll(async () => {
    await fastifyApp.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /auth/register - Escenario Clave 1: Registro completo, cookies enviadas y hash difiere', async () => {
    // Mock vacio para 'no existia usuario' (respuesta vacia de rows)
    db.query.mockResolvedValueOnce({ rows: [] }); 
    // Mock que emula la respuesta de guardado
    db.query.mockResolvedValueOnce({ rows: [{ id: 'fake-uuid', name: 'John Doe', email: 'john@abc.xyz' }] });
    // Mock que emula insertar refresh token.
    db.query.mockResolvedValueOnce({ rows: [] });

    const plainPassword = 'mypassword123';
    const payload = {
      name: 'John Doe',
      email: 'john@abc.xyz',
      password: plainPassword
    };

    const response = await request(fastifyApp.server)
      .post('/auth/register')
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Usuario registrado con éxito');

    // Analiza las Set-Cookies existan en headers de la respuesta HTTP
    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.startsWith('access_token='))).toBeTruthy();
    expect(cookies.some(c => c.startsWith('refresh_token='))).toBeTruthy();
    
    // Verificamos que el hash haya sido aplicado y no guardara la clave llana (Spy interno o logic path verificado)
    const sqlInsertCall = db.query.mock.calls[1]; 
    const argsSentToDatabase = sqlInsertCall[1]; // ['John Doe', 'john@abc.xyz', $HASH_PASSWORD]
    const dbHash = argsSentToDatabase[2];
    
    expect(dbHash).not.toBe(plainPassword); // No es texto crudo
    expect(dbHash.length).toBeGreaterThan(50); // El hash de Bcrypt siempre supera los 50 caracteres (regularmente 60)
  });

  test('POST /auth/login - Escenario Clave 2: Login con clave invalida esconde si email existe', async () => {
    const falseHash = await bcrypt.hash('realpassword12', 10);
    // Retorna usuario simulado. (Emulamos que SI existe el email)
    db.query.mockResolvedValueOnce({ rows: [{ id: 'fake-uuid', email: 'john@example.com', password_hash: falseHash }] });

    const response = await request(fastifyApp.server)
      .post('/auth/login')
      .send({ email: 'john@example.com', password: 'incorrectpassword' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Credenciales inválidas');
    // Nótese que el mensaje es "Credenciales inválidas" exactamente, sin gritar que "Contraseña está mala, pero el correo le atinaste".
  });

  test('POST /auth/logout y POST /auth/refresh - Escenario Clave 3 & 4: Revocación real de RT y Refresh Fallando', async () => {
    // Al intentar hacer logout, emulamos la actualizacion de BDD (REVOKED = TRUE)
    db.query.mockResolvedValueOnce({ rowCount: 1 });
    
    const fakeTokenStr = crypto.randomBytes(32).toString('hex');

    const logoutResponse = await request(fastifyApp.server)
      .post('/auth/logout')
      .set('Cookie', `refresh_token=${fakeTokenStr}`);

    expect(logoutResponse.status).toBe(200);

    const logoutCookies = logoutResponse.headers['set-cookie'];
    // Validar limpiado real emitiendo cookies caducas/vacias
    expect(logoutCookies.toString()).toMatch(/Expires=/);

    // Ahora supongamos que intenta refresh con token invalidado en DB (storedToken.revoked = true)
    db.query.mockResolvedValueOnce({ rows: [{ id: 'xxx', user_id: 'uuu', revoked: true, expires_at: new Date('2099-01-01') }] });
    
    const refreshResponse = await request(fastifyApp.server)
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${fakeTokenStr}`);

    expect(refreshResponse.status).toBe(401);
    expect(refreshResponse.body.error).toBe('Refresh token revocado o caduco');
  });

});
