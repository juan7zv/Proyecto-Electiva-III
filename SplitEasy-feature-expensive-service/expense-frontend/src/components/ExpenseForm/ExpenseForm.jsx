/**
 * Componente: ExpenseForm.jsx
 * Propósito: Registro de gastos con división de montos (Splits).
 */

import { useState, useEffect } from 'react';
import './ExpenseForm.css';

const MOCK_MEMBERS = [
  { id: 'user-1', name: 'Juan Pérez' },
  { id: 'user-2', name: 'Maria Gomez' },
  { id: 'user-3', name: 'Carlos Ruiz' },
];

export default function ExpenseForm({ onSubmit, currentUser }) {
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splits, setSplits] = useState(
    MOCK_MEMBERS.map(m => ({ user_id: m.id, name: m.name, amount_owed: 0 }))
  );

  // Cada vez que cambia el monto total, dividimos equitativamente por defecto
  const handleAutoSplit = () => {
    const amount = parseFloat(totalAmount) || 0;
    const splitAmount = (amount / MOCK_MEMBERS.length).toFixed(2);
    setSplits(prev => prev.map(s => ({ ...s, amount_owed: splitAmount })));
  };

  const handleSplitChange = (userId, value) => {
    setSplits(prev => prev.map(s => 
      s.user_id === userId ? { ...s, amount_owed: value } : s
    ));
  };

  const currentSplitsTotal = splits.reduce((acc, s) => acc + (parseFloat(s.amount_owed) || 0), 0);
  const isValid = Math.abs(currentSplitsTotal - parseFloat(totalAmount)) < 0.01;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid) return;

    const payload = {
      group_id: 'default-group-id', // Mocked for validation
      amount: parseFloat(totalAmount),
      description,
      splits: splits.map(({ user_id, amount_owed }) => ({
        user_id,
        amount_owed: parseFloat(amount_owed)
      }))
    };

    onSubmit(payload);
    // Reset
    setDescription('');
    setTotalAmount('');
    setSplits(MOCK_MEMBERS.map(m => ({ user_id: m.id, name: m.name, amount_owed: 0 })));
  };

  return (
    <div className="card animate-fade-in-up">
      <h3 style={{ marginBottom: '1rem' }}>Registrar Nuevo Gasto</h3>
      <form onSubmit={handleSubmit} className="expense-form">
        <div className="input-row">
          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input 
              className="form-input" 
              placeholder="Ej: Cena del viernes" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Monto Total ($)</label>
            <input 
              className="form-input" 
              type="number" 
              step="0.01" 
              placeholder="0.00"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="splits-section">
          <div className="splits-title">
            <span>¿Quién debe cuánto?</span>
            <button type="button" className="auth-toggle-link" onClick={handleAutoSplit}>
              Dividir equitativamente
            </button>
          </div>
          
          {splits.map(member => (
            <div key={member.user_id} className="split-item">
              <span className="split-user">{member.name} {member.user_id === currentUser && '(Yo)'}</span>
              <span className="color-text-muted">$</span>
              <input 
                className="form-input split-input" 
                type="number" 
                step="0.01"
                value={member.amount_owed}
                onChange={e => handleSplitChange(member.user_id, e.target.value)}
              />
            </div>
          ))}

          {!isValid && totalAmount > 0 && (
            <div className="validation-error">
              La suma (${currentSplitsTotal.toFixed(2)}) no coincide con el total (${parseFloat(totalAmount).toFixed(2)})
            </div>
          )}
        </div>

        <button 
          className="btn-primary" 
          type="submit" 
          disabled={!isValid || totalAmount <= 0}
        >
          Guardar Gasto
        </button>
      </form>
    </div>
  );
}
