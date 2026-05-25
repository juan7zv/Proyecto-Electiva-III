// ============================================================
// Componente: EmptyState
// Vista cuando no hay notificaciones o el filtro no tiene resultados
// ============================================================

import { BellOff } from 'lucide-react'
import './EmptyState.css'

/**
 * @param {Object} props
 * @param {string} props.filterLabel — Nombre del filtro activo para el subtexto
 */
export default function EmptyState({ filterLabel }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">
        <BellOff size={48} strokeWidth={1.25} />
      </div>
      <p className="empty-state__title">No hay notificaciones</p>
      <p className="empty-state__subtitle">
        {filterLabel === 'Todas'
          ? 'Cuando recibas notificaciones de tus grupos, aparecerán aquí.'
          : `No hay notificaciones de tipo "${filterLabel}" por el momento.`}
      </p>
    </div>
  )
}
