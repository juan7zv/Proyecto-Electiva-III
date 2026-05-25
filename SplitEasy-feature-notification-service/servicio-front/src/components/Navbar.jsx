// ============================================================
// Componente: Navbar simplificada
// Solo logo "SplitEasy" + título "Notification Service"
// Sin links de navegación a otras pantallas
// ============================================================

import { Bell } from 'lucide-react'
import './Navbar.css'

export default function Navbar() {
  return (
    <nav className="navbar">
      {/* Logo y nombre de la app */}
      <div className="navbar__brand">
        <div className="navbar__icon">
          <Bell size={18} />
        </div>
        <span className="navbar__logo-text">SplitEasy</span>
      </div>

      {/* Nombre del servicio */}
      <span className="navbar__service-name">Notification Service</span>
    </nav>
  )
}
