/**
 * Archivo: App.jsx
 * Propósito: Raíz de la app de Reportería Analítica.
 */

import { useState, useEffect } from 'react';
import ReportDashboard from './components/ReportDashboard/ReportDashboard';
import SettlementCard from './components/SettlementCard/SettlementCard';
import HistoryTable from './components/HistoryTable/HistoryTable';
import { getReport } from './services/reportService';
import './App.css';

function App() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const GROUP_ID = 'default-group-id';

  useEffect(() => {
    async function fetchReport() {
      try {
        setLoading(true);
        const data = await getReport(GROUP_ID);
        setReport(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, []);

  return (
    <div className="report-container">
      <header className="report-header animate-enter">
        <h1>SplitEasy Analytics 📊</h1>
        <p>Agregación de datos en tiempo real de múltiples microservicios.</p>
      </header>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="loader"></div>
          <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
            Generando reporte dinámico...
          </p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--color-error)' }}>
           <h3 style={{ color: 'var(--color-error)' }}>Fallo en la generación</h3>
           <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>{error}</p>
        </div>
      )}

      {report && !loading && (
        <div className="report-layout">
           <ReportDashboard summary={report.summary} />
           
           <div className="report-main-grid">
              <SettlementCard plan={report.optimal_settlement_plan} />
              
              <div className="card animate-enter" style={{ animationDelay: '0.3s' }}>
                 <h3>Balances Netos</h3>
                 <div style={{ marginTop: '1.5rem' }}>
                    {Object.entries(report.balances).map(([user, bal]) => (
                       <div key={user} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                          <span style={{ fontWeight: '600' }}>{user}</span>
                          <span style={{ color: bal >= 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: '800' }}>
                             {bal >= 0 ? `+$${bal.toFixed(2)}` : `-$${Math.abs(bal).toFixed(2)}`}
                          </span>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           <HistoryTable expenses={report.expense_historicals} />
        </div>
      )}
    </div>
  );
}

export default App;
