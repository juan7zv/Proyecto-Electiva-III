/**
 * Componente: SettlementCard.jsx
 * Propósito: Visualizar el plan de liquidación óptimo de deudas.
 */

import './SettlementCard.css';

export default function SettlementCard({ plan }) {
  if (!plan || plan.length === 0) {
    return (
      <div className="card animate-enter" style={{ animationDelay: '0.2s' }}>
        <h3 style={{ marginBottom: '1rem' }}>Plan de Liquidación ✅</h3>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
          ¡Felicidades! No hay deudas pendientes en este grupo.
        </p>
      </div>
    );
  }

  return (
    <div className="card animate-enter" style={{ animationDelay: '0.2s' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Plan de Liquidación Óptimo 💸</h3>
      <div className="settlement-list">
        {plan.map((debt, index) => (
          <div key={index} className="settlement-item">
            <div className="party-source">
               <span className="party-name">{debt.from}</span>
               <span className="party-label">Debe pagar</span>
            </div>
            
            <div className="settlement-arrow">
               <span className="amount-bubble">${debt.amount.toFixed(2)}</span>
               <div className="arrow-line"></div>
            </div>

            <div className="party-target">
               <span className="party-label">A favor de</span>
               <span className="party-name">{debt.to}</span>
            </div>
          </div>
        ))}
      </div>
      <p className="settlement-footer">
        Este plan minimiza el número total de transacciones bancarias.
      </p>
    </div>
  );
}
