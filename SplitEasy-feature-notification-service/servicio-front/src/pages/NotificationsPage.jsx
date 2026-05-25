// ============================================================
// Página: Centro de Notificaciones
// Pantalla principal y ÚNICA del servicio de notificaciones
// Conecta con el backend Python cuando está disponible,
// y cae a datos mock cuando no lo está.
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import NotificationCard from '../components/NotificationCard'
import FilterPill from '../components/FilterPill'
import EmptyState from '../components/EmptyState'
import './NotificationsPage.css'

// URL del backend — configurable via variable de entorno
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// Definición de filtros disponibles
const FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: 'expense_created', label: 'Gastos 💸' },
  { key: 'debt_settled', label: 'Deudas ✅' },
  { key: 'member_joined', label: 'Miembros 👤' },
]

// Datos mock de respaldo cuando el backend no está disponible
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    user_id: 'user_1',
    type: 'expense_created',
    message: 'Carlos registró un gasto de $45.00 en Cena Viernes',
    group_name: 'Roommates 🏠',
    amount: 45.0,
    read: false,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
  },
  {
    id: 2,
    user_id: 'user_1',
    type: 'debt_settled',
    message: 'María saldó su deuda de $22.50 contigo',
    group_name: 'Viaje Cartagena ✈️',
    amount: 22.5,
    read: false,
    created_at: new Date(Date.now() - 42 * 60000).toISOString(),
  },
  {
    id: 3,
    user_id: 'user_1',
    type: 'member_joined',
    message: 'Andrés se unió al grupo',
    group_name: 'Oficina Almuerzos 🍽️',
    amount: null,
    read: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 4,
    user_id: 'user_1',
    type: 'expense_created',
    message: 'Laura registró un gasto de $120.00 en Supermercado',
    group_name: 'Roommates 🏠',
    amount: 120.0,
    read: true,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 5,
    user_id: 'user_1',
    type: 'debt_settled',
    message: 'Pedro saldó su deuda de $15.75 contigo',
    group_name: 'Oficina Almuerzos 🍽️',
    amount: 15.75,
    read: true,
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
  },
  {
    id: 6,
    user_id: 'user_1',
    type: 'member_joined',
    message: 'Sofía se unió al grupo',
    group_name: 'Viaje Cartagena ✈️',
    amount: null,
    read: false,
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: 7,
    user_id: 'user_1',
    type: 'expense_created',
    message: 'Tú registraste un gasto de $89.90 en Gasolina',
    group_name: 'Roommates 🏠',
    amount: 89.9,
    read: false,
    created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
  },
  {
    id: 8,
    user_id: 'user_1',
    type: 'debt_settled',
    message: 'Juan saldó su deuda de $33.25 contigo',
    group_name: 'Roommates 🏠',
    amount: 33.25,
    read: false,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
]

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [usingMock, setUsingMock] = useState(false)

  // Conteo de no leídas para el título dinámico y el badge
  const unreadCount = notifications.filter((n) => !n.read).length

  // Título dinámico de la pestaña
  usePageTitle(unreadCount > 0 ? `Notificaciones (${unreadCount})` : 'Notificaciones')

  // ============================================================
  // Carga inicial de notificaciones desde el backend o mock
  // ============================================================
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/notifications?user_id=user_1`)
      if (!res.ok) throw new Error('Error del servidor')
      const data = await res.json()
      setNotifications(data)
      setUsingMock(false)
    } catch {
      // Si el backend no está disponible, usar datos mock
      console.warn('⚠️ Backend no disponible. Usando datos mock.')
      setNotifications(MOCK_NOTIFICATIONS)
      setUsingMock(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // ============================================================
  // Marcar UNA notificación como leída
  // ============================================================
  const handleMarkRead = async (id) => {
    // Actualizar UI inmediatamente (optimistic update)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )

    if (!usingMock) {
      try {
        await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PATCH' })
      } catch {
        console.warn('⚠️ No se pudo sincronizar con el backend.')
      }
    }
  }

  // ============================================================
  // Marcar TODAS como leídas
  // ============================================================
  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

    if (!usingMock) {
      try {
        await fetch(`${API_URL}/notifications/read-all?user_id=user_1`, {
          method: 'PATCH',
        })
      } catch {
        console.warn('⚠️ No se pudo sincronizar con el backend.')
      }
    }
  }

  // ============================================================
  // Filtrar notificaciones por tipo activo
  // ============================================================
  const filteredNotifications =
    activeFilter === 'all'
      ? notifications
      : notifications.filter((n) => n.type === activeFilter)

  // Label del filtro activo (para el EmptyState)
  const activeFilterLabel =
    FILTERS.find((f) => f.key === activeFilter)?.label || 'Todas'

  return (
    <div className="notifications-page">
      {/* === Header de la sección === */}
      <header className="notifications-page__header">
        <div className="notifications-page__title-row">
          <div className="notifications-page__title-group">
            <Bell size={28} strokeWidth={1.75} className="notifications-page__bell-icon" />
            <h1 className="notifications-page__title">Notificaciones</h1>
            {unreadCount > 0 && (
              <span className="notifications-page__badge">{unreadCount}</span>
            )}
          </div>

          {unreadCount > 0 && (
            <button
              className="notifications-page__mark-all-btn"
              onClick={handleMarkAllRead}
              type="button"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Indicador de si estamos usando datos mock */}
        {usingMock && (
          <div className="notifications-page__mock-badge">
            <span>Modo simulado</span> — Sin conexión al backend
          </div>
        )}
      </header>

      {/* === Filtros (pills de tipo) === */}
      <div className="notifications-page__filters">
        {FILTERS.map((filter) => (
          <FilterPill
            key={filter.key}
            label={filter.label}
            active={activeFilter === filter.key}
            onClick={() => setActiveFilter(filter.key)}
          />
        ))}
      </div>

      {/* === Lista de notificaciones o estado vacío === */}
      <div className="notifications-page__list">
        {loading ? (
          <div className="notifications-page__loading">
            <div className="notifications-page__spinner" />
            <p>Cargando notificaciones...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <EmptyState filterLabel={activeFilterLabel} />
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
            />
          ))
        )}
      </div>
    </div>
  )
}
