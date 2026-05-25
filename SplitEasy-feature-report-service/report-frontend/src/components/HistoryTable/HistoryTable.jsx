/**
 * Componente: HistoryTable.jsx
 * Propósito: Listado detallado de gastos históricos en el reporte.
 */

import './HistoryTable.css';

export default function HistoryTable({ expenses }) {
  if (!expenses || expenses.length === 0) return null;

  return (
    <div className="card animate-enter" style={{ animationDelay: '0.4s', marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Historial de Gastos Incluidos</h3>
      <div className="table-wrapper">
         <table className="report-table">
            <thead>
               <tr>
                  <th>Descripción</th>
                  <th>Pagado por</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
               </tr>
            </thead>
            <tbody>
               {expenses.map((e, idx) => (
                  <tr key={idx}>
                     <td>{e.description || 'Sin descripción'}</td>
                     <td>{e.paid_by}</td>
                     <td style={{ textAlign: 'right', fontWeight: '700' }}>
                        ${parseFloat(e.amount).toFixed(2)}
                     </td>
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
    </div>
  );
}
