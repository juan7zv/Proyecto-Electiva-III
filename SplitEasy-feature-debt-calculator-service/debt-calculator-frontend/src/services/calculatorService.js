/**
 * Archivo: services/calculatorService.js
 * Propósito: Interfaz con el microservicio Debt Calculator (FastAPI).
 */

const API_BASE = ''; // Usaremos Vite Proxy

/**
 * Obtiene los saldos netos por grupo.
 */
export async function getBalances(groupId) {
  const response = await fetch(`${API_BASE}/balances/${groupId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Error al obtener balances');
  return data;
}

/**
 * Obtiene el plan de liquidación óptimo.
 */
export async function getOptimalDebts(groupId) {
  const response = await fetch(`${API_BASE}/debts/${groupId}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Error al obtener plan de deudas');
  return data;
}

/**
 * Simula un evento de recálculo (webhook).
 */
export async function recalculateBalances(eventData) {
  const response = await fetch(`${API_BASE}/balances/recalculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Error en recálculo');
  return data;
}
