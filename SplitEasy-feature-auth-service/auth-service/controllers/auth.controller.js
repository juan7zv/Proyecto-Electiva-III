/**
 * Archivo: controllers/auth.controller.js
 * Propósito: Proveer toda la lógica de negocio HTTP para Autenticación.
 * Decisiones Tácticas:
 * - El "access_token" es JWT (vive 5min).
 * - El "refresh_token" NO es JWT, es un string aleatorio (uuid) como pide
 *   el requerimiento específico de la asignatura, permitiendo revocación real.
 * - Ambas fichas residen EXCLUSIVAMENTE en el cabezal Set-Cookie HttpOnly.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-jwt-backend-split';
const ACCESS_TOKEN_EXP = '5m'; // 5 minutos, corto por seguridad

// Función de utilidad para generar Refresh Token y su hash
const generateRefreshToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
};

exports.register = async (req, reply) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return reply.status(400).send({ error: 'Faltan campos (name, email, password)' });
  }

  try {
    // 1. Verificar existencia del email
    const existUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existUser.rows.length > 0) {
      return reply.status(400).send({ error: 'El email ya está registrado' });
    }

    // 2. Hashear password (el password jamás en crudo en la BD)
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Crear usuario
    const insertRes = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );
    const user = insertRes.rows[0];

    // 4. Generar Tokens (access=JWT y refresh=string opaco)
    const accessToken = jwt.sign({ user_id: user.id, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
    const { token: refreshToken, tokenHash } = generateRefreshToken();
    
    // Expires_at + 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 5. Guardar Refresh en Auth BD
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    // 6. Setear Cockies HttpOnly
    reply.setCookie('access_token', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/'
    });
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/'
    });

    return reply.status(201).send({ message: 'Usuario registrado con éxito', user });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: 'Error interno del servidor registrando usuario' });
  }
};

exports.login = async (req, reply) => {
  const { email, password } = req.body;

  try {
    // 1. Buscar
    const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];

    // Se unifica el error de no existencia con contraseña inválida para no hacer enumeración (enumeración de credenciales)
    if (!user) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }

    // 2. Comparar pass
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return reply.status(401).send({ error: 'Credenciales inválidas' });
    }

    // 3. Revocar los RTs anteriores del usuario por buena práctica limitando sesiones
    await db.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [user.id]);

    // 4. Generar tokens nuevos
    const accessToken = jwt.sign({ user_id: user.id, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });
    const { token: refreshToken, tokenHash } = generateRefreshToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 5. Instertar hash a tabla RTs
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [user.id, tokenHash, expiresAt]
    );

    // 6. Setear Cookies
    reply.setCookie('access_token', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/'
    });
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/'
    });

    return reply.status(200).send({ message: 'Login exitoso', user: { id: user.id, name: user.name, email: user.email }});
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: 'Error del servidor en el login' });
  }
};

exports.refresh = async (req, reply) => {
  const token = req.cookies.refresh_token; 
  if (!token) {
    return reply.status(401).send({ error: 'Refresh token no proporcionado' });
  }

  try {
    // 1. Hashear el que viene en la cookie
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Verifcación de base de datos y revocación
    const rtRes = await db.query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    const storedToken = rtRes.rows[0];

    // Validaciones fuertes sobre existencia, expiración, y marca de revocación.
    if (!storedToken || storedToken.revoked || new Date() > storedToken.expires_at) {
      return reply.status(401).send({ error: 'Refresh token revocado o caduco' });
    }

    // 3. Obtener user a renovar
    const userRes = await db.query('SELECT id, email FROM users WHERE id = $1', [storedToken.user_id]);
    const user = userRes.rows[0];
    if(!user) return reply.status(401).send({ error: 'Usuario no existe' });

    // 4. Se inyecta nuevo access_token (Se podría rotar el RT acá pero lo simplificamos a refrendar Access Token)
    const accessToken = jwt.sign({ user_id: user.id, email: user.email }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXP });

    reply.setCookie('access_token', accessToken, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/'
    });

    return reply.status(200).send({ message: 'Token de acceso renovado exitosamente' });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: 'Error al renovar' });
  }
};

exports.logout = async (req, reply) => {
  const token = req.cookies.refresh_token;
  if (!token) return reply.status(200).send({ message: 'Salió de sesión existosamente' }); // Permisivo ante no-cookie

  try {
    // 1. Revocar de base de datos permanentemente
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await db.query('UPDATE refresh_tokens SET revoked=true WHERE token_hash = $1', [tokenHash]);

    // 2. Limpieza final de cookies instruccional para cliente navegador
    reply.clearCookie('access_token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/' });

    return reply.status(200).send({ message: 'Sesión cerrada. Refresh token revocado de DB' });
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: 'Error en logout' });
  }
};

exports.me = async (req, reply) => {
  const accToken = req.cookies.access_token;
  if (!accToken) return reply.status(401).send({ error: 'Falta token de acceso' });

  try {
    const decoded = jwt.verify(accToken, JWT_SECRET);
    // Info del usuario retornada desde la decodificación del stateless JWT mas query a DB para el nombre real
    const userRes = await db.query('SELECT name FROM users WHERE id = $1', [decoded.user_id]);
    const name = userRes.rows[0]?.name || '';
    return reply.status(200).send({ user: { user_id: decoded.user_id, email: decoded.email, name } });
  } catch(err) {
    return reply.status(401).send({ error: 'Token de acceso inválido' });
  }
};

exports.getUserById = async (req, reply) => {
  const { id } = req.params;
  try {
    const res = await db.query('SELECT id, name, email FROM users WHERE id = $1', [id]);
    if (res.rows.length === 0) {
      return reply.status(404).send({ error: 'Usuario no encontrado' });
    }
    return reply.status(200).send(res.rows[0]);
  } catch (error) {
    req.log.error(error);
    return reply.status(500).send({ error: 'Error obteniendo usuario' });
  }
};
