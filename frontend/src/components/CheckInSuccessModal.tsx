import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { CheckCircle2, Award, Quote, Trophy, ArrowRight, BookOpen } from 'lucide-react';
import { CheckInResponse } from '../services/api';

interface CheckInSuccessModalProps {
  data: CheckInResponse | null;
  onClose: () => void;
}

export const CheckInSuccessModal: React.FC<CheckInSuccessModalProps> = ({ data, onClose }) => {
  useEffect(() => {
    if (data?.success) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#0f5142', '#b45309', '#0284c7', '#059669']
      });

      const timer = setTimeout(() => {
        onClose();
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [data, onClose]);

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
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)'
          }}
        >
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
            ¡Bienvenido/a, {student?.firstName || 'Estudiante'}!
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
                Especialidad
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-blue)', marginTop: '3px' }}>
                {student?.primaryLanguage || 'Idiomas'}
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

          <button
            onClick={onClose}
            className="btn-primary-gradient"
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            Continuar a la Sala de Estudio <ArrowRight size={18} />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
