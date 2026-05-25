/**
 * Archivo: App.jsx
 * Propósito: Raíz de la app de Gastos.
 */

import { ToastProvider } from './components/Toast/Toast';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';

function App() {
  // En un entorno real, este ID vendría del Auth Service / Gateway.
  // Usamos 'user-1' para pruebas locales del flujo de gastos.
  const DEBUG_USER_ID = 'user-1';

  return (
    <ToastProvider>
      <div className="app-layout animate-fade-in-up">
        <Dashboard userId={DEBUG_USER_ID} />
      </div>
    </ToastProvider>
  );
}

export default App;
