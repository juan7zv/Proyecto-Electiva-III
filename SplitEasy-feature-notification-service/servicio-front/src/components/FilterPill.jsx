// ============================================================
// Componente: FilterPill
// Pills/tabs para filtrar notificaciones por tipo
// ============================================================

import './FilterPill.css'

/**
 * @param {Object} props
 * @param {string} props.label — Texto visible del filtro
 * @param {boolean} props.active — Si este filtro está seleccionado
 * @param {Function} props.onClick — Callback al hacer click
 */
export default function FilterPill({ label, active, onClick }) {
  return (
    <button
      className={`filter-pill ${active ? 'filter-pill--active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  )
}
