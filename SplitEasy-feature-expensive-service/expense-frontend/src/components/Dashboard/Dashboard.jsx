/**
 * Componente: Dashboard.jsx
 * Propósito: Orquestación de la vista de gastos.
 */

import { useState, useEffect } from 'react';
import ExpenseForm from '../ExpenseForm/ExpenseForm';
import ExpenseList from '../ExpenseList/ExpenseList';
import { createExpense, getExpenses, deleteExpense } from '../../services/expenseService';
import { useToast } from '../Toast/Toast';

export default function Dashboard({ userId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const GROUP_ID = 'default-group-id';

  const fetchExpenses = async () => {
    try {
      const data = await getExpenses(GROUP_ID);
      setExpenses(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (payload) => {
    try {
      await createExpense(payload, userId);
      toast.success('Gasto guardado', 'Se ha registrado el gasto y las deudas correctamente.');
      fetchExpenses();
    } catch (error) {
      toast.error('Error', error.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await deleteExpense(id);
      toast.info('Eliminado', 'El gasto ha sido removido.');
      fetchExpenses();
    } catch (error) {
      toast.error('Error', error.message);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
      <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>SplitEasy Expenses 💸</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
          Gestión de gastos transaccionales y asincronía.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1.5fr', gap: '2rem' }}>
        <div>
          <ExpenseForm onSubmit={handleAddExpense} currentUser={userId} />
          
          <div className="card" style={{ marginTop: '1.5rem', borderLeft: '4px solid var(--color-accent)' }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Modo Debug</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Usuario Activo: <strong>{userId}</strong>
            </p>
            <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
              Nota: El Expense Service usa el header <code>X-User-ID</code> desde el API Gateway.
            </p>
          </div>
        </div>

        <div>
          <ExpenseList expenses={expenses} onDelete={handleDeleteExpense} />
        </div>
      </div>
    </div>
  );
}
