import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, LogIn, ShieldCheck } from 'lucide-react';
import { api, AuthSession } from '../services/api';

interface LibrarianLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (session: AuthSession) => void;
}

export const LibrarianLoginModal: React.FC<LibrarianLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Ingresa usuario y contraseña.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.login(username, password);
      if (res.success && res.session) {
        onLoginSuccess(res.session);
        onClose();
      } else {
        setError(res.message || 'Credenciales inválidas.');
      }
    } catch (err: any) {
      setError('Error al autenticar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
          padding: '20px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          style={{
            maxWidth: '420px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '18px',
            padding: '32px',
            position: 'relative',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.25)'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          {/* Icon */}
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '14px',
              background: 'var(--urp-green-light)',
              border: '1px solid rgba(15, 81, 66, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--urp-green-primary)',
              margin: '0 auto 16px'
            }}
          >
            <Lock size={26} />
          </div>

          <h2 style={{ textAlign: 'center', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            Acceso Administrativo
          </h2>
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Panel de administración y estadísticas de la biblioteca San Jerónimo
          </p>

          {error && (
            <div 
              style={{ 
                padding: '10px 14px', 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                borderRadius: '8px', 
                color: '#b91c1c', 
                fontSize: '0.85rem', 
                marginBottom: '16px',
                textAlign: 'center'
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Usuario
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-futuristic"
                placeholder="admin"
                style={{ fontSize: '0.95rem', padding: '11px 14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-futuristic"
                placeholder="admin123"
                style={{ fontSize: '0.95rem', padding: '11px 14px' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: '4px', display: 'block' }}>
                Acceso demo: <code>admin</code> / <code>admin123</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary-gradient"
              style={{ width: '100%', padding: '13px', justifyContent: 'center', marginTop: '6px' }}
            >
              <LogIn size={18} /> {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
