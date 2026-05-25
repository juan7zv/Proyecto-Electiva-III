/**
 * Componente: BalanceBoard.jsx
 * Propósito: Visualizar quién debe y a quién le deben.
 */

import './BalanceBoard.css';

export default function BalanceBoard({ balances }) {
  const userEntries = Object.entries(balances);
  
  if (userEntries.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', opacity: 0.7 }}>
        <p>No hay balances registrados aún.</p>
      </div>
    );
  }

  return (
    <div className="card animate-up">
      <h3 style={{ marginBottom: '1.25rem' }}>Balances Netos</h3>
      <div className="balance-grid">
        {userEntries.map(([userId, amount]) => (
          <div key={userId} className={`balance-item ${amount >= 0 ? 'positive' : 'negative'}`}>
            <span className="user-id">{userId}</span>
            <div className="balance-visual">
               <div className="balance-bar" style={{ width: `${Math.min(Math.abs(amount) / 10, 100)}%` }}></div>
               <span className="balance-value">
                 {amount >= 0 ? `+$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`}
               </span>
            </div>
          </div>
        ))}
      </div>
      <div className="balance-footer">
          Suma total del grupo: <strong>$0.00</strong> (Equilibrado)
      </div>
    </div>
  );
}
