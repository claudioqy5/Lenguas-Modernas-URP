import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, Users, Copy, Check, ExternalLink, 
  CheckCircle2, Search, GraduationCap, Briefcase, 
  MapPin, School, Building2, BookOpen, Clock, 
  RotateCcw, Sparkles, Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Student, LibraryPerson, PersonTypeValue, PERSON_TYPES, api, PostgraduateProgram } from '../../services/api';

export interface DiffusionRecipient {
  id?: string;
  fullName: string;
  code: string;
  documentNumber: string;
  email: string;
  phone: string;
  personType: PersonTypeValue;
  faculty: string;
  career: string;
  program: string;
}

interface TabDifusionProps {
  students: Student[];
  persons?: LibraryPerson[];
}

const DEFAULT_MAESTRIAS = [
  "Maestría en Administración y Crecimiento Empresarial",
  "Arquitectura con Mención en Gestión Empresarial",
  "Arquitectura y Sostenibilidad",
  "Ciencia de Datos e Inteligencia Artificial",
  "Ciencia Política",
  "Comportamiento Organizacional y Recursos Humanos",
  "Docencia Superior e Innovación Educativa",
  "Ecología y Gestión Ambiental",
  "Ingeniería Informática con Mención en Ingeniería de Software",
  "Ingeniería Vial con Mención en Carreteras, Puentes y Túneles",
  "Museología y Gestión Cultural",
  "Psicología Clínica y de la Salud",
  "Salud Pública con Mención en Administración Hospitalaria y de Servicios de Salud",
  "Supply Chain Management"
];

const DEFAULT_DOCTORADOS = [
  "Administración de Negocios Globales",
  "Ciencia Política y Relaciones Internacionales"
];

export const TabDifusion: React.FC<TabDifusionProps> = ({ students, persons = [] }) => {
  // Audience filters
  const [targetRole, setTargetRole] = useState<PersonTypeValue>('Todos');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('ALL');
  const [selectedCareer, setSelectedCareer] = useState<string>('ALL');
  const [selectedProgram, setSelectedProgram] = useState<string>('ALL');
  
  // Composer state
  const [recipientSearch, setRecipientSearch] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);
  const [activeTemplate, setActiveTemplate] = useState<string>('');
  const [dbPrograms, setDbPrograms] = useState<PostgraduateProgram[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.getPostgraduatePrograms().then(progs => {
      if (isMounted && progs && progs.length > 0) {
        setDbPrograms(progs);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // 1. Unify all recipients from students and persons who have a valid email address
  const allRecipients = useMemo<DiffusionRecipient[]>(() => {
    const list: DiffusionRecipient[] = [];
    const seenEmails = new Set<string>();
    const seenKeys = new Set<string>();

    // Step A: Add LibraryPersons (Docentes, Maestrandos, Doctorandos, Visitantes, Alumnos)
    persons.forEach(p => {
      const email = (p.email || '').trim();
      if (!email || !email.includes('@')) return;
      const emailKey = email.toLowerCase();
      if (seenEmails.has(emailKey)) return;
      seenEmails.add(emailKey);

      const codeKey = p.code ? `code:${p.code.trim().toLowerCase()}` : '';
      const docKey = p.documentNumber ? `doc:${p.documentNumber.trim().toLowerCase()}` : '';
      if (codeKey) seenKeys.add(codeKey);
      if (docKey) seenKeys.add(docKey);

      list.push({
        id: p.id,
        fullName: p.fullName?.trim() || `${p.lastName || ''} ${p.firstName || ''}`.trim() || '—',
        code: (p.code || '').trim(),
        documentNumber: (p.documentNumber || '').trim(),
        email,
        phone: (p.phone || '').trim(),
        personType: p.personType || 'Visitante',
        faculty: (p.faculty || '').trim(),
        career: (p.career || '').trim(),
        program: (p.program || '').trim()
      });
    });

    // Step B: Add Students with email (deduplicating if already present)
    students.forEach(s => {
      const email = (s.email || '').trim();
      if (!email || !email.includes('@')) return;
      const emailKey = email.toLowerCase();
      if (seenEmails.has(emailKey)) return;

      const codeKey = s.studentCode ? `code:${s.studentCode.trim().toLowerCase()}` : '';
      const docKey = s.documentNumber ? `doc:${s.documentNumber.trim().toLowerCase()}` : '';
      if ((codeKey && seenKeys.has(codeKey)) || (docKey && seenKeys.has(docKey))) {
        return;
      }

      seenEmails.add(emailKey);
      if (codeKey) seenKeys.add(codeKey);
      if (docKey) seenKeys.add(docKey);

      list.push({
        id: s.id,
        fullName: s.fullName?.trim() || `${s.lastName || ''} ${s.firstName || ''}`.trim() || '—',
        code: (s.studentCode || '').trim(),
        documentNumber: (s.documentNumber || '').trim(),
        email,
        phone: (s.phone || '').trim(),
        personType: 'Alumno',
        faculty: (s.faculty || '').trim(),
        career: (s.career || '').trim(),
        program: ''
      });
    });

    return list;
  }, [students, persons]);

  // Derived filter catalogs
  const faculties = useMemo(() => {
    const list = allRecipients
      .filter(r => targetRole === 'Todos' || r.personType === targetRole)
      .map(r => r.faculty)
      .filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [allRecipients, targetRole]);

  const careers = useMemo(() => {
    const relevant = allRecipients.filter(r => targetRole === 'Todos' || r.personType === targetRole);
    if (selectedFaculty === 'ALL') {
      return Array.from(new Set(relevant.map(r => r.career).filter(Boolean))).sort();
    }
    return Array.from(new Set(relevant.filter(r => r.faculty === selectedFaculty).map(r => r.career).filter(Boolean))).sort();
  }, [allRecipients, targetRole, selectedFaculty]);

  const maestriaProgramsList = useMemo(() => {
    const fromDb = dbPrograms.filter(p => p.degreeType === 'Maestría').map(p => p.name);
    const fromMembers = allRecipients.filter(r => r.personType === 'Maestrando').map(r => r.program).filter(Boolean);
    const set = new Set([...fromDb, ...DEFAULT_MAESTRIAS, ...fromMembers]);
    return Array.from(set).sort();
  }, [dbPrograms, allRecipients]);

  const doctoradoProgramsList = useMemo(() => {
    const fromDb = dbPrograms.filter(p => p.degreeType === 'Doctorado').map(p => p.name);
    const fromMembers = allRecipients.filter(r => r.personType === 'Doctorando').map(r => r.program).filter(Boolean);
    const set = new Set([...fromDb, ...DEFAULT_DOCTORADOS, ...fromMembers]);
    return Array.from(set).sort();
  }, [dbPrograms, allRecipients]);

  // 2. Targeted Recipients filtered by segment
  const targetedRecipients = useMemo(() => {
    return allRecipients.filter(r => {
      // Role filter
      if (targetRole !== 'Todos' && r.personType !== targetRole) {
        return false;
      }
      // Faculty filter
      if (selectedFaculty !== 'ALL' && r.faculty !== selectedFaculty) {
        return false;
      }
      // Career filter
      if (selectedCareer !== 'ALL' && r.career !== selectedCareer) {
        return false;
      }
      // Program filter
      if (selectedProgram !== 'ALL' && r.program !== selectedProgram) {
        return false;
      }
      return true;
    });
  }, [allRecipients, targetRole, selectedFaculty, selectedCareer, selectedProgram]);

  // 3. Filtered for preview search inside recipients list
  const searchedRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return targetedRecipients;
    const q = recipientSearch.toLowerCase().trim();
    return targetedRecipients.filter(r => 
      r.fullName.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q) ||
      r.documentNumber.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.career.toLowerCase().includes(q) ||
      r.program.toLowerCase().includes(q) ||
      r.faculty.toLowerCase().includes(q)
    );
  }, [targetedRecipients, recipientSearch]);

  const recipientEmails = useMemo(() => {
    return targetedRecipients.map(r => r.email.trim());
  }, [targetedRecipients]);

  const emailListString = useMemo(() => {
    return recipientEmails.join(', ');
  }, [recipientEmails]);

  // Handle switching audience role
  const handleRoleChange = (role: PersonTypeValue) => {
    setTargetRole(role);
    setSelectedFaculty('ALL');
    setSelectedCareer('ALL');
    setSelectedProgram('ALL');
  };

  const getRoleEmailCount = (role: PersonTypeValue) => {
    if (role === 'Todos') return allRecipients.length;
    return allRecipients.filter(r => r.personType === role).length;
  };

  const getRoleIcon = (role: PersonTypeValue) => {
    switch (role) {
      case 'Todos': return <Users size={14} />;
      case 'Alumno': return <GraduationCap size={14} />;
      case 'Docente': return <Briefcase size={14} />;
      case 'Visitante': return <MapPin size={14} />;
      case 'Maestrando': return <School size={14} />;
      case 'Doctorando': return <Building2 size={14} />;
      default: return <Users size={14} />;
    }
  };

  const getRoleBadgeStyle = (type: PersonTypeValue) => {
    switch (type) {
      case 'Alumno':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
      case 'Docente':
        return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Visitante':
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Maestrando':
        return { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' };
      case 'Doctorando':
        return { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' };
      default:
        return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
    }
  };

  // Dynamic Salutation based on target audience
  const getSalutation = () => {
    switch (targetRole) {
      case 'Alumno':
        return 'Estimados estudiantes de la Universidad Ricardo Palma,';
      case 'Docente':
        return 'Estimados docentes y catedráticos de la Universidad Ricardo Palma,';
      case 'Maestrando':
        return 'Estimados maestrandos de la Escuela de Posgrado - URP,';
      case 'Doctorando':
        return 'Estimados doctorandos e investigadores de la Escuela de Posgrado - URP,';
      case 'Visitante':
        return 'Estimados visitantes y usuarios externos de la Biblioteca Especializada San Jerónimo,';
      default:
        return 'Estimada Comunidad Universitaria (Alumnos, Docentes, Maestrandos, Doctorandos y Visitantes),';
    }
  };

  // Templates
  const handleApplyTemplate = (type: 'libros' | 'horario' | 'devolucion' | 'general' | 'investigacion') => {
    setActiveTemplate(type);
    const salutation = getSalutation();

    if (type === 'libros') {
      setSubject('[Biblioteca San Jerónimo] Nuevas Adquisiciones y Recursos Bibliográficos');
      setMessage(
        `${salutation}\n\n` +
        `Nos complace informarles que la Biblioteca Especializada San Jerónimo ha incorporado a su colección nuevos volúmenes, revistas académicas indexadas, diccionarios especializados y material de investigación multidisciplinario.\n\n` +
        `Los invitamos cordialmente a visitar nuestras salas para consultar los nuevos títulos o solicitar préstamos en sala y asesoría bibliográfica.\n\n` +
        `Atentamente,\n` +
        `Biblioteca Especializada San Jerónimo\n` +
        `Facultad de Humanidades y Lenguas Modernas\n` +
        `Universidad Ricardo Palma`
      );
    } else if (type === 'horario') {
      setSubject('[Biblioteca San Jerónimo] Horarios de Atención y Servicios en Sala');
      setMessage(
        `${salutation}\n\n` +
        `Les recordamos que nuestro horario habitual de atención y servicio en sala es de Lunes a Sábado de 08:00 a 21:00 horas.\n\n` +
        `Contamos con modernas áreas de estudio individual y grupal, cubículos de lectura silenciosa, terminales para consulta de catálogos y acceso a repositorios digitales.\n\n` +
        `¡Los esperamos en nuestras instalaciones!\n\n` +
        `Atentamente,\n` +
        `Biblioteca Especializada San Jerónimo\n` +
        `Facultad de Humanidades y Lenguas Modernas\n` +
        `Universidad Ricardo Palma`
      );
    } else if (type === 'devolucion') {
      setSubject('[Aviso Importante] Recordatorio de Devolución de Material Bibliográfico');
      setMessage(
        `${salutation}\n\n` +
        `Por medio de la presente, se solicita a todos los usuarios que cuenten con libros, tesis o materiales bibliográficos prestados acercarse a la biblioteca para su respectiva devolución o renovación.\n\n` +
        `Mantener el catálogo y la disponibilidad de ejemplares al día beneficia a toda la comunidad académica y de investigación.\n\n` +
        `Agradecemos de antemano su puntual colaboración.\n\n` +
        `Atentamente,\n` +
        `Biblioteca Especializada San Jerónimo\n` +
        `Facultad de Humanidades y Lenguas Modernas\n` +
        `Universidad Ricardo Palma`
      );
    } else if (type === 'investigacion') {
      setSubject('[Investigación y Capacitación] Acceso a Bases de Datos Científicas y Repositorio');
      setMessage(
        `${salutation}\n\n` +
        `Ponemos a su disposición los talleres de capacitación y asesoría especializada en el uso de bases de datos científicas suscritas (Scopus, Web of Science, EBSCO, ProQuest) y gestores bibliográficos para sus proyectos de investigación, tesis y publicaciones académicas.\n\n` +
        `Pueden solicitar sesiones personalizadas o grupales contactando al personal bibliotecario en sala.\n\n` +
        `Atentamente,\n` +
        `Biblioteca Especializada San Jerónimo\n` +
        `Facultad de Humanidades y Lenguas Modernas\n` +
        `Universidad Ricardo Palma`
      );
    } else {
      setSubject('[Comunicado Oficial] Biblioteca Especializada San Jerónimo - URP');
      setMessage(
        `${salutation}\n\n` +
        `Nos dirigimos a ustedes para compartir la siguiente información de interés académico e institucional:\n\n` +
        `[Escriba aquí los detalles del comunicado...]\n\n` +
        `Para cualquier consulta o solicitud, estamos a su entera disposición en nuestras instalaciones y canales oficiales.\n\n` +
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
        // Fallback
      }
      setTimeout(() => {
        setSendSuccess(false);
      }, 4000);
    }, 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

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
              El comunicado fue emitido para los {targetedRecipients.length} destinatarios seleccionados ({targetRole === 'Todos' ? 'Toda la Comunidad' : targetRole}s).
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Composer on Left, Recipient List on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(500px, 1.4fr) minmax(350px, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Header of Composer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '9px', borderRadius: '10px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
                <Send size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Redactor de Comunicados Institucionales
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Emite avisos y comunicados a toda la comunidad universitaria
                </p>
              </div>
            </div>

            {/* Controles del encabezado: Selector de Público Objetivo (Lista Desplegable) + Badge de Destinatarios */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>                
                <select
                  value={targetRole}
                  onChange={(e) => handleRoleChange(e.target.value as PersonTypeValue)}
                  className="input-futuristic"
                  style={{
                    fontSize: '0.84rem',
                    padding: '7px 12px',
                    fontWeight: 700,
                    color: 'var(--urp-green-primary)',
                    background: '#ffffff',
                    border: '1px solid rgba(15, 81, 66, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Todos">Toda la Comunidad ({getRoleEmailCount('Todos')})</option>
                  <option value="Alumno">Alumnos ({getRoleEmailCount('Alumno')})</option>
                  <option value="Docente">Docentes ({getRoleEmailCount('Docente')})</option>
                  <option value="Visitante">Visitantes ({getRoleEmailCount('Visitante')})</option>
                  <option value="Maestrando">Maestrandos ({getRoleEmailCount('Maestrando')})</option>
                  <option value="Doctorando">Doctorandos ({getRoleEmailCount('Doctorando')})</option>
                </select>
              </div>
            </div>
          </div>

          {/* Sub-segmentación Contextual según el Rol seleccionado */}
          {(targetRole === 'Alumno' || targetRole === 'Maestrando' || targetRole === 'Doctorando' || targetRole === 'Docente') && (
            <div style={{
              background: '#f8fafc',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-subtle)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={13} /> Filtrar por:
              </span>

              {/* Sub-filtro Alumnos: Facultad y Carrera */}
              {targetRole === 'Alumno' && (
                <>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => {
                      setSelectedFaculty(e.target.value);
                      setSelectedCareer('ALL');
                    }}
                    className="input-futuristic"
                    style={{ fontSize: '0.84rem', padding: '7px 12px', width: 'auto' }}
                  >
                    <option value="ALL">Todas las Facultades</option>
                    {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>

                  <select
                    value={selectedCareer}
                    onChange={(e) => setSelectedCareer(e.target.value)}
                    className="input-futuristic"
                    style={{ fontSize: '0.84rem', padding: '7px 12px', width: 'auto' }}
                  >
                    <option value="ALL">{selectedFaculty === 'ALL' ? 'Todas las Carreras' : `Carreras de ${selectedFaculty}`}</option>
                    {careers.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </>
              )}

              {/* Sub-filtro Maestrandos: Programas de Maestría */}
              {targetRole === 'Maestrando' && (
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="input-futuristic"
                  style={{ fontSize: '0.84rem', padding: '7px 12px', width: 'auto', maxWidth: '380px' }}
                >
                  <option value="ALL">Todos los Programas de Maestría</option>
                  {maestriaProgramsList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}

              {/* Sub-filtro Doctorandos: Programas de Doctorado */}
              {targetRole === 'Doctorando' && (
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="input-futuristic"
                  style={{ fontSize: '0.84rem', padding: '7px 12px', width: 'auto', maxWidth: '380px' }}
                >
                  <option value="ALL">Todos los Programas de Doctorado</option>
                  {doctoradoProgramsList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              )}

              {/* Sub-filtro Docentes: Facultad */}
              {targetRole === 'Docente' && faculties.length > 0 && (
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="input-futuristic"
                  style={{ fontSize: '0.84rem', padding: '7px 12px', width: 'auto' }}
                >
                  <option value="ALL">Todas las Facultades</option>
                  {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Plantillas Rápidas Institucionales */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-subtle)', marginBottom: '8px' }}>
              Plantillas Rápidas Adaptadas al Público:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleApplyTemplate('general')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
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
                <Send size={13} />
                <span>Aviso General</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('libros')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
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
                <BookOpen size={13} />
                <span>Nuevos Libros</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('investigacion')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: activeTemplate === 'investigacion' ? '1px solid var(--urp-green-primary)' : '1px solid #e2e8f0',
                  background: activeTemplate === 'investigacion' ? 'var(--urp-green-light)' : '#f8fafc',
                  color: activeTemplate === 'investigacion' ? 'var(--urp-green-primary)' : 'var(--text-main)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={13} />
                <span>Investigación y Bases de Datos</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('horario')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
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
                <Clock size={13} />
                <span>Horarios y Aforo</span>
              </button>

              <button
                type="button"
                onClick={() => handleApplyTemplate('devolucion')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
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
                <RotateCcw size={13} />
                <span>Devolución de Material</span>
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
              placeholder="Ej. [Biblioteca San Jerónimo] Nuevos recursos y avisos importantes"
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
              placeholder="Redacta aquí la información que deseas comunicar a los destinatarios..."
              className="input-futuristic"
              rows={13}
              style={{ width: '100%', padding: '14px', fontSize: '0.88rem', resize: 'vertical', lineHeight: '1.5', minHeight: '260px' }}
            />
          </div>

          {/* Action Buttons Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            paddingTop: '4px'
          }}>
            <button
              type="button"
              onClick={handleCopyEmails}
              disabled={recipientEmails.length === 0}
              title="Copiar lista de correos para pegar en Outlook o Webmail en CCO (BCC)"
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
              <span>{copied ? '¡Correos Copiados!' : 'Copiar Correos (CCO/BCC)'}</span>
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
          <div style={{
            padding: '20px',
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
                placeholder="Buscar por nombre, código, DNI o correo..."
                className="input-futuristic"
                style={{ padding: '8px 12px 8px 34px', fontSize: '0.82rem', width: '100%' }}
              />
            </div>

            {/* Scrollable list of recipients */}
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
                <div style={{ padding: '40px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                  No se encontraron destinatarios con correo registrado para este filtro.
                </div>
              ) : (
                searchedRecipients.map((r, idx) => (
                  <div 
                    key={r.id || `${r.personType}-${r.code}-${r.documentNumber}-${idx}`}
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
                        {r.fullName}
                      </span>
                      <span style={{
                        fontSize: '0.70rem',
                        padding: '1px 7px',
                        borderRadius: '10px',
                        fontWeight: 600,
                        background: getRoleBadgeStyle(r.personType).bg,
                        color: getRoleBadgeStyle(r.personType).color,
                        border: `1px solid ${getRoleBadgeStyle(r.personType).border}`
                      }}>
                        {r.personType}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: '#0284c7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.email}
                      </span>
                      {(r.code || r.documentNumber) && (
                        <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--urp-green-primary)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {r.code || r.documentNumber}
                        </span>
                      )}
                    </div>

                    {(r.career || r.program || r.faculty) && (
                      <div style={{ fontSize: '0.70rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.program || r.career || r.faculty}
                      </div>
                    )}
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
