/**
 * Archivo: services/reportService.js
 * Propósito: Consumir la Cloud Function de Reportes (Python).
 */

const API_BASE = '/report'; // Proxy de Vite

/**
 * Obtiene el reporte agregado para un grupo.
 */
export async function getReport(groupId) {
  const response = await fetch(`${API_BASE}?group_id=${groupId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Fallo al generar el reporte analítico');
  }
  return data;
}
