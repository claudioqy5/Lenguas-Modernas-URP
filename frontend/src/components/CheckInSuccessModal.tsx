import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Award, Quote, LogOut, Clock, X } from 'lucide-react';
import { CheckInResponse } from '../services/api';

interface CheckInSuccessModalProps {
  data: CheckInResponse | null;
  onClose: () => void;
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return 'menos de 1 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export const CheckInSuccessModal: React.FC<CheckInSuccessModalProps> = ({ data, onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [greetingWord, setGreetingWord] = React.useState('¡Bienvenido/a');

  const isCheckOut = data?.isCheckOut === true;

  useEffect(() => {
    if (!data?.success) return;

    if (!isCheckOut) {
      // Check-in: celebratory confetti + multilingual TTS greeting
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#0f5142', '#b45309', '#0284c7', '#059669']
      });

      if (data.student?.firstName) {
        const greetings = [
          { text: 'Bienvenido', display: '¡Bienvenido/a', lang: 'es-ES' },
          { text: 'Welcome', display: 'Welcome', lang: 'en-US' },
          { text: 'Bienvenue', display: 'Bienvenue', lang: 'fr-FR' },
          { text: 'Willkommen', display: 'Willkommen', lang: 'de-DE' },
          { text: 'Bem-vindo', display: 'Bem-vindo', lang: 'pt-BR' },
          { text: '欢迎', display: '欢迎', lang: 'zh-CN' }
        ];
        const g = greetings[Math.floor(Math.random() * greetings.length)];
        setGreetingWord(g.display);
        const utterance = new SpeechSynthesisUtterance(`${g.text}, ${data.student.firstName}`);
        utterance.lang = g.lang;
        utterance.rate = 1.15;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      // Check-out: warm farewell TTS
      if (data.student?.firstName) {
        const farewells = [
          { text: `Hasta pronto, ${data.student.firstName}`, lang: 'es-ES' },
          { text: `Goodbye, ${data.student.firstName}`, lang: 'en-US' },
          { text: `Au revoir, ${data.student.firstName}`, lang: 'fr-FR' },
        ];
        const f = farewells[Math.floor(Math.random() * farewells.length)];
        const utterance = new SpeechSynthesisUtterance(f.text);
        utterance.lang = f.lang;
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    }

    // Auto-dismiss after 3s (checkout gives a bit more time to read)
    const delay = isCheckOut ? 3000 : 2500;
    const timer = setTimeout(() => { onCloseRef.current(); }, delay);
    return () => clearTimeout(timer);
  }, [data, isCheckOut]);

  if (!data || !data.success) return null;

  const student = data.student;
  const quote = data.quote;
  const totalVisits = student?.totalVisits || 1;

  // Level classification
  let levelTitle = 'Lector Inicial (A1)';
  if (totalVisits >= 30) levelTitle = 'Maestro Políglota (C2)';
  else if (totalVisits >= 20) levelTitle = 'Investigador Avanzado (C1)';
  else if (totalVisits >= 10) levelTitle = 'Lector Frecuente (B2)';
  else if (totalVisits >= 5) levelTitle = 'Visitante Constante (B1)';

  // ── Colors per mode ─────────────────────────────────────────────────────────
  const accentColor = isCheckOut ? '#b45309' : '#0f5142';
  const accentColorLight = isCheckOut ? 'rgba(180,83,9,0.08)' : 'rgba(15,81,66,0.08)';
  const bgGradient = isCheckOut
    ? 'linear-gradient(135deg, #b45309 0%, #92400e 100%)'
    : 'linear-gradient(135deg, #0f5142 0%, #064e3b 100%)';
  const barGradient = isCheckOut
    ? 'linear-gradient(90deg, #b45309 0%, #d97706 100%)'
    : 'linear-gradient(90deg, var(--urp-green-primary) 0%, #059669 100%)';
  const dismissDelay = isCheckOut ? 3 : 2.5;

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '20px'
        }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          style={{
            maxWidth: '540px',
            width: '100%',
            padding: '36px',
            textAlign: 'center',
            position: 'relative',
            background: '#ffffff',
            borderRadius: '20px',
            border: `1.5px solid ${isCheckOut ? 'rgba(180,83,9,0.25)' : '#cbd5e1'}`,
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            overflow: 'hidden'
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            title={`Cerrar (o esperar ${dismissDelay} segundos)`}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: '#f1f5f9', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: '#64748b', cursor: 'pointer', transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            <X size={16} />
          </button>

          {/* Countdown bar */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: dismissDelay, ease: 'linear' }}
            style={{
              position: 'absolute', bottom: 0, left: 0,
              height: '3.5px', background: barGradient
            }}
          />

          {/* Animated icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
            style={{
              width: '76px', height: '76px', borderRadius: '50%',
              background: bgGradient, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: `0 10px 20px ${isCheckOut ? 'rgba(180,83,9,0.25)' : 'rgba(15,81,66,0.25)'}`
            }}
          >
            {isCheckOut
              ? <LogOut size={38} color="#ffffff" />
              : <CheckCircle2 size={42} color="#ffffff" />
            }
          </motion.div>

          <span
            className="badge-tag"
            style={{
              background: accentColorLight,
              color: accentColor,
              border: `1px solid ${accentColor}33`,
              marginBottom: '12px'
            }}
          >
            {isCheckOut
              ? <><Clock size={14} /> {formatDuration(data.durationMinutes)} en sala</>
              : <><Award size={14} /> {levelTitle}</>
            }
          </span>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
            {isCheckOut
              ? `¡Hasta pronto, ${student?.firstName || 'Estudiante'}!`
              : `${greetingWord}, ${student?.firstName || 'Estudiante'}!`
            }
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '18px' }}>
            {isCheckOut
              ? <>Salida registrada • Código: <strong style={{ color: 'var(--text-main)' }}>{student?.studentCode}</strong></>
              : <>{student?.career} • Código: <strong style={{ color: 'var(--text-main)' }}>{student?.studentCode}</strong></>
            }
          </p>

          {/* Stats bar */}
          <div
            style={{
              display: 'flex', justifyContent: 'center', gap: '24px',
              padding: '14px', background: '#f8fafc',
              borderRadius: '12px', marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}
          >
            {isCheckOut ? (
              <>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Tiempo en Sala
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: accentColor }}>
                    {formatDuration(data.durationMinutes)}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid #e2e8f0' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Visitas
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--urp-green-primary)' }}>
                    #{totalVisits}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid #e2e8f0' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Aforo Actual
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                    {data.currentOccupancy}/{data.maxCapacity}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Visitas
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--urp-green-primary)' }}>
                    #{totalVisits}
                  </div>
                </div>
                <div style={{ borderLeft: '1px solid #e2e8f0' }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Carrera
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '3px' }}>
                    {student?.career || 'Universidad Ricardo Palma'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Literary Quote (only on check-in, to keep checkout screen clean) */}
          {!isCheckOut && quote && (
            <div
              style={{
                background: '#f8fafc', border: '1px solid rgba(180, 83, 9, 0.2)',
                borderLeft: '4px solid var(--urp-gold-primary)', borderRadius: '10px',
                padding: '16px 18px', textAlign: 'left', position: 'relative',
                marginBottom: '22px'
              }}
            >
              <Quote size={18} color="#b45309" style={{ opacity: 0.7, marginBottom: '4px' }} />
              <p style={{ fontStyle: 'italic', fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.45, marginBottom: '6px' }}>
                "{quote.text}"
              </p>
              <p style={{ fontSize: '0.84rem', color: '#64748b', lineHeight: 1.35, marginBottom: '8px' }}>
                Traducción: {quote.translation}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--urp-gold-primary)', fontWeight: 700 }}>
                <span>— {quote.author}</span>
                <span>[{quote.language}]</span>
              </div>
            </div>
          )}

          {/* Checkout farewell note */}
          {isCheckOut && (
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              ¡Gracias por tu visita! Vuelve cuando quieras. 📚
            </p>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
};
