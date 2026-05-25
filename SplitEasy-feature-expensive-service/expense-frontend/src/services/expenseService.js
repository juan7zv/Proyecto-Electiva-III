/**
 * Archivo: services/expenseService.js
 * Propósito: Comunicación con el microservicio de Gastos (Go/Gin).
 */

const API_BASE = '/expenses'; // Usaremos Vite Proxy

/**
 * Registra un nuevo gasto con sus divisiones (splits).
 */
export async function createExpense(expenseData, userId) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-User-ID': userId 
    },
    body: JSON.stringify(expenseData),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al crear gasto');
  return data;
}

/**
 * Obtiene la lista de gastos de un grupo.
 */
export async function getExpenses(groupId) {
  const response = await fetch(`${API_BASE}?group_id=${groupId}`, {
    method: 'GET',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al listar gastos');
  return data;
}

/**
 * Elimina un gasto por ID.
 */
export async function deleteExpense(expenseId) {
  const response = await fetch(`${API_BASE}/${expenseId}`, {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al eliminar');
  return data;
}
