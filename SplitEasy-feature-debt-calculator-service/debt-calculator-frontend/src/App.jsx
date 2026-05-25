/**
 * Archivo: App.jsx
 * Propósito: Orquestador del Debt Calculator Dashboard.
 */

import { useState, useEffect } from 'react';
import BalanceBoard from './components/BalanceBoard/BalanceBoard';
import SettlementPlan from './components/SettlementPlan/SettlementPlan';
import SimulatorPanel from './components/SimulatorPanel/SimulatorPanel';
import { getBalances, getOptimalDebts, recalculateBalances } from './services/calculatorService';
import './App.css';

function App() {
  const [balances, setBalances] = useState({});
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const GROUP_ID = 'default-group-id';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [bals, dbtPlan] = await Promise.all([
        getBalances(GROUP_ID),
        getOptimalDebts(GROUP_ID)
      ]);
      setBalances(bals);
      setDebts(dbtPlan);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecalculate = async (event) => {
    try {
      await recalculateBalances(event);
      // Tras enviar el evento asíncrono, refrescamos la vista para ver el impacto en Redis
      fetchData();
    } catch (err) {
      alert('Error recalculando: ' + err.message);
    }
  };

  return (
    <div className="layout">
      <header className="header animate-up">
        <div className="logo-container">
          <div className="logo-icon">⚖️</div>
          <div>
            <h1>SplitEasy Debt Calculator</h1>
            <p>Algoritmo Greedy para minimización de deudas</p>
          </div>
        </div>
      </header>

      {error && (
        <div className="card" style={{ borderColor: 'var(--color-error)', marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--color-error)' }}>⚠️ Error de Conexión</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
            No se pudo contactar con el microservicio de Cálculo o con la base de datos Redis.
          </p>
          <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={fetchData}>Reintentar</button>
        </div>
      )}

      {loading && !error && (
        <div style={{ padding: '4rem', textAlign: 'center' }}>
          <div className="loader"></div>
          <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>Optimizando deudas del grupo...</p>
        </div>
      )}

      {!loading && !error && (
        <div className="main-grid">
           <div className="side-panel">
              <BalanceBoard balances={balances} />
              <SimulatorPanel onRecalculate={handleRecalculate} />
           </div>

           <div className="main-panel">
              <SettlementPlan debts={debts} />
              
              <div className="card info-card animate-up" style={{ animationDelay: '0.5s' }}>
                 <h3>Sobre el algoritmo</h3>
                 <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    Este microservicio implementa una optimización transaccional. En lugar de que cada persona pague a quien le debe directamente, 
                    el sistema agrega los saldos netos y utiliza un algoritmo <strong>Greedy</strong> para encontrar el camino más corto de pago. 
                    Esto garantiza que el número de transferencias bancarias sea el mínimo absoluto posible.
                 </p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
