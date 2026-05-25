/**
 * Archivo: services/authService.js
 * Propósito: Capa de comunicación con el microservicio Auth Service.
 * Todas las peticiones incluyen credentials: 'include' para enviar/recibir
 * las cookies HttpOnly que maneja el backend.
 */

// En desarrollo, Vite proxy redirige las peticiones /auth/* al backend (localhost:3001)
// En producción, cambiar esta URL al dominio del backend desplegado
const API_BASE = '';

/**
 * Maneja la respuesta de fetch y lanza errores con mensajes descriptivos.
 */
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Error ${response.status}`);
  }
  return data;
}

/**
 * Registra un nuevo usuario.
 * @param {string} name - Nombre completo del usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Datos del usuario creado
 */
export async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ name, email, password }),
  });
  return handleResponse(response);
}

/**
 * Inicia sesión con email y contraseña.
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Datos del usuario autenticado
 */
export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
}

/**
 * Renueva el access_token usando el refresh_token de la cookie.
 * @returns {Promise<Object>} Mensaje de confirmación
 */
export async function refreshToken() {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(response);
}

/**
 * Cierra la sesión del usuario y revoca el refresh token.
 * @returns {Promise<Object>} Mensaje de confirmación
 */
export async function logoutUser() {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  return handleResponse(response);
}

/**
 * Obtiene la información del usuario autenticado actual.
 * @returns {Promise<Object>} Datos del usuario desde el JWT
 */
export async function getMe() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });
  return handleResponse(response);
}
