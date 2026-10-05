import React, { useState, useEffect, useRef } from 'react';
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
import { api, OccupancyData, CheckInResponse, Student, AuthSession, LibraryPerson } from './services/api';

const VISIT_REASONS = [
  {
    id: 'Lectura / Estudio',
    label: 'Sala de Lectura',
    icon: BookOpen,
    accentColor: '#0f5142',
    activeBg: 'rgba(15, 81, 66, 0.07)',
    activeBorder: '#0f5142',
    activeText: '#0f5142',
    activeGlow: '0 4px 12px rgba(15, 81, 66, 0.15)',
    iconBgActive: '#0f5142',
    iconColorActive: '#ffffff'
  },
  {
    id: 'Computadoras',
    label: 'Uso de Computadoras',
    icon: Laptop,
    accentColor: '#0284c7',
    activeBg: 'rgba(2, 132, 199, 0.07)',
    activeBorder: '#0284c7',
    activeText: '#0369a1',
    activeGlow: '0 4px 12px rgba(2, 132, 199, 0.15)',
    iconBgActive: '#0284c7',
    iconColorActive: '#ffffff'
  },
  {
    id: 'Préstamo de Libros',
    label: 'Préstamo / Devolución',
    icon: Library,
    accentColor: '#b45309',
    activeBg: 'rgba(180, 83, 9, 0.07)',
    activeBorder: '#b45309',
    activeText: '#92400e',
    activeGlow: '0 4px 12px rgba(180, 83, 9, 0.15)',
    iconBgActive: '#b45309',
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
  const serverOffsetRef = useRef<number>(0);
  const [loading, setLoading] = useState(false);
  const [pulseGlobeTrigger, setPulseGlobeTrigger] = useState(0);
  const [scannerNotification, setScannerNotification] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<{title: string, message: string} | null>(null);

  // Sync clock with VPS Server Time (Peru UTC-5)
  useEffect(() => {
    const syncServerTime = async () => {
      const data = await api.getServerTime();
      if (data && data.timestamp) {
        // Offset between VPS timestamp and local browser Date.now()
        serverOffsetRef.current = data.timestamp - Date.now();
        setCurrentTime(new Date(Date.now() + serverOffsetRef.current));
      }
    };

    syncServerTime();
    // Re-synchronize with VPS every 3 minutes
    const syncTimer = setInterval(syncServerTime, 3 * 60 * 1000);
    return () => clearInterval(syncTimer);
  }, []);

  // Live clock ticker aligned to VPS
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date(Date.now() + serverOffsetRef.current));
    }, 1000);
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

  const isSubmittingRef = useRef(false);

  // Process Check-In
  const handleCheckIn = async (codeToSubmit: string, method: 'Barcode' | 'Manual' = 'Manual') => {
    const code = codeToSubmit.trim();
    if (!code || isSubmittingRef.current) return;

    try {
      isSubmittingRef.current = true;
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

      setCheckInError(null);
      const res = await api.checkIn(code, selectedReason, "General", method);

      if (res.isNewStudent) {
        setUnregisteredCode(code);
        setShowNewStudentModal(true);
      } else if (res.isCapacityFull) {
        setCheckInError({
          title: "Aforo Máximo Alcanzado",
          message: "Lo sentimos, la biblioteca ha alcanzado su capacidad máxima (60 personas). Por favor, intenta más tarde."
        });
      } else if (res.isOutsideHours) {
        setCheckInError({
          title: "Fuera de Horario",
          message: "La biblioteca atiende de 08:00 a 22:00. No es posible registrar asistencia fuera de este horario."
        });
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
      } else {
         setCheckInError({
          title: "Error de Registro",
          message: res.message || "Ocurrió un problema al registrar la asistencia."
        });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  // Hardware Barcode Scanner listener
  useBarcodeScanner({
    onScan: (scannedCode) => {
      setScannerNotification(`Código detectado por escáner: ${scannedCode}`);
      setTimeout(() => setScannerNotification(null), 3500);
      setStudentCodeInput(scannedCode);
      handleCheckIn(scannedCode, 'Barcode');
    }
  });

  const handleStudentRegistered = (person: LibraryPerson, checkInRes?: CheckInResponse) => {
    setShowNewStudentModal(false);
    setUnregisteredCode('');
    setStudentCodeInput('');
    if (checkInRes && checkInRes.success) {
      setCheckInResult(checkInRes);
      setShowSuccessModal(true);
      setPulseGlobeTrigger(prev => prev + 1);
      refreshOccupancy();
    } else {
      // If no check-in info provided but successful, force a check-in
      const key = person.code || person.documentNumber;
      if (key) {
        handleCheckIn(key, 'Manual');
      }
    }
  };

  const handleCloseSuccessModal = React.useCallback(() => {
    setShowSuccessModal(false);
    setCheckInResult(null);
  }, []);

  // Switch to admin view if authenticated
  if (isAdminView && authSession) {
    return (
      <AdminDashboard
        session={authSession}
        onLogout={() => {
          setAuthSession(null);
          setIsAdminView(false);
          localStorage.removeItem('authSession');
          localStorage.removeItem('token');
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: '#FDFBF7' }}>
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
            <div style={{ fontSize: '0.74rem', fontWeight: 800, letterSpacing: '0.9px', color: 'rgb(33 97 44)' }}>
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
        {/* Left Side: Floating Elements (Rotating Greeting aligned right towards card) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: '24px',
            minHeight: '520px',
            width: '100%'
          }}
        >
          {/* Top: Rotating Greeting (Right-aligned) */}
          <div style={{ width: '100%' }}>
            <RotatingGreeting />
          </div>

          <div style={{ flex: 1, minHeight: '60px' }} />
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


          {/* Capacity Thermometer */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} /> Aforo Actual
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: occupancy.currentOccupancy >= occupancy.maxCapacity ? '#ef4444' : '#059669' }}>
                {occupancy.currentOccupancy} / {occupancy.maxCapacity}
              </span>
            </div>
            <div style={{ width: '100%', height: '10px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, occupancy.occupancyPercentage)}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{
                  height: '100%',
                  background: occupancy.occupancyPercentage >= 100 
                    ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' 
                    : occupancy.occupancyPercentage >= 80 
                      ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                  borderRadius: '10px'
                }}
              />
            </div>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px', letterSpacing: '-0.3px' }}>
            Registro de Asistencia
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '22px' }}>
            Acerca tu carné universitario al lector o digita tu código de estudiante URP:
          </p>

          <AnimatePresence>
            {checkInError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  marginBottom: '20px',
                  padding: '14px 18px',
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '12px',
                  color: '#991b1b'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Shield size={18} color="#dc2626" />
                  <strong style={{ fontSize: '0.9rem' }}>{checkInError.title}</strong>
                </div>
                <div style={{ fontSize: '0.82rem', paddingLeft: '26px' }}>
                  {checkInError.message}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  id="kiosk-code-input"
                  type="text"
                  required
                  autoFocus
                  value={studentCodeInput}
                  onChange={(e) => {
                    setStudentCodeInput(e.target.value);
                    if (checkInError) setCheckInError(null);
                  }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Motivo de Visita
                </label>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 500 }}>
                  Selecciona una opción
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {VISIT_REASONS.map((reason) => {
                  const Icon = reason.icon;
                  const isSelected = selectedReason === reason.id;
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => setSelectedReason(reason.id)}
                      style={{
                        padding: '12px 6px',
                        borderRadius: '12px',
                        border: isSelected ? `2px solid ${reason.activeBorder}` : '1.5px solid #e2e8f0',
                        background: isSelected ? reason.activeBg : '#ffffff',
                        color: isSelected ? reason.activeText : '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: isSelected ? reason.activeGlow : 'none',
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
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isSelected ? reason.iconBgActive : '#f1f5f9',
                          color: isSelected ? reason.iconColorActive : '#64748b',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <span style={{ 
                        textAlign: 'center', 
                        lineHeight: 1.25, 
                        fontSize: '0.78rem',
                        fontWeight: isSelected ? 700 : 600
                      }}>
                        {reason.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !studentCodeInput.trim()}
              style={{
                width: '100%',
                padding: '14px 20px',
                fontSize: '0.96rem',
                fontWeight: 700,
                borderRadius: '12px',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                border: studentCodeInput.trim() ? '1px solid #0f5142' : '1px solid #e2e8f0',
                background: studentCodeInput.trim()
                  ? 'linear-gradient(135deg, #0f5142 0%, #059669 100%)'
                  : '#f8fafc',
                color: studentCodeInput.trim() ? '#ffffff' : '#94a3b8',
                cursor: studentCodeInput.trim() && !loading ? 'pointer' : 'not-allowed',
                boxShadow: studentCodeInput.trim()
                  ? '0 4px 14px rgba(15, 81, 66, 0.25), 0 2px 4px rgba(15, 81, 66, 0.15)'
                  : 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: studentCodeInput.trim() && !loading ? 'translateY(0)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (studentCodeInput.trim() && !loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #0b3d32 0%, #047857 100%)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 81, 66, 0.35)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (studentCodeInput.trim() && !loading) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #0f5142 0%, #059669 100%)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(15, 81, 66, 0.25), 0 2px 4px rgba(15, 81, 66, 0.15)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? (
                <span>Verificando asistencia...</span>
              ) : (
                <>
                  <div
                    style={{
                      background: studentCodeInput.trim() ? 'rgba(255, 255, 255, 0.2)' : '#e2e8f0',
                      borderRadius: '50%',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: studentCodeInput.trim() ? '#ffffff' : '#94a3b8',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <CheckCircle2 size={17} />
                  </div>
                  <span>Registrar Asistencia (Entrada / Salida)</span>
                </>
              )}
            </button>
          </form>


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
        onClose={() => {
          setShowNewStudentModal(false);
          setUnregisteredCode('');
          setStudentCodeInput('');
        }}
        onSuccess={handleStudentRegistered}
      />

      <CheckInSuccessModal
        data={showSuccessModal ? checkInResult : null}
        onClose={handleCloseSuccessModal}
      />

      <LibrarianLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(session) => {
          setAuthSession(session);
          setIsAdminView(true);
          localStorage.setItem('authSession', JSON.stringify(session));
          localStorage.setItem('token', session.token);
          localStorage.setItem('isAdminView', 'true');
        }}
      />
    </div>
  );
}

export default App;
