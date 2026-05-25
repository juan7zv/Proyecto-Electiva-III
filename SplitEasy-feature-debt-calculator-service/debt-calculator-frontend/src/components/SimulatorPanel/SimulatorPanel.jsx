/**
 * Componente: SimulatorPanel.jsx
 * Propósito: Permitir inyectar eventos de gasto para ver el recálculo asíncrono.
 */

import { useState } from 'react';
import './SimulatorPanel.css';

export default function SimulatorPanel({ onRecalculate }) {
  const [amount, setAmount] = useState('300');
  const [paidBy, setPaidBy] = useState('user-1');
  
  const handleSimulate = () => {
    const total = parseFloat(amount);
    // Simula división equitativa entre 3 usuarios fijos para el test
    const event = {
      expense_id: `test-${Date.now()}`,
      group_id: 'default-group-id',
      paid_by: paidBy,
      amount: total,
      splits: [
        { user_id: 'user-1', amount_owed: total / 3 },
        { user_id: 'user-2', amount_owed: total / 3 },
        { user_id: 'user-3', amount_owed: total / 3 }
      ]
    };
    onRecalculate(event);
  };

  return (
    <div className="card simulate-panel animate-up" style={{ animationDelay: '0.4s' }}>
      <h3 style={{ marginBottom: '1rem' }}>⚡ Simulador de Eventos</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
        Inyecta un gasto ficticio para validar el recálculo automático en Redis.
      </p>

      <div className="sim-form">
        <div className="form-group">
          <label className="form-label">Quién pagó</label>
          <select className="form-input" value={paidBy} onChange={e => setPaidBy(e.target.value)}>
            <option value="user-1">Juan Pérez (user-1)</option>
            <option value="user-2">Maria Gomez (user-2)</option>
            <option value="user-3">Carlos Ruiz (user-3)</option>
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Monto ($)</label>
          <input 
            className="form-input" 
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <button className="btn-primary" onClick={handleSimulate}>
          Simular Gasto (Split 33% c/u)
        </button>
      </div>
    </div>
  );
}
