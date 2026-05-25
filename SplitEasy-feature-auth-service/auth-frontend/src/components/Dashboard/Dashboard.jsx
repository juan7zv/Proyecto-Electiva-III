/**
 * Componente: Dashboard
 * Propósito: Vista protegida post-autenticación.
 * Permite al usuario:
 *  - Ver su perfil decodificado del JWT
 *  - Probar el endpoint /auth/me
 *  - Probar el refresh de tokens
 *  - Cerrar sesión (logout con revocación del refresh token)
 *  - Ver un log de respuestas HTTP del microservicio
 */

import { useState, useCallback } from 'react';
import { getMe, refreshToken, logoutUser } from '../../services/authService';
import { useToast } from '../Toast/Toast';
import './Dashboard.css';

export default function Dashboard({ user, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(null); // Qué acción está cargando
  const [sessionActive, setSessionActive] = useState(true);
  const toast = useToast();

  /**
   * Agrega una entrada al log visual de respuestas.
   */
  const addLog = useCallback((method, endpoint, response, isError = false) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('es-CO'),
      method,
      endpoint,
      response: typeof response === 'object' ? JSON.stringify(response, null, 2) : response,
      isError,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 20)); // Máximo 20 entradas
  }, []);

  /**
   * Prueba el endpoint GET /auth/me
   */
  const handleTestMe = async () => {
    setLoading('me');
    try {
      const data = await getMe();
      addLog('GET', '/auth/me', data);
      toast.success('Perfil obtenido', `Usuario: ${data.user.email}`);
      setSessionActive(true);
    } catch (error) {
      addLog('GET', '/auth/me', error.message, true);
      toast.error('Error en /auth/me', error.message);
      if (error.message.includes('401') || error.message.includes('inválido') || error.message.includes('Falta')) {
        setSessionActive(false);
      }
    } finally {
      setLoading(null);
    }
  };

  /**
   * Prueba el endpoint POST /auth/refresh
   */
  const handleRefresh = async () => {
    setLoading('refresh');
    try {
      const data = await refreshToken();
      addLog('POST', '/auth/refresh', data);
      toast.success('Token renovado', data.message);
      setSessionActive(true);
    } catch (error) {
      addLog('POST', '/auth/refresh', error.message, true);
      toast.error('Error al renovar', error.message);
    } finally {
      setLoading(null);
    }
  };

  /**
   * Ejecuta el logout y regresa al formulario de auth.
   */
  const handleLogout = async () => {
    setLoading('logout');
    try {
      const data = await logoutUser();
      addLog('POST', '/auth/logout', data);
      toast.info('Sesión cerrada', data.message);
      // Esperar medio segundo para que el toast se muestre
      setTimeout(() => onLogout(), 600);
    } catch (error) {
      addLog('POST', '/auth/logout', error.message, true);
      toast.error('Error al cerrar sesión', error.message);
      // Aún así regresamos al login
      setTimeout(() => onLogout(), 1000);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="dashboard">
      {/* Barra de navegación */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <div className="nav-logo">S</div>
          <span className="nav-title">SplitEasy</span>
        </div>
        <div className="nav-actions">
          <div className="nav-user-badge">
            <span className="nav-user-dot" />
            <span>{user?.email || 'usuario'}</span>
          </div>
          <button
            id="btn-logout"
            className="btn-logout"
            onClick={handleLogout}
            disabled={loading === 'logout'}
          >
            {loading === 'logout' ? 'Cerrando...' : 'Cerrar Sesión'}
          </button>
        </div>
      </nav>

      {/* Contenido principal */}
      <div className="dashboard-content">
        <div className="dashboard-welcome">
          <h2>¡Hola, {user?.name || 'Usuario'}! 👋</h2>
          <p>Panel de control del Auth Service — Prueba cada endpoint del microservicio.</p>
        </div>

        <div className="dashboard-grid">
          {/* Tarjeta de perfil */}
          <div className="card" style={{ animationDelay: '0.1s' }}>
            <div className="card-header">
              <div className="card-icon card-icon-accent">👤</div>
              <div>
                <div className="card-title">Tu Perfil</div>
                <div className="card-subtitle">Datos retornados por el servidor</div>
              </div>
            </div>
            <div className="profile-info">
              <div className="profile-row">
                <span className="profile-label">ID</span>
                <span className="profile-value">{user?.id || '—'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">Nombre</span>
                <span className="profile-value">{user?.name || '—'}</span>
              </div>
              <div className="profile-row">
                <span className="profile-label">Email</span>
                <span className="profile-value">{user?.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Tarjeta de estado de la sesión */}
          <div className="card" style={{ animationDelay: '0.2s' }}>
            <div className="card-header">
              <div className="card-icon card-icon-success">🔐</div>
              <div>
                <div className="card-title">Estado de Sesión</div>
                <div className="card-subtitle">Validez del Access Token</div>
              </div>
            </div>
            <div className="session-status">
              <div className={`session-indicator ${sessionActive ? 'session-active' : 'session-expired'}`}>
                <span className="session-indicator-dot" />
                {sessionActive ? 'Sesión Activa' : 'Token Expirado'}
              </div>
              <div className="session-detail">
                {sessionActive
                  ? 'El access_token JWT es válido (expira en 5 min).'
                  : 'Usa "Renovar Token" para obtener un nuevo Access Token.'}
              </div>
              <div className="session-detail" style={{ marginTop: '0.5rem' }}>
                Refresh Token: válido por 7 días
              </div>
            </div>
          </div>

          {/* Tarjeta de acciones de prueba */}
          <div className="card" style={{ animationDelay: '0.3s' }}>
            <div className="card-header">
              <div className="card-icon card-icon-warning">⚡</div>
              <div>
                <div className="card-title">Probar Endpoints</div>
                <div className="card-subtitle">Validar el funcionamiento del microservicio</div>
              </div>
            </div>
            <div className="test-actions">
              <button
                id="btn-test-me"
                className="btn-test"
                onClick={handleTestMe}
                disabled={loading === 'me'}
              >
                <span className="btn-test-icon">🔍</span>
                <div className="btn-test-content">
                  <span className="btn-test-label">
                    {loading === 'me' ? 'Consultando...' : 'GET /auth/me'}
                  </span>
                  <span className="btn-test-desc">Obtener perfil desde el JWT actual</span>
                </div>
              </button>

              <button
                id="btn-test-refresh"
                className="btn-test"
                onClick={handleRefresh}
                disabled={loading === 'refresh'}
              >
                <span className="btn-test-icon">🔄</span>
                <div className="btn-test-content">
                  <span className="btn-test-label">
                    {loading === 'refresh' ? 'Renovando...' : 'POST /auth/refresh'}
                  </span>
                  <span className="btn-test-desc">Renovar el Access Token usando Refresh Token</span>
                </div>
              </button>

              <button
                id="btn-test-logout"
                className="btn-test"
                onClick={handleLogout}
                disabled={loading === 'logout'}
              >
                <span className="btn-test-icon">🚪</span>
                <div className="btn-test-content">
                  <span className="btn-test-label">
                    {loading === 'logout' ? 'Cerrando...' : 'POST /auth/logout'}
                  </span>
                  <span className="btn-test-desc">Revocar el Refresh Token y limpiar cookies</span>
                </div>
              </button>
            </div>
          </div>

          {/* Tarjeta de log de respuestas */}
          <div className="card" style={{ animationDelay: '0.4s' }}>
            <div className="card-header">
              <div className="card-icon card-icon-accent">📋</div>
              <div>
                <div className="card-title">Log de Respuestas</div>
                <div className="card-subtitle">Últimas respuestas del microservicio</div>
              </div>
            </div>
            <div className="response-log">
              {logs.length === 0 ? (
                <div className="log-empty">
                  Prueba un endpoint para ver las respuestas aquí.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`log-entry ${log.isError ? 'log-error' : 'log-success'}`}
                  >
                    <div className="log-timestamp">{log.timestamp}</div>
                    <div>
                      <span className={`log-method ${log.method === 'GET' ? 'log-method-get' : 'log-method-post'}`}>
                        {log.method}
                      </span>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, fontSize: '0.75rem' }}>
                        {log.endpoint}
                      </span>
                    </div>
                    <pre className="log-content">{log.response}</pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
