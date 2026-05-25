/**
 * Componente: ProfileEditor.jsx
 * Propósito: Configuración del perfil de usuario actual.
 */

import './ProfileEditor.css';

export default function ProfileEditor({ profile }) {
  if (!profile) return null;

  return (
    <div className="profile-editor animate-up" style={{ animationDelay: '0.1s' }}>
      <div className="card profile-header-card">
        <div className="profile-banner"></div>
        <div className="profile-content">
           <div className="profile-avatar-large">
              {profile.name?.charAt(0).toUpperCase()}
           </div>
           <div className="profile-meta">
              <h3>{profile.name}</h3>
              <p>{profile.email}</p>
           </div>
        </div>
      </div>

      <div className="card settings-card animate-up" style={{ animationDelay: '0.2s', marginTop: '1.5rem' }}>
        <h4 style={{ marginBottom: '1.25rem' }}>Ajustes de Cuenta</h4>
        <div className="form-grid">
           <div className="form-group">
              <label>Nombre Público</label>
              <input type="text" className="input-field" defaultValue={profile.name} />
           </div>
           <div className="form-group">
              <label>Biografía</label>
              <textarea className="input-field" rows="3" placeholder="Cuéntales quién eres..."></textarea>
           </div>
           <button className="btn-primary" style={{ width: '100%' }}>Guardar Cambios</button>
        </div>
      </div>
    </div>
  );
}
