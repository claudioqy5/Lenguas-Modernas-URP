import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Sparkles, Check } from 'lucide-react';
import { api, Student, CheckInResponse } from '../services/api';

interface NewStudentModalProps {
  isOpen: boolean;
  prefilledCode: string;
  onClose: () => void;
  onSuccess: (student: Student, checkInRes?: CheckInResponse) => void;
  initialStudent?: Student;
}

const CAREERS = [
  "Traducción e Interpretación",
  "Humanidades y Lingüística",
  "Turismo, Hotelería y Lenguas",
  "Biología",
  "Ingeniería Civil",
  "Medicina Humana",
  "Arquitectura",
  "Psicología",
  "Administración y Negocios Internacionales",
  "Otras Carreras URP"
];

const FACULTIES = [
  "Humanidades y Lenguas Modernas",
  "Ingeniería",
  "Medicina Humana",
  "Ciencias Biológicas",
  "Ciencias Económicas y Empresariales",
  "Arquitectura y Urbanismo",
  "Psicología",
  "Derecho y Ciencia Política",
  "Otras Facultades"
];



export const NewStudentModal: React.FC<NewStudentModalProps> = ({
  isOpen,
  prefilledCode,
  onClose,
  onSuccess,
  initialStudent
}) => {
  const isEdit = !!initialStudent;
  const [formData, setFormData] = useState({
    studentCode: prefilledCode,
    documentNumber: '',
    firstName: '',
    lastName: '',
    career: CAREERS[0],
    faculty: FACULTIES[0],
    email: prefilledCode ? `${prefilledCode}@urp.edu.pe` : '',
    phone: '',
    primaryLanguage: 'N/A',
    checkInNow: true,
    visitReason: 'Lectura / Estudio',
    languageFocus: 'General'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialStudent) {
      setFormData({
        studentCode: initialStudent.studentCode,
        documentNumber: initialStudent.documentNumber,
        firstName: initialStudent.firstName,
        lastName: initialStudent.lastName,
        career: initialStudent.career,
        faculty: initialStudent.faculty,
        email: initialStudent.email,
        phone: initialStudent.phone,
        primaryLanguage: initialStudent.primaryLanguage || 'N/A',
        checkInNow: false,
        visitReason: 'Lectura / Estudio',
        languageFocus: 'General'
      });
    } else if (prefilledCode) {
      setFormData(prev => ({
        ...prev,
        studentCode: prefilledCode,
        email: prev.email || `${prefilledCode}@urp.edu.pe`
      }));
    }
  }, [prefilledCode, initialStudent]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentCode || !formData.firstName || !formData.lastName) {
      setError('Por favor completa todos los campos requeridos (*)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (isEdit && initialStudent?.id) {
        const res = await api.updateStudent(initialStudent.id, formData);
        if (res.success) {
          // Send updated student via onSuccess (it might not return the full student depending on the API but let's assume it returns success)
          onSuccess({ ...initialStudent, ...formData } as Student);
        } else {
          setError(res.message || 'Error al actualizar el estudiante.');
        }
      } else {
        const res = await api.registerStudent(formData);
        if (res.success && res.student) {
          onSuccess(res.student, res.checkInResult);
        } else {
          setError(res.message || 'Error al guardar el estudiante.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
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
            maxWidth: '620px',
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
          {/* Close button */}
          <button
            onClick={onClose}
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

          {/* Header */}
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
                  {isEdit ? 'Editar Estudiante' : 'Registro de Nuevo Estudiante'}
                </h2>
                {!isEdit && (
                  <span className="badge-tag" style={{ background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)', border: '1px solid rgba(180, 83, 9, 0.25)' }}>
                    <Sparkles size={12} /> Primera Visita
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {isEdit ? 'Modifica los datos del estudiante en la base de datos.' : 'Completa tus datos por única vez para el acceso libre a la biblioteca San Jerónimo.'}
              </p>
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#b91c1c', fontSize: '0.88rem', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Código Universitario URP *
                </label>
                <input
                  type="text"
                  required
                  disabled={isEdit}
                  value={formData.studentCode}
                  onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                  className="input-futuristic"
                  placeholder="Ej: 202410345"
                  style={{ fontSize: '0.95rem', padding: '10px 14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  DNI o Carné Universitario
                </label>
                <input
                  type="text"
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Facultad
                </label>
                <select
                  value={formData.faculty}
                  onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                  className="input-futuristic"
                  style={{ fontSize: '0.92rem', padding: '10px 14px' }}
                >
                  {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
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
                  {CAREERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Correo Institucional
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-futuristic"
                  placeholder="codigo@urp.edu.pe"
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

            {/* Check-in now checkbox */}
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

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary-gradient"
                style={{ flex: 2 }}
              >
                {loading ? 'Guardando...' : (
                  <>
                    <Check size={18} /> {isEdit ? 'Guardar Cambios' : 'Guardar y Continuar'}
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
