/**
 * Componente: Toast
 * Propósito: Sistema de notificaciones flotantes para feedback
 * visual al usuario (éxitos, errores, información).
 */

import { useState, useEffect, useCallback } from 'react';
import './Toast.css';

let toastIdCounter = 0;
let addToastGlobal = null;

/**
 * Hook global para disparar toasts desde cualquier parte de la app.
 */
export function useToast() {
  return {
    success: (title, message) => addToastGlobal?.({ type: 'success', title, message }),
    error: (title, message) => addToastGlobal?.({ type: 'error', title, message }),
    info: (title, message) => addToastGlobal?.({ type: 'info', title, message }),
  };
}

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { ...toast, id }]);

    // Auto-cerrar después de 4 segundos
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 250);
    }, 4000);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => { addToastGlobal = null; };
  }, [addToast]);

  const removeToast = (id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 250);
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type} ${toast.exiting ? 'toast-exit' : ''}`}
        >
          <span className="toast-icon">{ICONS[toast.type]}</span>
          <div className="toast-body">
            <div className="toast-title">{toast.title}</div>
            {toast.message && <div className="toast-message">{toast.message}</div>}
          </div>
          <button className="toast-close" onClick={() => removeToast(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
