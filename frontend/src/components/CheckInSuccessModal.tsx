import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Award, Quote, Trophy, ArrowRight, BookOpen, X } from 'lucide-react';
import { CheckInResponse } from '../services/api';

interface CheckInSuccessModalProps {
  data: CheckInResponse | null;
  onClose: () => void;
}

export const CheckInSuccessModal: React.FC<CheckInSuccessModalProps> = ({ data, onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [greetingWord, setGreetingWord] = React.useState("¡Bienvenido/a");

  useEffect(() => {
    if (!data?.success) return;

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.65 },
      colors: ['#0f5142', '#b45309', '#0284c7', '#059669']
    });

    // TTS Random Greeting
    if (data.student?.firstName) {
      const greetings = [
        { text: "Bienvenido", display: "¡Bienvenido/a", lang: "es-ES" },
        { text: "Welcome", display: "Welcome", lang: "en-US" },
        { text: "Bienvenue", display: "Bienvenue", lang: "fr-FR" },
        { text: "Willkommen", display: "Willkommen", lang: "de-DE" },
        { text: "Bem-vindo", display: "Bem-vindo", lang: "pt-BR" },
        { text: "欢迎", display: "欢迎", lang: "zh-CN" }
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      setGreetingWord(randomGreeting.display);
      
      const textToSpeak = `${randomGreeting.text}, ${data.student.firstName}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = randomGreeting.lang;
      utterance.rate = 1.15;
      window.speechSynthesis.speak(utterance);
    }

    // Auto-dismiss in exactly 2 seconds
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, 2000);

    return () => clearTimeout(timer);
  }, [data]);

  if (!data || !data.success) return null;

  const student = data.student;
  const quote = data.quote;
  const totalVisits = student?.totalVisits || 1;

  // Level classification (no emojis, pure academic titles)
  let levelTitle = "Lector Inicial (A1)";
  if (totalVisits >= 30) levelTitle = "Maestro Políglota (C2)";
  else if (totalVisits >= 20) levelTitle = "Investigador Avanzado (C1)";
  else if (totalVisits >= 10) levelTitle = "Lector Frecuente (B2)";
  else if (totalVisits >= 5) levelTitle = "Visitante Constante (B1)";

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
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
            overflow: 'hidden'
          }}
        >
          {/* Close button X */}
          <button
            onClick={onClose}
            title="Cerrar (o esperar 2 segundos)"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            <X size={16} />
          </button>

          {/* 2-second countdown indicator */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 2, ease: 'linear' }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '3.5px',
              background: 'linear-gradient(90deg, var(--urp-green-primary) 0%, #059669 100%)'
            }}
          />

          {/* Animated Success SVG Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0f5142 0%, #064e3b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
              boxShadow: '0 10px 20px rgba(15, 81, 66, 0.25)'
            }}
          >
            <CheckCircle2 size={42} color="#ffffff" />
          </motion.div>

          <span 
            className="badge-tag" 
            style={{ 
              background: 'var(--urp-gold-light)', 
              color: 'var(--urp-gold-primary)', 
              border: '1px solid rgba(180, 83, 9, 0.25)', 
              marginBottom: '12px' 
            }}
          >
            <Award size={14} /> {levelTitle}
          </span>

          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
            {greetingWord}, {student?.firstName || 'Estudiante'}!
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '18px' }}>
            {student?.career} • Código: <strong style={{ color: 'var(--text-main)' }}>{student?.studentCode}</strong>
          </p>

          {/* Stats Bar */}
          <div 
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '24px',
              padding: '14px',
              background: '#f8fafc',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #e2e8f0'
            }}
          >
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
          </div>

          {/* Literary Quote Card */}
          {quote && (
            <div 
              style={{
                background: '#f8fafc',
                border: '1px solid rgba(180, 83, 9, 0.2)',
                borderLeft: '4px solid var(--urp-gold-primary)',
                borderRadius: '10px',
                padding: '16px 18px',
                textAlign: 'left',
                position: 'relative',
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


        </motion.div>
      </div>
    </AnimatePresence>
  );
};
