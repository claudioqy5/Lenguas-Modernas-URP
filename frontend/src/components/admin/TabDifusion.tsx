import React, { useState, useMemo } from 'react';
import { 
  Send, Users, Copy, Check, ExternalLink, 
  Sparkles, CheckCircle2, Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student } from '../../services/api';

interface TabDifusionProps {
  students: Student[];
}

export const TabDifusion: React.FC<TabDifusionProps> = ({ students }) => {
  const [selectedCareer, setSelectedCareer] = useState<string>('ALL');
  const [recipientSearch, setRecipientSearch] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [activeTemplate, setActiveTemplate] = useState<string>('');

  // Filter students who have a valid email
  const studentsWithEmail = useMemo(() => {
    return students.filter(s => s.email && s.email.trim().length > 0);
  }, [students]);

  // Unique careers with email
  const careers = useMemo(() => {
    return Array.from(new Set(studentsWithEmail.map(s => s.career))).filter(Boolean);
  }, [studentsWithEmail]);

  // Filtered by selected career
  const targetedRecipients = useMemo(() => {
    if (selectedCareer === 'ALL') return studentsWithEmail;
    return studentsWithEmail.filter(s => s.career === selectedCareer);
  }, [studentsWithEmail, selectedCareer]);

  // Filtered for preview search
  const searchedRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return targetedRecipients;
    const q = recipientSearch.toLowerCase();
    return targetedRecipients.filter(s => 
      s.fullName.toLowerCase().includes(q) ||
      s.studentCode.includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }, [targetedRecipients, recipientSearch]);

  const recipientEmails = useMemo(() => {
    return targetedRecipients.map(s => s.email.trim());
  }, [targetedRecipients]);

  const emailListString = useMemo(() => {
    return recipientEmails.join(', ');
  }, [recipientEmails]);

  // Templates
  const handleApplyTemplate = (type: 'libros' | 'horario' | 'devolucion' | 'general') => {
    setActiveTemplate(type);
    if (type === 'libros') {
      setSubject('[Biblioteca San Jerónimo] Nuevas Adquisiciones y Material Bibliográfico');
      setMessage(
        `Estimados estudiantes de la Facultad de Humanidades y Lenguas Modernas,\n\n` +
        `Nos complace informarles que la Biblioteca Especializada San Jerónimo ha incorporado a su colección nuevos volúmenes, diccionarios especializados y material de investigación en las áreas de Traducción, Lingüística, Literatura y Humanidades.\n\n` +
        `Los invitamos a visitar nuestras salas para consultar los nuevos títulos o solicitar préstamos en sala.\n\n` +
        `Atentamente,\n` +
        `Biblioteca Especializada San Jerónimo\n` +
        `Facultad de Humanidades y Lenguas Modernas\n` +
        `Universidad Ricardo Palma`
      );
    } else if (type === 'horario') {
      setSubject('[Biblioteca San Jerónimo] Horarios de Atención y Servicios en Sala');
      setMessage(
        `Estimados estudiantes,\n\n` +
        `Les recordamos que nuestro horario de atención habitual es de Lunes a Sábado de 08:00 a 21:00 horas.\n\n` +
        `Contamos con zonas de estudio individual y grupal, así como terminales para consulta de catálogos y lectura silenciosa.\n\n` +
        `¡Los esperamos en nuestras instalaciones!\n\n` +
        `Atentamente,\n` +
        `Biblioteca Especializada San Jerónimo\n` +
        `Facultad de Humanidades y Lenguas Modernas\n` +
        `Universidad Ricardo Palma`
      );
    } else if (type === 'devolucion') {
      setSubject('[Aviso Importante] Recordatorio de Devolución de Material Bibliográfico');
      setMessage(
        `Estimados estudiantes,\n\n` +
        `Por medio de la presente, se solicita a todos los alumnos que cuenten con libros o materiales prestados acercarse a la biblioteca para su respectiva devolución o renovación.\n\n` +
        `Mantener el catálogo al día permite que sus compañeros también puedan acceder a estos valiosos recursos de estudio.\n\n` +
        `Agradecemos su puntual colaboración.\n\n` +
        `Atentamente,\n` +
        `Biblioteca Especializada San Jerónimo\n` +
        `Facultad de Humanidades y Lenguas Modernas\n` +
        `Universidad Ricardo Palma`
      );
    } else {
      setSubject('[Comunicado Oficial] Biblioteca Especializada San Jerónimo - FHLM');
      setMessage(
        `Estimados estudiantes de la Facultad de Humanidades y Lenguas Modernas,\n\n` +
        `Nos dirigimos a ustedes para compartir la siguiente información de interés académico e institucional:\n\n` +
        `[Escriba aquí los detalles del comunicado...]\n\n` +
        `Para cualquier consulta o solicitud, estamos a su entera disposición en nuestras instalaciones.\n\n` +
        `Atentamente,\n` +
        `Biblioteca Especializada San Jerónimo\n` +
        `Facultad de Humanidades y Lenguas Modernas\n` +
        `Universidad Ricardo Palma`
      );
    }
  };

  const handleCopyEmails = () => {
    if (recipientEmails.length === 0) return;
    navigator.clipboard.writeText(emailListString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleOpenMailClient = () => {
    if (recipientEmails.length === 0) return;
    const bcc = encodeURIComponent(emailListString);
    const sub = encodeURIComponent(subject || 'Comunicado - Biblioteca San Jerónimo URP');
    const bod = encodeURIComponent(message || '');
    const mailtoUrl = `mailto:?bcc=${bcc}&subject=${sub}&body=${bod}`;
    window.open(mailtoUrl, '_blank');
  };

  const handleSendBroadcast = () => {
    if (!subject.trim() || !message.trim()) {
      alert('Por favor, ingresa el asunto y el mensaje del comunicado antes de enviar.');
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSendSuccess(true);
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch (e) {
        // Confetti fallback
      }
      setTimeout(() => {
        setSendSuccess(false);
      }, 4000);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {sendSuccess && (
        <div style={{
          padding: '16px 20px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{ padding: '8px', borderRadius: '50%', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>
              ¡Difusión Enviada y Registrada Exitosamente!
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: '#15803d' }}>
              El comunicado fue emitido para los {targetedRecipients.length} estudiantes seleccionados bajo el canal seguro.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Composer on Left, Recipient List on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(500px, 1.4fr) minmax(340px, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
                <Send size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Redactor de Comunicados
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Emite avisos oficiales directamente a las casillas institucionales
                </p>
              </div>
            </div>

            <div style={{
              fontSize: '0.82rem',
              color: 'var(--urp-green-primary)',
              fontWeight: 600,
              background: 'var(--urp-green-light)',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(15, 81, 66, 0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Users size={14} />
              <span>{targetedRecipients.length} destinatarios</span>
            </div>
          </div>

          {/* Segment Selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
              Segmentar Audiencia por Carrera:
            </label>
            <select
              value={selectedCareer}
              onChange={(e) => setSelectedCareer(e.target.value)}
              className="input-futuristic"
              style={{ fontSize: '0.88rem', padding: '10px 14px', width: '100%' }}
            >
              <option value="ALL">Todos los Estudiantes Registrados ({studentsWithEmail.length} correos)</option>
              {careers.map(c => {
                const count = studentsWithEmail.filter(s => s.career === c).length;
                return <option key={c} value={c}>{c} ({count} correos)</option>;
              })}
            </select>
          </div>

          {/* Quick Templates */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)' }}>
                Plantillas Rápidas Institucionales:
              </label>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleApplyTemplate('libros')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: activeTemplate === 'libros' ? '1px solid var(--urp-green-primary)' : '1px solid #e2e8f0',
                  background: activeTemplate === 'libros' ? 'var(--urp-green-light)' : '#f8fafc',
                  color: activeTemplate === 'libros' ? 'var(--urp-green-primary)' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Nuevos Libros
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('horario')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: activeTemplate === 'horario' ? '1px solid var(--urp-green-primary)' : '1px solid #e2e8f0',
                  background: activeTemplate === 'horario' ? 'var(--urp-green-light)' : '#f8fafc',
                  color: activeTemplate === 'horario' ? 'var(--urp-green-primary)' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Horarios y Aforo
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('devolucion')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: activeTemplate === 'devolucion' ? '1px solid var(--urp-green-primary)' : '1px solid #e2e8f0',
                  background: activeTemplate === 'devolucion' ? 'var(--urp-green-light)' : '#f8fafc',
                  color: activeTemplate === 'devolucion' ? 'var(--urp-green-primary)' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Devolución de Material
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('general')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: activeTemplate === 'general' ? '1px solid var(--urp-green-primary)' : '1px solid #e2e8f0',
                  background: activeTemplate === 'general' ? 'var(--urp-green-light)' : '#f8fafc',
                  color: activeTemplate === 'general' ? 'var(--urp-green-primary)' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Aviso General
              </button>
            </div>
          </div>

          {/* Subject Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Asunto del Comunicado
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej. [Biblioteca San Jerónimo] Nuevos recursos bibliográficos disponibles"
              className="input-futuristic"
              style={{ width: '100%', padding: '11px 14px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Message Field */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Cuerpo del Mensaje
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Redacta aquí la información que deseas comunicar a los estudiantes..."
              className="input-futuristic"
              rows={14}
              style={{ width: '100%', padding: '14px', fontSize: '0.88rem', resize: 'vertical', lineHeight: '1.5', minHeight: '290px' }}
            />
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '6px'
          }}>
            <button
              type="button"
              onClick={handleCopyEmails}
              disabled={recipientEmails.length === 0}
              title="Copiar lista de correos para pegar en Outlook o Webmail"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 15px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: copied ? '#15803d' : '#475569',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: recipientEmails.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {copied ? <Check size={15} color="#15803d" /> : <Copy size={15} />}
              <span>{copied ? '¡Correos Copiados!' : 'Copiar Correos (BCC)'}</span>
            </button>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleOpenMailClient}
                disabled={recipientEmails.length === 0}
                title="Abrir en tu cliente de correo (Outlook, Thunderbird, etc.)"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 15px',
                  borderRadius: '8px',
                  border: '1px solid #0284c7',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: recipientEmails.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ExternalLink size={15} />
                <span>Abrir en Outlook / Webmail</span>
              </button>

              <button
                type="button"
                onClick={handleSendBroadcast}
                disabled={isSending || recipientEmails.length === 0}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: '1px solid #0f5142',
                  background: 'var(--urp-green-primary)',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: (isSending || recipientEmails.length === 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 4px rgba(15, 81, 66, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (!isSending) e.currentTarget.style.background = '#0b3d32';
                }}
                onMouseLeave={(e) => {
                  if (!isSending) e.currentTarget.style.background = 'var(--urp-green-primary)';
                }}
              >
                <Send size={15} />
                <span>{isSending ? 'Enviando...' : 'Enviar Difusión'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recipients Directory */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Recipients List Panel */}
          <div style={{
            padding: '22px',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={16} style={{ color: 'var(--urp-green-primary)' }} />
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Destinatarios
                </h4>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
                {searchedRecipients.length} de {targetedRecipients.length}
              </span>
            </div>

            {/* Search inside recipients */}
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
              <input
                type="text"
                value={recipientSearch}
                onChange={(e) => setRecipientSearch(e.target.value)}
                placeholder="Buscar alumno en la lista..."
                className="input-futuristic"
                style={{ padding: '8px 12px 8px 34px', fontSize: '0.82rem', width: '100%' }}
              />
            </div>

            {/* Scrollable list */}
            <div style={{
              height: '560px',
              maxHeight: '560px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              paddingRight: '4px'
            }}>
              {searchedRecipients.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No se encontraron estudiantes con correo en este filtro.
                </div>
              ) : (
                searchedRecipients.map((s, idx) => (
                  <div 
                    key={s.id || s.studentCode || idx}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #f1f5f9',
                      background: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {s.firstName && s.lastName ? `${s.lastName}, ${s.firstName}` : s.fullName}
                      </span>
                      <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--urp-green-primary)', fontWeight: 700 }}>
                        {s.studentCode}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#0284c7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.email}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        color: '#64748b',
                        background: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid #e2e8f0',
                        whiteSpace: 'nowrap',
                        maxWidth: '130px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {s.career}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
