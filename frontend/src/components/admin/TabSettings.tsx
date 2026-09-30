import React, { useState } from 'react';
import { api, AuthSession } from '../../services/api';
import { Save, User, Lock, Key } from 'lucide-react';

interface TabSettingsProps {
  session: AuthSession;
}

export const TabSettings: React.FC<TabSettingsProps> = ({ session }) => {
  const [username, setUsername] = useState(session.username);
  const [fullName, setFullName] = useState(session.fullName);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await api.updateProfile(session.token, {
      username: username !== session.username ? username : undefined,
      fullName: fullName !== session.fullName ? fullName : undefined,
      password: password ? password : undefined
    });

    setLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: res.message + ' Por favor, cierra sesión y vuelve a ingresar para ver los cambios reflejados.' });
      setPassword('');
    } else {
      setMessage({ type: 'error', text: res.message || 'Error al actualizar el perfil.' });
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', background: '#fff', borderRadius: '12px', padding: '32px', border: '1px solid var(--border-card)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--urp-green-primary)', marginBottom: '24px' }}>Mi Perfil de Administrador</h2>
      
      {message && (
        <div style={{ padding: '16px', borderRadius: '8px', marginBottom: '24px', background: message.type === 'success' ? '#e6f4ea' : '#fce8e6', color: message.type === 'success' ? '#137333' : '#c5221f', fontWeight: 500 }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
            <User size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--urp-green-primary)' }}/>
            Usuario de Acceso
          </label>
          <input 
            type="text" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-card)', fontSize: '1rem', outlineColor: 'var(--urp-green-primary)' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
            <Key size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--urp-green-primary)' }}/>
            Nombre Completo
          </label>
          <input 
            type="text" 
            value={fullName} 
            onChange={e => setFullName(e.target.value)}
            required
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-card)', fontSize: '1rem', outlineColor: 'var(--urp-green-primary)' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
            <Lock size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px', color: 'var(--urp-green-primary)' }}/>
            Nueva Contraseña <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(dejar en blanco para no cambiar)</span>
          </label>
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            placeholder="Escribe aquí solo si deseas cambiarla..."
            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-card)', fontSize: '1rem', outlineColor: 'var(--urp-green-primary)' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            marginTop: '16px',
            background: 'var(--urp-green-primary)', 
            color: '#fff', 
            border: 'none', 
            padding: '14px', 
            borderRadius: '8px', 
            fontSize: '1rem', 
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s',
            opacity: loading ? 0.7 : 1
          }}>
          <Save size={18} />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  );
};
