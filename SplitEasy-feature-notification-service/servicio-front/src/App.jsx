// ============================================================
// App principal — SplitEasy Notification Service
// Enrutamiento básico con react-router-dom
// La ruta "/" dirige directamente al Centro de Notificaciones
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import NotificationsPage from './pages/NotificationsPage'

export default function App() {
  return (
    <BrowserRouter>
      {/* Navbar simplificada: solo logo + nombre del servicio */}
      <Navbar />

      {/* Enrutamiento principal */}
      <main>
        <Routes>
          {/* Ruta principal: Centro de Notificaciones */}
          <Route path="/" element={<NotificationsPage />} />

          {/* Cualquier otra ruta redirige al centro de notificaciones */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
