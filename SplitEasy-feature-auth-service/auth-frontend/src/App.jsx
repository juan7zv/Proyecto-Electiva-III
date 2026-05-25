/**
 * Archivo: App.jsx
 * Propósito: Componente raíz de la aplicación frontend.
 * Gestiona el estado global de autenticación y decide si mostrar
 * el formulario de login/registro o el dashboard protegido.
 */

import { useState, useEffect } from 'react';
import AuthForm from './components/AuthForm/AuthForm';
import Dashboard from './components/Dashboard/Dashboard';
import { ToastContainer } from './components/Toast/Toast';
import { getMe } from './services/authService';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  /**
   * Al montar la app, intenta recuperar la sesión existente
   * consultando /auth/me. Si hay cookies válidas, el usuario
   * pasa directo al dashboard sin necesidad de loguearse.
   */
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await getMe();
        if (data.user) {
          setUser(data.user);
        }
      } catch {
        // No hay sesión activa, se muestra el login
      } finally {
        setChecking(false);
      }
    };
    checkSession();
  }, []);

  /**
   * Callback cuando el usuario se autentica exitosamente.
   */
  const handleAuthSuccess = (userData) => {
    setUser(userData);
  };

  /**
   * Callback cuando el usuario cierra sesión.
   */
  const handleLogout = () => {
    setUser(null);
  };

  // Pantalla de carga mientras verificamos la sesión
  if (checking) {
    return (
      <>
        <ToastContainer />
        <div className="app-loading">
          <div className="app-loading-logo">S</div>
          <div className="app-loading-text">Verificando sesión...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <ToastContainer />
      {user ? (
        <Dashboard user={user} onLogout={handleLogout} />
      ) : (
        <AuthForm onAuthSuccess={handleAuthSuccess} />
      )}
    </>
  );
}

export default App;
