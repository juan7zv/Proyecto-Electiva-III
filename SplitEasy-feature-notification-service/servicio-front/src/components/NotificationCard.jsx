// ============================================================
// Componente: NotificationCard
// Tarjeta individual de notificación con icono, estado y click
// ============================================================

import { DollarSign, CheckCircle, UserPlus } from 'lucide-react'
import './NotificationCard.css'

/**
 * Mapa de configuración por tipo de notificación:
 * icono, color y label descriptivo
 */
const TYPE_CONFIG = {
  expense_created: {
    icon: DollarSign,
    color: 'var(--warning)',
    label: 'Gasto',
  },
  debt_settled: {
    icon: CheckCircle,
    color: 'var(--positive)',
    label: 'Saldado',
  },
  member_joined: {
    icon: UserPlus,
    color: 'var(--accent-cyan)',
    label: 'Miembro',
  },
}

/**
 * Calcula el texto relativo del timestamp ("hace X minutos/horas")
 */
function timeAgo(dateString) {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'Justo ahora'
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`

  const diffDays = Math.floor(diffHours / 24)
  return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`
}

/**
 * @param {Object} props
 * @param {Object} props.notification — Datos de la notificación
 * @param {Function} props.onMarkRead — Callback para marcar como leída
 */
export default function NotificationCard({ notification, onMarkRead }) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.expense_created
  const IconComponent = config.icon
  const isUnread = !notification.read

  return (
    <div
      className={`notification-card ${isUnread ? 'notification-card--unread' : ''}`}
      onClick={() => isUnread && onMarkRead(notification.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && isUnread) onMarkRead(notification.id)
      }}
    >
      {/* Icono del tipo de notificación */}
      <div className="notification-card__icon" style={{ color: config.color }}>
        <IconComponent size={22} strokeWidth={1.75} />
      </div>

      {/* Contenido principal */}
      <div className="notification-card__content">
        <p className="notification-card__message">{notification.message}</p>
        <div className="notification-card__meta">
          <span className="notification-card__group">{notification.group_name}</span>
          <span className="notification-card__separator">·</span>
          <span className="notification-card__time">{timeAgo(notification.created_at)}</span>
          {notification.amount != null && (
            <>
              <span className="notification-card__separator">·</span>
              <span className="notification-card__amount font-mono">
                ${notification.amount.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Indicador de no leída: punto cyan */}
      {isUnread && (
        <div className="notification-card__unread-dot" aria-label="No leída" />
      )}
    </div>
  )
}
