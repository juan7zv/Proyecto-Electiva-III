/**
 * Componente: ExpenseList.jsx
 * Propósito: Listado de gastos registrados en el sistema.
 */

import './ExpenseList.css';

export default function ExpenseList({ expenses, onDelete }) {
  if (!expenses || expenses.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <h3>No hay gastos registrados</h3>
          <p>Los gastos que crees aparecerán aquí.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
      <h3 style={{ marginBottom: '1.25rem' }}>Historial de Gastos</h3>
      <div className="expense-list">
        {expenses.map((exp) => (
          <div key={exp.id} className="expense-item">
            <div className="expense-info">
              <span className="expense-desc">{exp.description || 'Gasto sin descripción'}</span>
              <span className="expense-meta">
                Pagado por: <strong style={{color: 'var(--color-accent)'}}>{exp.paid_by}</strong> • Grupo ID: {exp.group_id}
              </span>
            </div>
            <div className="expense-amount-area">
              <span className="expense-amount">${exp.amount.toFixed(2)}</span>
              <button 
                className="btn-delete" 
                title="Eliminar gasto"
                onClick={() => onDelete(exp.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
