import React, { useState } from 'react';
import { api, AuthSession } from '../../services/api';
import { Save, User, Lock, Shield, Check, AlertTriangle, Eye, EyeOff, UserCircle, Code2, Mail, MessageCircle, Phone } from 'lucide-react';

interface TabSettingsProps {
  session: AuthSession;
}

export const TabSettings: React.FC<TabSettingsProps> = ({ session }) => {
  const [username, setUsername] = useState(session.username);
  const [fullName, setFullName] = useState(session.fullName);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      setMessage({ type: 'error', text: 'Debes ingresar tu contrasena actual para guardar cualquier cambio.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const res = await api.updateProfile(session.token, {
      currentPassword,
      username: username !== session.username ? username : undefined,
      fullName: fullName !== session.fullName ? fullName : undefined,
      password: newPassword || undefined,
    });

    setLoading(false);
    if (res.success) {
      setMessage({ type: 'success', text: res.message + ' Cierra sesion y vuelve a ingresar para ver los cambios.' });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setMessage({ type: 'error', text: res.message || 'Error al actualizar el perfil.' });
    }
  };

  const eyeBtnStyle: React.CSSProperties = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
    display: 'flex', alignItems: 'center', padding: '4px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '640px' }}>

      {/* Feedback toast */}
      {message && (
        <div style={{
          padding: '12px 18px', borderRadius: '10px',
          background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: message.type === 'success' ? '#15803d' : '#b91c1c',
          fontSize: '0.88rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
        }}>
          {message.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Current profile info card */}
      <div style={{
        background: '#ffffff', border: '1px solid var(--border-card)',
        borderRadius: '12px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: '16px',
      }}>
        <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)', flexShrink: 0 }}>
          <UserCircle size={22} />
        </div>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>{session.fullName}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            @{session.username} &mdash; <span style={{ color: 'var(--urp-green-primary)', fontWeight: 600 }}>{session.role}</span>
          </div>
        </div>
      </div>

      {/* Edit form card */}
      <div style={{ background: '#ffffff', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '24px' }}>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Section: Account data */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
              <User size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)' }}>Datos de cuenta</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Modifica tu usuario y nombre visible</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Usuario de acceso
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="input-futuristic"
              style={{ fontSize: '0.9rem', padding: '10px 14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="input-futuristic"
              style={{ fontSize: '0.9rem', padding: '10px 14px' }}
            />
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border-card)', margin: '4px 0' }} />

          {/* Section: Password */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
              <Lock size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)' }}>Contrasena</h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Deja la nueva contrasena en blanco para no cambiarla</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Nueva contrasena <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showNewPwd ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nueva contrasena..."
                className="input-futuristic"
                style={{ fontSize: '0.9rem', padding: '10px 44px 10px 14px' }}
              />
              <button type="button" onClick={() => setShowNewPwd(p => !p)} style={eyeBtnStyle}>
                {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Current password — required */}
          <div style={{ background: '#fffdf0', border: '1px solid #f0d060', borderRadius: '10px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Shield size={15} color="#92650a" />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92650a' }}>
                Contrasena actual <span style={{ color: '#b91c1c' }}>*</span>
              </span>
              <span style={{ fontSize: '0.78rem', color: '#a17c2a', fontWeight: 400 }}>
                — requerida para confirmar cualquier cambio
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showCurrentPwd ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contrasena actual..."
                required
                className="input-futuristic"
                style={{ fontSize: '0.9rem', padding: '10px 44px 10px 14px', borderColor: '#f0d060', background: '#fffff8' }}
              />
              <button type="button" onClick={() => setShowCurrentPwd(p => !p)} style={eyeBtnStyle}>
                {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '8px',
              border: '1px solid #0f5142',
              background: loading ? '#94a3b8' : 'var(--urp-green-primary)',
              color: '#ffffff', fontSize: '0.88rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: loading ? 'none' : '0 1px 2px rgba(15, 81, 66, 0.15)',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#0b3d32'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--urp-green-primary)'; }}
          >
            <Save size={16} />
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>

        </form>
      </div>

      {/* About & Developer Contact Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid var(--border-card)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(15, 81, 66, 0.1)', color: 'var(--urp-green-primary)' }}>
            <Code2 size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Acerca del Sistema & Soporte Técnico
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Desarrollo, autoría y contacto para mantenimiento
            </span>
          </div>
        </div>

        {/* Profile Card / Developer Info */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(15, 81, 66, 0.04) 0%, rgba(2, 132, 199, 0.04) 100%)',
          border: '1px solid rgba(15, 81, 66, 0.15)',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0f5142 0%, #0284c7 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(15, 81, 66, 0.2)'
            }}>
              CQ
            </div>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Claudio Fernando Quello Yapu
                </h4>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#065f46',
                  background: '#d1fae5',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #a7f3d0'
                }}>
                  Desarrollador
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Facultad de Humanidades y Lenguas Modernas &mdash; URP
              </p>
            </div>
          </div>
        </div>

        {/* Contact Links Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          {/* Phone / WhatsApp */}
          <a
            href="https://wa.me/51962956919?text=Hola%20Claudio,%20te%20contacto%20sobre%20el%20Sistema%20de%20Biblioteca%20URP"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              color: 'inherit'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#22c55e';
              e.currentTarget.style.background = '#f0fdf4';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#dcfce7',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <MessageCircle size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Celular / WhatsApp
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '1px' }}>
                962 956 919
              </div>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:claudioquello5@gmail.com?subject=Consulta%20-%20Sistema%20de%20Biblioteca%20URP"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              color: 'inherit'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#0284c7';
              e.currentTarget.style.background = '#f0f9ff';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Mail size={18} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Correo Electrónico
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '1px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                claudioquello5@gmail.com
              </div>
            </div>
          </a>
        </div>

        {/* Footer info note */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          paddingTop: '12px',
          borderTop: '1px solid #f1f5f9',
          fontSize: '0.76rem',
          color: 'var(--text-muted)'
        }}>
          <span>Biblioteca Especializada &ldquo;San Jerónimo&rdquo; &mdash; Versión 2.5</span>
          <span style={{ fontWeight: 600, color: 'var(--urp-green-primary)' }}>Universidad Ricardo Palma</span>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c' }}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#b91c1c' }}>Zona de Peligro</h3>
            <span style={{ fontSize: '0.78rem', color: '#991b1b' }}>Acciones destructivas que no se pueden deshacer</span>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.88rem', fontWeight: 600, color: '#7f1d1d' }}>Limpiar Sistema Completo</h4>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#991b1b' }}>Elimina el historial de asistencia y a TODOS los usuarios (alumnos, docentes, etc.). Solo mantiene facultades y administradores. Útil para entregar el sistema limpio.</p>
          </div>
          <button
            onClick={async () => {
              if (window.confirm('⚠️ ¿Estás completamente seguro de querer ELIMINAR TODO EL HISTORIAL Y TODOS LOS USUARIOS? Esta acción NO se puede deshacer.')) {
                const res = await api.clearAttendance(session.token);
                if (res.success) {
                  alert(res.message);
                  window.location.reload();
                } else {
                  alert(res.message);
                }
              }
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #dc2626',
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={e => e.currentTarget.style.background = '#dc2626'}
          >
            Limpiar Datos
          </button>
        </div>
      </div>

    </div>
  );
};
