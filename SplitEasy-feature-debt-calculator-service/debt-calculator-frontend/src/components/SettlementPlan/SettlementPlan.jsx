/**
 * Componente: SettlementPlan.jsx
 * Propósito: Listado de transacciones recomendadas.
 */

import './SettlementPlan.css';

export default function SettlementPlan({ debts }) {
  if (!debts || debts.length === 0) {
    return (
      <div className="card animate-up" style={{ animationDelay: '0.2s', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--color-success)' }}>¡Todo al día! ✨</h3>
        <p style={{ color: 'var(--color-text-secondary)' }}>No hay deudas pendientes en el grupo.</p>
      </div>
    );
  }

  return (
    <div className="card animate-up" style={{ animationDelay: '0.2s' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Plan de Liquidación Óptimo</h3>
      <div className="debt-list">
        {debts.map((debt, index) => (
          <div key={index} className="debt-card">
            <div className="debt-parties">
              <div className="party">
                <span className="party-role">Deudor</span>
                <span className="party-id">{debt.from}</span>
              </div>
              <div className="debt-arrow">➜</div>
              <div className="party">
                <span className="party-role">Acreedor</span>
                <span className="party-id">{debt.to}</span>
              </div>
            </div>
            <div className="debt-info">
              <span className="debt-amount">${debt.amount.toFixed(2)}</span>
              <button className="btn-settle" onClick={() => alert('Simulación: Pago registrado en el Core')}>
                Saldar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
