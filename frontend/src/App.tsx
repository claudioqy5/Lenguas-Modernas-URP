import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scan, BookOpen, Laptop, Users, Library, Shield,
  Clock, CheckCircle2, ArrowRight, Globe, Barcode, Landmark, Info
} from 'lucide-react';
import { PolyglotGlobe3D } from './components/PolyglotGlobe3D';
import { RotatingGreeting } from './components/RotatingGreeting';
import { OccupancyMonitor } from './components/OccupancyMonitor';
import { NewStudentModal } from './components/NewStudentModal';
import { CheckInSuccessModal } from './components/CheckInSuccessModal';
import { LibrarianLoginModal } from './components/LibrarianLoginModal';
import { AdminDashboard } from './components/AdminDashboard';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { api, OccupancyData, CheckInResponse, Student, AuthSession } from './services/api';

const VISIT_REASONS = [
  { id: 'Lectura / Estudio', label: 'Sala de Lectura', icon: BookOpen },
  { id: 'Computadoras', label: 'Uso de Computadoras', icon: Laptop },
  { id: 'Préstamo de Libros', label: 'Préstamo / Devolución', icon: Library },
  { id: 'Tándem / Idiomas', label: 'Tándem Lingüístico', icon: Globe },
  { id: 'Trabajo Grupal', label: 'Estudio Grupal', icon: Users },
];

const LANGUAGE_OPTIONS = [
  "General",
  "Inglés",
  "Francés",
  "Alemán",
  "Italiano",
  "Chino Mandarín",
  "Portugués"
];

export function App() {
  // Views & Modals
  const [isAdminView, setIsAdminView] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Data State
  const [studentCodeInput, setStudentCodeInput] = useState('');
  const [selectedReason, setSelectedReason] = useState(VISIT_REASONS[0].id);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGE_OPTIONS[0]);
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
      const res = await api.checkIn(code, selectedReason, selectedLanguage, method);

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
        }}
        onBackToKiosk={() => setIsAdminView(false)}
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
          {/* URP Institutional Badge with SVG */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'var(--urp-green-light)',
              border: '1.5px solid rgba(15, 81, 66, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--urp-green-primary)'
            }}
          >
            <Landmark size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--urp-gold-primary)' }}>
              UNIVERSIDAD RICARDO PALMA
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--urp-green-primary)' }}>
              Facultad de Humanidades y Lenguas Modernas
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Biblioteca Especializada — Sistema de Control de Asistencia
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
                  background: 'var(--urp-green-light)',
                  border: '1px solid #10b981',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  color: 'var(--urp-green-primary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Barcode size={16} /> {scannerNotification}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            <Clock size={16} color="var(--urp-green-primary)" />
            <span>
              {currentTime.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })},{' '}
              <strong style={{ color: 'var(--text-main)' }}>{currentTime.toLocaleTimeString('es-PE')}</strong>
            </span>
          </div>

          <button
            onClick={() => {
              if (authSession) {
                setIsAdminView(true);
              } else {
                setShowLoginModal(true);
              }
            }}
            style={{
              background: 'var(--urp-gold-light)',
              border: '1px solid rgba(180, 83, 9, 0.3)',
              color: 'var(--urp-gold-primary)',
              padding: '9px 16px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
          >
            <Shield size={15} />
            {authSession ? 'Ver Panel Administrador' : 'Acceso Bibliotecólogo'}
          </button>
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

          {/* Bottom: Occupancy Monitor Frosted Card */}
          <div>
            <OccupancyMonitor occupancy={occupancy} />
          </div>
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
              borderRadius: '10px',
              background: 'var(--urp-green-light)',
              border: '1px solid rgba(15, 81, 66, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  background: '#059669',
                  boxShadow: '0 0 6px #059669'
                }}
              />
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--urp-green-primary)' }}>
                Lector de Código de Barras / QR Activo
              </span>
            </div>
            <Scan size={17} color="#0f5142" />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
            Registro de Asistencia
          </h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
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
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
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
                <Info size={13} color="var(--urp-green-primary)" />
                <span>Si eres nuevo estudiante, podrás registrar tus datos de inmediato al ingresar tu código.</span>
              </div>
            </div>

            {/* Visit Reason Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Motivo de Visita
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {VISIT_REASONS.map((reason) => {
                  const Icon = reason.icon;
                  const isSelected = selectedReason === reason.id;
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => setSelectedReason(reason.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '8px',
                        border: isSelected ? '1.5px solid var(--urp-green-primary)' : '1px solid #cbd5e1',
                        background: isSelected ? 'var(--urp-green-light)' : '#f8fafc',
                        color: isSelected ? 'var(--urp-green-primary)' : 'var(--text-muted)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Icon size={16} />
                      <span style={{ textAlign: 'center' }}>{reason.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language Focus */}
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Idioma de Estudio / Consulta (Opcional)
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="input-futuristic"
                style={{ fontSize: '0.9rem', padding: '10px 14px' }}
              >
                {LANGUAGE_OPTIONS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !studentCodeInput.trim()}
              className="btn-primary-gradient"
              style={{
                width: '100%',
                padding: '15px',
                fontSize: '1rem',
                borderRadius: '10px',
                marginTop: '4px'
              }}
            >
              {loading ? 'Verificando...' : (
                <>
                  <CheckCircle2 size={18} /> Marcar Ingreso a la Biblioteca
                </>
              )}
            </button>
          </form>

          {/* Registration link */}
          <div style={{ marginTop: '22px', textAlign: 'center', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={() => {
                setUnregisteredCode('');
                setShowNewStudentModal(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--urp-green-primary)',
                fontSize: '0.84rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              ¿Estudiante nuevo? Regístrate aquí por primera vez <ArrowRight size={14} />
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
        }}
      />
    </div>
  );
}

export default App;
