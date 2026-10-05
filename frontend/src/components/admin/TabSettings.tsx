import React, { useState } from 'react';
import { api, AuthSession } from '../../services/api';
import { 
  Save, User, Lock, Shield, Check, AlertTriangle, Eye, EyeOff, 
  UserCircle, Code2, Mail, MessageCircle, Trash2, Building2, Award, Server 
} from 'lucide-react';

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
  const [clearingData, setClearingData] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword.trim()) {
      setMessage({ type: 'error', text: 'Debes ingresar tu contraseña actual para guardar cualquier cambio.' });
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
      setMessage({ type: 'success', text: res.message + ' Cierra sesión y vuelve a ingresar para ver los cambios.' });
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setMessage({ type: 'error', text: res.message || 'Error al actualizar el perfil.' });
    }
  };

  const handleClearDatabase = async () => {
    if (window.confirm('⚠️ ¿Estás COMPLETAMENTE SEGURO de querer ELIMINAR TODO EL HISTORIAL Y TODOS LOS USUARIOS?\n\nEsta acción es irreversible y borrará el historial de asistencias y el padrón de usuarios (alumnos, docentes, etc.). Solo se conservarán las facultades y administradores.')) {
      setClearingData(true);
      const res = await api.clearAttendance(session.token);
      setClearingData(false);
      if (res.success) {
        alert(res.message);
        window.location.reload();
      } else {
        alert(res.message);
      }
    }
  };

  const eyeBtnStyle: React.CSSProperties = {
    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
    display: 'flex', alignItems: 'center', padding: '4px',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1280px', width: '100%', margin: '0 auto' }}>

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

      {/* 2-Column Grid Layout: Perfil a la izquierda, Acerca de a la derecha */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>

        {/* Columna Izquierda: Perfil Actual y Formulario de Cuenta */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Current profile info card */}
          <div style={{
            background: '#ffffff', border: '1px solid var(--border-card)',
            borderRadius: '12px', padding: '20px 24px',
            display: 'flex', alignItems: 'center', gap: '16px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
          }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)', flexShrink: 0 }}>
              <UserCircle size={24} />
            </div>
            <div>
              <div style={{ fontSize: '1.08rem', fontWeight: 700, color: 'var(--text-main)' }}>{session.fullName}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                @{session.username} &mdash; <span style={{ color: 'var(--urp-green-primary)', fontWeight: 600 }}>{session.role}</span>
              </div>
            </div>
          </div>

          {/* Edit form card */}
          <div style={{ background: '#ffffff', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '24px', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)' }}>
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
                  <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-main)' }}>Contraseña</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Deja la nueva contraseña en blanco para no cambiarla</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Nueva contraseña <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña..."
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
                    Contraseña actual <span style={{ color: '#b91c1c' }}>*</span>
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#a17c2a', fontWeight: 400 }}>
                    — requerida para confirmar cambios
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña actual..."
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
                  padding: '11px 22px', borderRadius: '8px',
                  border: '1px solid #0f5142',
                  background: loading ? '#94a3b8' : 'var(--urp-green-primary)',
                  color: '#ffffff', fontSize: '0.88rem', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: loading ? 'none' : '0 2px 6px rgba(15, 81, 66, 0.2)',
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
        </div>

        {/* Columna Derecha: Acerca del Sistema & Soporte Técnico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-card)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)'
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
              background: 'linear-gradient(135deg, rgba(15, 81, 66, 0.05) 0%, rgba(2, 132, 199, 0.05) 100%)',
              border: '1.5px solid rgba(15, 81, 66, 0.15)',
              borderRadius: '12px',
              padding: '18px 20px',
              marginBottom: '18px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #0f5142 0%, #0284c7 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.18rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(15, 81, 66, 0.25)',
                  flexShrink: 0
                }}>
                  CQ
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-main)' }}>
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
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#475569', fontWeight: 500 }}>
                    Ingeniería Informática &mdash; Universidad Ricardo Palma
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Links Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              {/* Phone / WhatsApp */}
              <a
                href="https://wa.me/51962956919?text=Hola%20Claudio,%20te%20contacto%20sobre%20el%20Sistema%20de%20Biblioteca%20URP"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  textDecoration: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: 'inherit'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#22c55e';
                  e.currentTarget.style.background = '#f0fdf4';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <MessageCircle size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Celular / WhatsApp (Clic para chatear)
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
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
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  textDecoration: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: 'inherit'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#0284c7';
                  e.currentTarget.style.background = '#f0f9ff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(2, 132, 199, 0.12)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Mail size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    Correo Electrónico (Clic para escribir)
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    claudioquello5@gmail.com
                  </div>
                </div>
              </a>
            </div>

            {/* Technical Highlights */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} /> Unidad Operativa
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Biblioteca San Jerónimo</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={14} /> Facultad
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>Humanidades y Lenguas Modernas</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Server size={14} /> Servidor & Zona Horaria
                </span>
                <span style={{ fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                  Activo (Perú UTC-5)
                </span>
              </div>
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
              <span>Versión 1.0 &mdash; Sistema de Control y Asistencia</span>
              <span style={{ fontWeight: 700, color: 'var(--urp-green-primary)' }}>Universidad Ricardo Palma</span>
            </div>
          </div>
        </div>

      </div>

      {/* Zona de Peligro: Centrada, moderna y elegante */}
      <div style={{
        background: '#ffffff',
        border: '1.5px solid #fecaca',
        borderRadius: '16px',
        padding: '32px 28px',
        boxShadow: '0 4px 20px rgba(220, 38, 38, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top subtle danger bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%)'
        }} />

        <div style={{
          maxWidth: '680px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: '16px'
        }}>
          {/* Centered Icon */}
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(220, 38, 38, 0.15)'
          }}>
            <AlertTriangle size={26} />
          </div>

          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fee2e2',
              color: '#b91c1c',
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '8px'
            }}>
              Zona de Peligro
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#991b1b', letterSpacing: '-0.3px' }}>
              Reinicio y Limpieza del Sistema
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#7f1d1d', lineHeight: 1.6 }}>
              Esta función elimina permanentemente el historial de asistencia acumulado y a <strong>todos los usuarios registrados</strong> (alumnos, docentes, visitantes y posgrado).
              <span style={{ display: 'block', marginTop: '6px', color: '#991b1b', fontWeight: 500 }}>
                Solo se conservan las facultades, carreras académicas y las cuentas de administrador. Utilízala únicamente para entregar el sistema limpio o al inicio de un nuevo ciclo.
              </span>
            </p>
          </div>

          <button
            type="button"
            disabled={clearingData}
            onClick={handleClearDatabase}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '10px',
              border: '1.5px solid #dc2626',
              background: clearingData ? '#94a3b8' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: clearingData ? 'not-allowed' : 'pointer',
              boxShadow: clearingData ? 'none' : '0 4px 14px rgba(220, 38, 38, 0.25)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onMouseEnter={e => {
              if (!clearingData) {
                e.currentTarget.style.background = '#b91c1c';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(220, 38, 38, 0.35)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={e => {
              if (!clearingData) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(220, 38, 38, 0.25)';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            <Trash2 size={16} />
            <span>{clearingData ? 'Limpiando base de datos...' : 'Limpiar Historial y Usuarios'}</span>
          </button>
        </div>
      </div>

    </div>
  );
};
