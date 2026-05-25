/**
 * Componente: GroupExplorer.jsx
 * Propósito: Listado y búsqueda de grupos de gastos.
 */

import './GroupExplorer.css';

export default function GroupExplorer({ groups, onSelect }) {
  return (
    <div className="group-explorer animate-up">
      <div className="section-header">
         <h3>Tus Grupos 🤝</h3>
         <span className="count-badge">{groups.length}</span>
      </div>
      
      {!groups.length ? (
        <div className="card empty-state">
           <p>Aún no perteneces a ningún grupo.</p>
           <small>Crea uno para empezar a dividir gastos.</small>
        </div>
      ) : (
        <div className="group-list">
           {groups.map(group => (
             <div key={group.id} className="group-card" onClick={() => onSelect(group)}>
                <div className="group-avatar">
                   {group.name.charAt(0).toUpperCase()}
                </div>
                <div className="group-info">
                   <h4 className="group-name">{group.name}</h4>
                   <p className="group-desc">{group.description || 'Sin descripción'}</p>
                </div>
                <div className="group-chevron">➜</div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
