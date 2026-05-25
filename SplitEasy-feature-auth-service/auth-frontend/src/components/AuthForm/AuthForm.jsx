/**
 * Componente: AuthForm
 * Propósito: Formulario de Login/Registro con animaciones y validación.
 * Se comunica con el auth-service mediante authService.js.
 */

import { useState } from 'react';
import { registerUser, loginUser } from '../../services/authService';
import { useToast } from '../Toast/Toast';
import './AuthForm.css';

export default function AuthForm({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const toast = useToast();

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones básicas del lado del cliente
    if (!formData.email || !formData.password) {
      toast.error('Campos requeridos', 'Completa email y contraseña');
      return;
    }

    if (!isLogin && !formData.name) {
      toast.error('Campo requerido', 'Ingresa tu nombre para registrarte');
      return;
    }

    if (formData.password.length < 4) {
      toast.error('Contraseña muy corta', 'La contraseña debe tener al menos 4 caracteres');
      return;
    }

    setLoading(true);

    try {
      let result;

      if (isLogin) {
        result = await loginUser(formData.email, formData.password);
        toast.success('¡Bienvenido!', result.message);
      } else {
        result = await registerUser(formData.name, formData.email, formData.password);
        toast.success('¡Cuenta creada!', result.message);
      }

      // Notificar al componente padre del éxito
      onAuthSuccess(result.user);
    } catch (error) {
      toast.error(
        isLogin ? 'Error al iniciar sesión' : 'Error al registrarte',
        error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setFormData({ name: '', email: '', password: '' });
  };

  return (
    <div className="auth-page">
      <div className="auth-container animate-scale-in">
        {/* Lado izquierdo: Branding */}
        <div className="auth-branding">
          <div className="branding-logo">S</div>
          <h1 className="branding-title">SplitEasy</h1>
          <p className="branding-subtitle">
            Divide gastos de forma inteligente con tus amigos y familiares.
          </p>

          <div className="branding-features">
            <div className="branding-feature">
              <span className="branding-feature-icon">🔐</span>
              <span>Autenticación segura con JWT y Cookies HttpOnly</span>
            </div>
            <div className="branding-feature">
              <span className="branding-feature-icon">🔄</span>
              <span>Renovación automática de sesión con Refresh Tokens</span>
            </div>
            <div className="branding-feature">
              <span className="branding-feature-icon">🛡️</span>
              <span>Contraseñas protegidas con cifrado bcrypt</span>
            </div>
          </div>
        </div>

        {/* Lado derecho: Formulario */}
        <div className="auth-form-side">
          <div className="auth-form-header">
            <h2 className="auth-form-title">
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </h2>
            <p className="auth-form-desc">
              {isLogin
                ? 'Ingresa tus credenciales para acceder a tu cuenta.'
                : 'Regístrate para empezar a dividir gastos fácilmente.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} id="auth-form">
            {/* Campo Nombre - Solo visible en registro */}
            {!isLogin && (
              <div className="form-group animate-fade-in-up">
                <label className="form-label" htmlFor="auth-name">
                  Nombre completo
                </label>
                <div className="form-input-wrapper">
                  <input
                    id="auth-name"
                    className="form-input"
                    type="text"
                    name="name"
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                  />
                  <span className="form-input-icon">👤</span>
                </div>
              </div>
            )}

            {/* Campo Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">
                Correo electrónico
              </label>
              <div className="form-input-wrapper">
                <input
                  id="auth-email"
                  className="form-input"
                  type="email"
                  name="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
                <span className="form-input-icon">✉️</span>
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">
                Contraseña
              </label>
              <div className="form-input-wrapper">
                <input
                  id="auth-password"
                  className="form-input"
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <span className="form-input-icon">🔒</span>
              </div>
            </div>

            {/* Botón de envío */}
            <button
              id="auth-submit-btn"
              className="btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading && <span className="spinner" />}
              {loading
                ? 'Procesando...'
                : isLogin
                  ? 'Iniciar Sesión'
                  : 'Crear Cuenta'}
            </button>
          </form>

          {/* Toggle entre login/registro */}
          <div className="auth-toggle">
            {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
            <button
              id="auth-toggle-btn"
              className="auth-toggle-link"
              type="button"
              onClick={toggleMode}
            >
              {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
