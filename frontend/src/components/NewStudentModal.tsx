import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Check, UserCircle2, GraduationCap, Briefcase, Building2, MapPin } from 'lucide-react';
import { api, LibraryPerson, CheckInResponse, AcademicTreeFaculty, PersonTypeValue, PERSON_TYPES, PostgraduateProgram } from '../services/api';

interface NewPersonModalProps {
  isOpen: boolean;
  prefilledCode: string;
  onClose: () => void;
  onSuccess: (person: LibraryPerson, checkInRes?: CheckInResponse) => void;
  initialPerson?: LibraryPerson;
  initialType?: PersonTypeValue;
}

const MAESTRIA_PROGRAMS = [
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

const DOCTORADO_PROGRAMS = [
  "Administración de Negocios Globales",
  "Ciencia Política y Relaciones Internacionales"
];

export const NewStudentModal: React.FC<NewPersonModalProps> = ({
  isOpen,
  prefilledCode,
  onClose,
  onSuccess,
  initialPerson,
  initialType
}) => {
  const isEdit = !!initialPerson;
  const [academicTree, setAcademicTree] = useState<AcademicTreeFaculty[]>([]);
  const [dbPrograms, setDbPrograms] = useState<PostgraduateProgram[]>([]);
  
  const [personType, setPersonType] = useState<PersonTypeValue>(initialPerson?.personType || 'Alumno');

  // Dynamic Programs list from DB (with fallback to default constant list)
  const maestriaProgramsList = useMemo(() => {
    const fromDb = dbPrograms.filter(p => p.degreeType === 'Maestría').map(p => p.name);
    return fromDb.length > 0 ? fromDb : MAESTRIA_PROGRAMS;
  }, [dbPrograms]);

  const doctoradoProgramsList = useMemo(() => {
    const fromDb = dbPrograms.filter(p => p.degreeType === 'Doctorado').map(p => p.name);
    return fromDb.length > 0 ? fromDb : DOCTORADO_PROGRAMS;
  }, [dbPrograms]);
  
  const [formData, setFormData] = useState({
    code: prefilledCode,
    documentNumber: '',
    firstName: '',
    lastName: '',
    career: 'Traducción e Interpretación',
    faculty: 'Humanidades y Lenguas Modernas',
    program: MAESTRIA_PROGRAMS[0],
    email: prefilledCode ? `${prefilledCode}@urp.edu.pe` : '',
    phone: '',
    checkInNow: true,
    visitReason: 'Lectura / Estudio',
    entryMethod: 'Manual'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load dynamic academic tree and postgraduate programs
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      api.getAcademicTree(),
      api.getPostgraduatePrograms()
    ]).then(([tree, progs]) => {
      if (isMounted) {
        if (tree && tree.length > 0) setAcademicTree(tree);
        if (progs && progs.length > 0) setDbPrograms(progs);
      }
    }).catch(err => {
      console.warn('Could not load academic tree or programs:', err);
    });
    return () => { isMounted = false; };
  }, []);

  const currentFacultyObj = useMemo(() => {
    if (!academicTree.length) return null;
    const currentName = (formData.faculty || '').toLowerCase().trim();
    return academicTree.find(f => {
      const fName = f.name.toLowerCase().trim();
      return fName === currentName || fName.includes(currentName) || currentName.includes(fName);
    }) || academicTree[0];
  }, [academicTree, formData.faculty]);

  const availableCareers = useMemo(() => {
    if (!currentFacultyObj || !currentFacultyObj.careers) return [];
    return currentFacultyObj.careers.map(c => c.name);
  }, [currentFacultyObj]);

  const handleFacultyChange = (newFaculty: string) => {
    const fObj = academicTree.find(f => {
      const fName = f.name.toLowerCase().trim();
      const nName = newFaculty.toLowerCase().trim();
      return fName === nName || fName.includes(nName) || nName.includes(fName);
    });
    const careers = fObj && fObj.careers ? fObj.careers.map(c => c.name) : [];
    const newCareer = careers.length > 0 ? careers[0] : '';
    setFormData(prev => ({ ...prev, faculty: newFaculty, career: newCareer }));
  };

  const handleCodeChange = (newCode: string) => {
    setFormData(prev => {
      const prevCode = prev.code.trim();
      const prevAutoEmail = prevCode ? `${prevCode}@urp.edu.pe` : '';
      const isAutoEmail = !prev.email || prev.email === prevAutoEmail || prev.email.endsWith('@urp.edu.pe');
      const newEmail = isAutoEmail ? (newCode.trim() ? `${newCode.trim()}@urp.edu.pe` : '') : prev.email;

      return {
        ...prev,
        code: newCode,
        email: newEmail
      };
    });
  };

  const handleClose = () => {
    setFormData({
      code: '',
      documentNumber: '',
      firstName: '',
      lastName: '',
      career: 'Traducción e Interpretación',
      faculty: 'Humanidades y Lenguas Modernas',
      program: MAESTRIA_PROGRAMS[0],
      email: '',
      phone: '',
      checkInNow: true,
      visitReason: 'Lectura / Estudio',
      entryMethod: 'Manual'
    });
    setError(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;

    if (initialPerson) {
      setPersonType(initialPerson.personType);
      setFormData({
        code: initialPerson.code,
        documentNumber: initialPerson.documentNumber || '',
        firstName: initialPerson.firstName,
        lastName: initialPerson.lastName,
        career: initialPerson.career || 'Traducción e Interpretación',
        faculty: initialPerson.faculty || 'Humanidades y Lenguas Modernas',
        program: initialPerson.program || MAESTRIA_PROGRAMS[0],
        email: initialPerson.email || '',
        phone: initialPerson.phone || '',
        checkInNow: false,
        visitReason: 'Lectura / Estudio',
        entryMethod: 'Manual'
      });
    } else {
      const defaultType = initialType || 'Alumno';
      setPersonType(defaultType);
      
      const code = prefilledCode ? prefilledCode.trim() : '';
      const isDniLikely = code.length === 8 && /^\d+$/.test(code);
      
      const defaultFaculty = academicTree.length > 0 ? academicTree[0].name : 'Humanidades y Lenguas Modernas';
      const defaultCareer = (academicTree.length > 0 && academicTree[0].careers && academicTree[0].careers.length > 0)
        ? academicTree[0].careers[0].name
        : 'Traducción e Interpretación';
      const defaultProgram = maestriaProgramsList.length > 0 ? maestriaProgramsList[0] : '';

      setFormData({
        code: isDniLikely ? '' : code,
        documentNumber: isDniLikely ? code : '',
        firstName: '',
        lastName: '',
        career: defaultCareer,
        faculty: defaultFaculty,
        program: defaultProgram,
        email: !isDniLikely && code ? `${code}@urp.edu.pe` : '',
        phone: '',
        checkInNow: true,
        visitReason: 'Lectura / Estudio',
        entryMethod: 'Manual'
      });
    }
    setError(null);
  }, [isOpen, prefilledCode, initialPerson, initialType, academicTree, maestriaProgramsList]);

  if (!isOpen) return null;

  const needsCode = ['Alumno', 'Maestrando', 'Doctorando'].includes(personType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((needsCode && !formData.code) || !formData.firstName || !formData.lastName || !formData.documentNumber) {
      setError(`Por favor completa todos los campos requeridos (*)`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        personType: personType,
        code: needsCode ? formData.code : '',
        documentNumber: formData.documentNumber,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        faculty: personType === 'Alumno' ? formData.faculty : '',
        career: personType === 'Alumno' ? formData.career : '',
        program: personType === 'Maestrando' || personType === 'Doctorando' ? formData.program : '',
        checkInNow: !isEdit ? formData.checkInNow : false,
        visitReason: formData.visitReason,
        entryMethod: formData.entryMethod
      };
      
      if (isEdit && initialPerson?.id) {
        const res = await api.updatePerson(initialPerson.id, payload);
        if (res.success && res.person) {
          onSuccess(res.person);
        } else {
          setError(res.message || 'Error al actualizar registro.');
        }
      } else {
        const res = await api.registerPerson(payload as any);
        if (res.success && res.person) {
          onSuccess(res.person, { success: true } as any); // Mock checkin success if needed
        } else {
          setError(res.message || 'Error al guardar el registro.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Alumno': return <UserCircle2 size={18} />;
      case 'Docente': return <Briefcase size={18} />;
      case 'Visitante': return <MapPin size={18} />;
      case 'Maestrando': return <GraduationCap size={18} />;
      case 'Doctorando': return <Building2 size={18} />;
      default: return <UserCircle2 size={18} />;
    }
  };

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
          zIndex: 1000,
          padding: '20px'
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          style={{
            maxWidth: '40%',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: '18px',
            padding: '32px',
            position: 'relative',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)'
          }}
        >
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={17} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
            <div 
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'var(--urp-green-light)',
                border: '1px solid rgba(15, 81, 66, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--urp-green-primary)'
              }}
            >
              <UserPlus size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {isEdit ? 'Editar Registro' : 'Registro de Nuevo Usuario'}
                </h2>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isEdit ? 'Modifica los datos del usuario en el sistema.' : 'Completa tus datos por única vez para acceder a la biblioteca San Jerónimo.'}
              </p>
            </div>
          </div>

          {!isEdit && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
              {PERSON_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPersonType(type);
                    if (type === 'Maestrando') setFormData(f => ({ ...f, program: MAESTRIA_PROGRAMS[0] }));
                    if (type === 'Doctorando') setFormData(f => ({ ...f, program: DOCTORADO_PROGRAMS[0] }));
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: `1px solid ${personType === type ? 'var(--urp-green-primary)' : '#e2e8f0'}`,
                    background: personType === type ? 'var(--urp-green-light)' : '#ffffff',
                    color: personType === type ? 'var(--urp-green-primary)' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {getTypeIcon(type)}
                  {type}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '0.88rem', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              
              {needsCode && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Código Institucional *
                  </label>
                  <input
                    type="text"
                    required={needsCode}
                    disabled={isEdit}
                    value={formData.code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="input-futuristic"
                    placeholder="Ej: 202410345"
                    style={{ fontSize: '0.95rem', padding: '10px 14px' }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  DNI o Carné de Extranjería *
                </label>
                <input
                  type="text"
                  required
                  value={formData.documentNumber}
                  onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
                  className="input-futuristic"
                  placeholder="Ej: 74581290"
                  style={{ fontSize: '0.95rem', padding: '10px 14px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Nombres *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="input-futuristic"
                  placeholder="Ej: Valeria Nicole"
                  style={{ fontSize: '0.95rem', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="input-futuristic"
                  placeholder="Ej: Mendoza Rojas"
                  style={{ fontSize: '0.95rem', padding: '10px 14px' }}
                />
              </div>
            </div>

            {personType === 'Alumno' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Facultad
                  </label>
                  <select
                    value={formData.faculty}
                    onChange={(e) => handleFacultyChange(e.target.value)}
                    className="input-futuristic"
                    style={{ fontSize: '0.92rem', padding: '10px 14px' }}
                  >
                    {academicTree.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                    Carrera Profesional
                  </label>
                  <select
                    value={formData.career}
                    onChange={(e) => setFormData({ ...formData, career: e.target.value })}
                    className="input-futuristic"
                    style={{ fontSize: '0.92rem', padding: '10px 14px' }}
                  >
                    {availableCareers.length === 0 ? (
                      <option value="">Sin carreras disponibles</option>
                    ) : (
                      availableCareers.map(c => <option key={c} value={c}>{c}</option>)
                    )}
                  </select>
                </div>
              </div>
            )}

            {personType === 'Maestrando' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Programa de Maestría
                </label>
                <select
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="input-futuristic"
                  style={{ fontSize: '0.92rem', padding: '10px 14px', width: '100%' }}
                >
                  {maestriaProgramsList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {personType === 'Doctorando' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Programa de Doctorado
                </label>
                <select
                  value={formData.program}
                  onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                  className="input-futuristic"
                  style={{ fontSize: '0.92rem', padding: '10px 14px', width: '100%' }}
                >
                  {doctoradoProgramsList.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  {personType === 'Visitante' ? 'Correo Electrónico' : 'Correo Institucional'}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-futuristic"
                  placeholder="ejemplo@urp.edu.pe"
                  style={{ fontSize: '0.95rem', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Teléfono / Celular (Opcional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-futuristic"
                  placeholder="Ej: 987654321"
                  style={{ fontSize: '0.95rem', padding: '10px 14px' }}
                />
              </div>
            </div>

            {!isEdit && (
              <div 
                style={{ 
                  padding: '12px 16px', 
                  background: '#f8fafc', 
                  borderRadius: '10px', 
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  id="checkInNow"
                  checked={formData.checkInNow}
                  onChange={(e) => setFormData({ ...formData, checkInNow: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#0f5142', cursor: 'pointer' }}
                />
                <label htmlFor="checkInNow" style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 500, cursor: 'pointer' }}>
                  Marcar ingreso a la biblioteca San Jerónimo de inmediato al registrarme
                </label>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '14px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Cancelar</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 24px',
                  borderRadius: '8px',
                  border: '1px solid #0f5142',
                  background: 'var(--urp-green-primary)',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 4px rgba(15, 81, 66, 0.2)'
                }}
              >
                {loading ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Check size={16} /> 
                    <span>{isEdit ? 'Guardar Cambios' : 'Guardar y Continuar'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
