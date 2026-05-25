/**
 * Componente: GroupCreator.jsx
 * Propósito: Formulario para la creación de nuevos grupos.
 */

import { useState } from 'react';

export default function GroupCreator({ onCreate }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    onCreate({ name, description: desc });
    setName('');
    setDesc('');
  };

  return (
    <div className="card animate-up" style={{ animationDelay: '0.3s' }}>
      <h3 style={{ marginBottom: '1.25rem' }}>Crear Nuevo Grupo ✨</h3>
      <form onSubmit={handleSubmit} className="form-grid">
         <div className="form-group">
            <label>Nombre del Grupo</label>
            <input 
              className="input-field" 
              type="text" 
              placeholder="Ej: Viaje a Roma 🇮🇹"
              value={name}
              onChange={e => setName(e.target.value)}
            />
         </div>
         <div className="form-group">
            <label>Descripción</label>
            <input 
              className="input-field" 
              type="text" 
              placeholder="¿De qué trata este grupo?" 
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
         </div>
         <button className="btn-primary" type="submit" disabled={!name}>
            Abrir Nuevo Grupo
         </button>
      </form>
    </div>
  );
}
