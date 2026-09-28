import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan, BookOpen, Laptop, Users, Library, Shield,
  Clock, CheckCircle2, ArrowRight, Globe, Barcode, Landmark, Info
} from 'lucide-react';
import { PolyglotGlobe3D } from './components/PolyglotGlobe3D';
import { RotatingGreeting } from './components/RotatingGreeting';
import { NewStudentModal } from './components/NewStudentModal';
import { CheckInSuccessModal } from './components/CheckInSuccessModal';
import { LibrarianLoginModal } from './components/LibrarianLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { api, OccupancyData, CheckInResponse, Student, AuthSession } from './services/api';

const VISIT_REASONS = [
  {
    id: 'Lectura / Estudio',
    label: 'Sala de Lectura',
    icon: BookOpen,
    accentColor: '#059669',
    activeBg: 'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(16, 185, 129, 0.05) 100%)',
    activeBorder: '#10b981',
    activeText: '#064e3b',
    activeGlow: '0 4px 14px rgba(16, 185, 129, 0.22)',
    iconBgActive: '#059669',
    iconColorActive: '#ffffff'
  },
  {
    id: 'Computadoras',
    label: 'Uso de Computadoras',
    icon: Laptop,
    accentColor: '#2563eb',
    activeBg: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(2, 132, 199, 0.05) 100%)',
    activeBorder: '#3b82f6',
    activeText: '#1e3a8a',
    activeGlow: '0 4px 14px rgba(37, 99, 235, 0.22)',
    iconBgActive: '#2563eb',
    iconColorActive: '#ffffff'
  },
  {
    id: 'Préstamo de Libros',
    label: 'Préstamo / Devolución',
    icon: Library,
    accentColor: '#d97706',
    activeBg: 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(245, 158, 11, 0.05) 100%)',
    activeBorder: '#f59e0b',
    activeText: '#78350f',
    activeGlow: '0 4px 14px rgba(217, 119, 6, 0.22)',
    iconBgActive: '#d97706',
    iconColorActive: '#ffffff'
  },
];


export function App() {
  // Views & Modals
  const [isAdminView, setIsAdminView] = useState(() => localStorage.getItem('isAdminView') === 'true');
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    const saved = localStorage.getItem('authSession');
    return saved ? JSON.parse(saved) : null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Data State
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [selectedReason, setSelectedReason] = useState(VISIT_REASONS[0].id);
  const [occupancy, setOccupancy] = useState<OccupancyData>({ currentOccupancy: 24, maxCapacity: 60, occupancyPercentage: 40 });
  const [checkInResult, setCheckInResult] = useState<CheckInResponse | null>(null);
  const [unregisteredCode, setUnregisteredCode] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [pulseGlobeTrigger, setPulseGlobeTrigger] = useState(0);
  const [scannerNotification, setScannerNotification] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshOccupancy = async () => {
    const data = await api.getOccupancy();
    setOccupancy(data);
  };

  useEffect(() => {
    refreshOccupancy();
    const interval = setInterval(refreshOccupancy, 25000);
    return () => clearInterval(interval);
  }, []);

  // Process Check-In
  const handleCheckIn = async (codeToSubmit: string, method: 'Barcode' | 'Manual' = 'Manual') => {
    const code = codeToSubmit.trim();
    if (!code) return;

    try {
      setLoading(true);
      
      // Check identity to prevent checking in as someone else by mistake
      const checkRes = await api.checkStudent(code);
      if (checkRes.exists && checkRes.student) {
        // We pause the loading state so the UI doesn't look stuck during the native confirm
        setLoading(false);
        const confirmed = window.confirm(`Verificación:\n¿Eres ${checkRes.student.fullName}?`);
        if (!confirmed) {
          setStudentCodeInput('');
          return;
        }
        setLoading(true);
      }

      const res = await api.checkIn(code, selectedReason, "General", method);

      if (res.isNewStudent) {
        setUnregisteredCode(code);
        setShowNewStudentModal(true);
      } else if (res.success) {
        setCheckInResult(res);
        setShowSuccessModal(true);
        setPulseGlobeTrigger(prev => prev + 1);
        setOccupancy({
          currentOccupancy: res.currentOccupancy,
          maxCapacity: res.maxCapacity,
          occupancyPercentage: res.occupancyPercentage
        });
        setStudentCodeInput('');
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Hardware Barcode Scanner listener
  useBarcodeScanner({
    onScan: (scannedCode) => {
      setScannerNotification(`Código detectado por escáner: ${scannedCode}`);
      setTimeout(() => setScannerNotification(null), 3500);
      handleCheckIn(scannedCode, 'Barcode');
    }
  });

  const handleStudentRegistered = (student: Student, checkInRes?: CheckInResponse) => {
    setShowNewStudentModal(false);
    if (checkInRes && checkInRes.success) {
      setCheckInResult(checkInRes);
      setShowSuccessModal(true);
      setPulseGlobeTrigger(prev => prev + 1);
      refreshOccupancy();
    } else {
      handleCheckIn(student.studentCode, 'Manual');
    }
  };

  // Switch to admin view if authenticated
  if (isAdminView && authSession) {
    return (
      <AdminDashboard
        session={authSession}
        onLogout={() => {
          setAuthSession(null);
          setIsAdminView(false);
          localStorage.removeItem('authSession');
          localStorage.removeItem('isAdminView');
        }}
        onBackToKiosk={() => {
          setIsAdminView(false);
          localStorage.removeItem('isAdminView');
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
      {/* FULL-SCREEN 3D PLANETARY BACKGROUND (EXPANDS ACROSS THE WHOLE SCREEN FROM LEFT TO RIGHT) */}
      <PolyglotGlobe3D pulseTrigger={pulseGlobeTrigger} />

      {/* Top Header Bar */}
      <header
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-card)',
          padding: '14px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* URP Institutional Badge with SVG (Hidden Login Trigger) */}
          <div
            onClick={() => {
              if (authSession) {
                setIsAdminView(true);
                localStorage.setItem('isAdminView', 'true');
              } else {
                setShowLoginModal(true);
              }
            }}
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(15, 81, 66, 0.12) 0%, rgba(2, 132, 199, 0.12) 100%)',
              border: '1.5px solid rgba(15, 81, 66, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#065f46',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(15, 81, 66, 0.1)',
              transition: 'all 0.2s ease'
            }}
          >
            <Landmark size={23} />
          </div>
          <div>
            <div style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.9px', color: '#b45309' }}>
              UNIVERSIDAD RICARDO PALMA
            </div>
            <div style={{ fontSize: '1.08rem', fontWeight: 800, letterSpacing: '-0.2px' }}>
              <span style={{ color: '#0f172a' }}>Facultad de Humanidades y </span>
              <span style={{
                background: 'linear-gradient(135deg, #059669 0%, #0284c7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 800
              }}>
                Lenguas Modernas
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Biblioteca Especializada San Jerónimo — Sistema de Control de Asistencia
            </div>
          </div>
        </div>

        {/* Live Clock & Admin Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Scanner notification banner */}
          <AnimatePresence>
            {scannerNotification && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(2, 132, 199, 0.1) 100%)',
                  border: '1px solid #10b981',
                  borderRadius: '10px',
                  padding: '7px 16px',
                  color: '#065f46',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                }}
              >
                <Barcode size={17} /> {scannerNotification}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{
            background: 'rgba(248, 250, 252, 0.9)',
            border: '1px solid #e2e8f0',
            borderRadius: '20px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 6px #10b981',
              display: 'inline-block'
            }} />
            <Clock size={15} color="#0284c7" />
            <span style={{ color: '#64748b', fontSize: '0.84rem' }}>
              {currentTime.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })},
            </span>
            <strong style={{ color: '#0f172a', fontSize: '0.88rem', fontWeight: 700 }}>
              {currentTime.toLocaleTimeString('es-PE')}
            </strong>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content */}
      <main
        style={{
          position: 'relative',
          zIndex: 10,
          flex: 1,
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '28px 32px',
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.1fr) minmax(340px, 0.9fr)',
          gap: '36px',
          alignItems: 'center'
        }}
      >
        {/* Left Side: Floating Elements (Directly over the full-screen 3D planets) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '24px',
            minHeight: '520px'
          }}
        >
          {/* Top: Rotating Greeting */}
          <div>
            <RotatingGreeting />
          </div>

          {/* Spacer so the massive 3D planetary system and orbiting rings are unobstructed */}
          <div style={{ flex: 1, minHeight: '80px' }} />
        </div>

        {/* Right Side: Check-In Form (Frosted Glass Panel) */}
        <div
          className="glass-panel"
          style={{
            padding: '36px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.95)',
            boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.1)'
          }}
        >
          {/* Barcode status banner */}
          <div
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(2, 132, 199, 0.06) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '22px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ position: 'relative', display: 'flex', width: '10px', height: '10px' }}>
                <span
                  style={{
                    animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                    position: 'absolute',
                    display: 'inline-flex',
                    height: '100%',
                    width: '100%',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    opacity: 0.75
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    borderRadius: '50%',
                    height: '10px',
                    width: '10px',
                    backgroundColor: '#059669'
                  }}
                />
              </span>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#065f46' }}>
                Lector de Código de Barras / QR Activo
              </span>
            </div>
            <div
              style={{
                background: 'rgba(5, 150, 105, 0.12)',
                padding: '4px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#059669',
                fontSize: '0.72rem',
                fontWeight: 800
              }}
            >
              <Scan size={14} /> LISTO
            </div>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.3px' }}>
            Registro de Asistencia
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '22px' }}>
            Acerca tu carné universitario al lector o digita tu código de estudiante URP:
          </p>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCheckIn(studentCodeInput, 'Manual');
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          >
            {/* Student Code Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                Código Universitario o DNI
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  autoFocus
                  value={studentCodeInput}
                  onChange={(e) => setStudentCodeInput(e.target.value)}
                  placeholder="Ej: 202410345 ó 74125896"
                  className="input-futuristic"
                  style={{
                    fontSize: '1.25rem',
                    fontFamily: 'monospace',
                    letterSpacing: '1px',
                    padding: '14px 18px',
                    borderRadius: '10px',
                    fontWeight: 700
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
                <Info size={13} color="#059669" />
                <span>Si eres nuevo estudiante, podrás registrar tus datos de inmediato al ingresar tu código.</span>
              </div>
            </div>

            {/* Visit Reason Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                Motivo de Visita
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {VISIT_REASONS.map((reason) => {
                  const Icon = reason.icon;
                  const isSelected = selectedReason === reason.id;
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => setSelectedReason(reason.id)}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${reason.activeBorder}` : '1.5px solid #e2e8f0',
                        background: isSelected ? reason.activeBg : '#ffffff',
                        color: isSelected ? reason.activeText : '#475569',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isSelected ? reason.activeGlow : '0 1px 3px rgba(0, 0, 0, 0.02)',
                        transform: isSelected ? 'translateY(-1px)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.transform = 'none';
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? reason.iconBgActive : '#f1f5f9',
                          color: isSelected ? reason.iconColorActive : '#64748b',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Icon size={17} />
                      </div>
                      <span style={{ textAlign: 'center', lineHeight: 1.25 }}>{reason.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !studentCodeInput.trim()}
              className="btn-primary-gradient"
              style={{
                width: '100%',
                padding: '16px 20px',
                fontSize: '1.02rem',
                borderRadius: '12px',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {loading ? 'Verificando...' : (
                <>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      padding: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </div>
                  <span>Marcar Ingreso a la Biblioteca San Jerónimo</span>
                </>
              )}
            </button>
          </form>

          {/* Registration link / pill */}
          <div style={{ marginTop: '22px', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => {
                setUnregisteredCode('');
                setShowNewStudentModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)',
                border: '1.5px solid rgba(2, 132, 199, 0.2)',
                borderRadius: '9999px',
                padding: '8px 18px',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 6px rgba(2, 132, 199, 0.06)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0284c7';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(2, 132, 199, 0.1) 0%, rgba(124, 58, 237, 0.08) 100%)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(2, 132, 199, 0.2)';
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(2, 132, 199, 0.05) 0%, rgba(124, 58, 237, 0.05) 100%)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <span style={{ color: '#475569' }}>¿Estudiante nuevo?</span>
              <span style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                Regístrate aquí por primera vez <ArrowRight size={14} />
              </span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '14px 32px',
          borderTop: '1px solid rgba(226, 232, 240, 0.8)',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: 'var(--text-subtle)',
          fontSize: '0.8rem',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div>
          Universidad Ricardo Palma • Facultad de Humanidades y Lenguas Modernas
        </div>
        <div>
          Control de Asistencia y Aforo en Tiempo Real • Campus Central Santiago de Surco
        </div>
      </footer>

      {/* Modals */}
      <NewStudentModal
        isOpen={showNewStudentModal}
        prefilledCode={unregisteredCode}
        onClose={() => setShowNewStudentModal(false)}
        onSuccess={handleStudentRegistered}
      />

      <CheckInSuccessModal
        data={checkInResult}
        onClose={() => {
          setShowSuccessModal(false);
          setCheckInResult(null);
        }}
      />

      <LibrarianLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(session) => {
          setAuthSession(session);
          setIsAdminView(true);
          localStorage.setItem('authSession', JSON.stringify(session));
          localStorage.setItem('isAdminView', 'true');
        }}
      />
    </div>
  );
}

export default App;
