/**
 * Componente: ReportDashboard.jsx
 * Propósito: Visualización central de analíticas de gastos.
 */

import './ReportDashboard.css';

export default function ReportDashboard({ summary }) {
  if (!summary) return null;

  return (
    <div className="stats-grid animate-enter">
      <div className="card stat-card">
        <span className="stat-value">{summary.total_expenses_registered}</span>
        <span className="stat-label">Gastos Registrados</span>
      </div>
      <div className="card stat-card">
        <span className="stat-value">${summary.gross_total_spent?.toLocaleString()}</span>
        <span className="stat-label">Inversión Total del Grupo</span>
      </div>
      <div className="card stat-card">
        <span className="stat-value" style={{ color: 'var(--color-success)' }}>
          {summary.status === 'ready' ? 'Activo' : 'Simulado'}
        </span>
        <span className="stat-label">Estado de Sincronía</span>
      </div>
    </div>
  );
}
