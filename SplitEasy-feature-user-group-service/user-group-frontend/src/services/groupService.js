/**
 * Archivo: services/groupService.js
 * Propósito: Interfaz con el microservicio User-Group (Go).
 */

const API_BASE = '/api'; // Vite Proxy a 8082

export async function getMyProfile() {
  const response = await fetch(`${API_BASE}/users/me`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al obtener perfil');
  return data;
}

export async function listGroups() {
  const response = await fetch(`${API_BASE}/groups`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al listar grupos');
  return data;
}

export async function createGroup(groupData) {
  const response = await fetch(`${API_BASE}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(groupData)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al crear grupo');
  return data;
}

export async function inviteMember(groupId, userId) {
  const response = await fetch(`${API_BASE}/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Error al invitar miembro');
  return data;
}
