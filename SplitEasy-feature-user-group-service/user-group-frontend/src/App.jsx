/**
 * Archivo: App.jsx
 * Propósito: Raíz del módulo de Usuarios y Grupos.
 */

import { useState, useEffect } from 'react';
import GroupExplorer from './components/GroupExplorer/GroupExplorer';
import ProfileEditor from './components/ProfileEditor/ProfileEditor';
import GroupCreator from './components/GroupCreator/GroupCreator';
import { getMyProfile, listGroups, createGroup } from './services/groupService';
import './App.css';

function App() {
  const [profile, setProfile] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('groups'); // 'groups' or 'profile'

  const refreshData = async () => {
    try {
      setLoading(true);
      // MOCK AUTH: Para que puedas ver el diseño sin tener las cookies de Auth-Service cargadas.
      // En un entorno real, esto fallaría con 401 si no hay token.
      try {
        const [p, g] = await Promise.all([getMyProfile(), listGroups()]);
        setProfile(p);
        setGroups(g || []);
      } catch (e) {
        console.warn('Backend offline o sin Auth. Cargando MOCK UI para demostración.');
        setProfile({ name: 'Juan Pérez', email: 'juan.perez@example.com', id: 'user-1' });
        setGroups([
          { id: '1', name: 'Viaje a Madrid', description: 'Gastos compartido del viaje con amigos' },
          { id: '2', name: 'Apartamento 402', description: 'Servicios y renta mensual' }
        ]);
        setError('Aviso: Operando en modo Demo (Backend no alcanzado)');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCreateGroup = async (newGroup) => {
    try {
      await createGroup(newGroup);
      refreshData();
    } catch (e) {
      alert('Simulación: Grupo "' + newGroup.name + '" creado localmente (Modo Demo)');
      setGroups([...groups, { ...newGroup, id: Date.now().toString() }]);
    }
  };

  return (
    <div className="net-layout">
      <aside className="sidebar">
         <div className="sidebar-logo">
            <span className="logo-symbol">S</span>
            <h2>SplitEasy</h2>
         </div>
         <nav className="sidebar-nav">
            <button 
              className={`nav-item ${view === 'groups' ? 'active' : ''}`}
               onClick={() => setView('groups')}
            >
               🏠 Inicio / Grupos
            </button>
            <button 
              className={`nav-item ${view === 'profile' ? 'active' : ''}`}
               onClick={() => setView('profile')}
            >
               👤 Mi Perfil
            </button>
         </nav>
         <div className="sidebar-footer">
            <p>V1.0.2-beta</p>
         </div>
      </aside>

      <main className="content-area">
         {error && <div className="demo-alert">{error}</div>}
         
         {loading ? (
           <div className="loader-container">
              <div className="loader"></div>
              <p>Cargando red de SplitEasy...</p>
           </div>
         ) : (
           <div className="view-container">
              {view === 'groups' ? (
                <div className="groups-layout">
                   <div className="groups-main">
                      <GroupExplorer groups={groups} onSelect={(g) => alert(`Navegar a detalles del grupo: ${g.name}`)} />
                   </div>
                   <div className="groups-actions">
                      <GroupCreator onCreate={handleCreateGroup} />
                      <div className="card info-card">
                         <h4>Tip: Colaboración</h4>
                         <p>Crea grupos para diferentes propósitos (viajes, casa, regalos) y mantén tus cuentas claras.</p>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="profile-layout">
                   <ProfileEditor profile={profile} />
                </div>
              )}
           </div>
         )}
      </main>
    </div>
  );
}

export default App;
