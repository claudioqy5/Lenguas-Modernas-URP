import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, BookOpen, Plus, Edit3, Trash2, Search, 
  Check, X, AlertTriangle, Layers, GraduationCap, ArrowRight
} from 'lucide-react';
import { api, AcademicTreeFaculty, Faculty, Career, Student } from '../../services/api';

interface TabAcademicProps {
  students?: Student[];
  onTreeUpdated?: () => void;
}

export const TabAcademic: React.FC<TabAcademicProps> = ({ students = [], onTreeUpdated }) => {
  const [tree, setTree] = useState<AcademicTreeFaculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('ALL');

  // Search terms
  const [searchFaculty, setSearchFaculty] = useState('');
  const [searchCareer, setSearchCareer] = useState('');

  // Modals state
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facultyFormData, setFacultyFormData] = useState({ name: '', code: '' });

  const [careerModalOpen, setCareerModalOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);
  const [careerFormData, setCareerFormData] = useState({ name: '', code: '', facultyId: '' });

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'faculty' | 'career'; id: string; name: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load tree
  const loadAcademicData = async () => {
    try {
      setLoading(true);
      const data = await api.getAcademicTree();
      setTree(data);
      if (onTreeUpdated) onTreeUpdated();
    } catch (e: any) {
      console.error('Error loading academic tree:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcademicData();
  }, []);

  const showToast = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Filtered faculties
  const filteredFaculties = useMemo(() => {
    if (!searchFaculty.trim()) return tree;
    const q = searchFaculty.toLowerCase();
    return tree.filter(f => f.name.toLowerCase().includes(q) || (f.code && f.code.toLowerCase().includes(q)));
  }, [tree, searchFaculty]);

  // Selected faculty object
  const activeFaculty = useMemo(() => {
    if (selectedFacultyId === 'ALL') return null;
    return tree.find(f => f.id === selectedFacultyId) || null;
  }, [tree, selectedFacultyId]);

  // All careers or careers of selected faculty
  const displayedCareers = useMemo(() => {
    let list: Career[] = [];
    if (selectedFacultyId === 'ALL') {
      list = tree.flatMap(f => f.careers || []);
    } else {
      const f = tree.find(fac => fac.id === selectedFacultyId);
      list = f ? f.careers || [] : [];
    }

    if (searchCareer.trim()) {
      const q = searchCareer.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) || 
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.facultyName && c.facultyName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [tree, selectedFacultyId, searchCareer]);

  // Students count map per faculty and career
  const studentStats = useMemo(() => {
    const byCareer: Record<string, number> = {};
    const byFaculty: Record<string, number> = {};

    students.forEach(s => {
      if (s.career) byCareer[s.career] = (byCareer[s.career] || 0) + 1;
      if (s.faculty) byFaculty[s.faculty] = (byFaculty[s.faculty] || 0) + 1;
    });

    return { byCareer, byFaculty };
  }, [students]);

  // Handle Faculty Submit
  const handleSaveFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facultyFormData.name.trim()) {
      showToast('error', 'El nombre de la facultad es obligatorio.');
      return;
    }

    try {
      if (editingFaculty && editingFaculty.id) {
        const res = await api.updateFaculty(editingFaculty.id, facultyFormData);
        if (res.success) {
          showToast('success', res.message || 'Facultad actualizada con éxito.');
          setFacultyModalOpen(false);
          setEditingFaculty(null);
          await loadAcademicData();
        } else {
          showToast('error', res.message || 'Error al actualizar la facultad.');
        }
      } else {
        const res = await api.createFaculty(facultyFormData);
        if (res.success) {
          showToast('success', res.message || 'Facultad creada con éxito.');
          setFacultyModalOpen(false);
          await loadAcademicData();
        } else {
          showToast('error', res.message || 'Error al crear la facultad.');
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error de conexión');
    }
  };

  // Handle Career Submit
  const handleSaveCareer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!careerFormData.name.trim()) {
      showToast('error', 'El nombre de la carrera es obligatorio.');
      return;
    }
    if (!careerFormData.facultyId) {
      showToast('error', 'Debe seleccionar una facultad.');
      return;
    }

    try {
      if (editingCareer && editingCareer.id) {
        const res = await api.updateCareer(editingCareer.id, careerFormData);
        if (res.success) {
          showToast('success', res.message || 'Carrera actualizada con éxito.');
          setCareerModalOpen(false);
          setEditingCareer(null);
          await loadAcademicData();
        } else {
          showToast('error', res.message || 'Error al actualizar la carrera.');
        }
      } else {
        const res = await api.createCareer({
          name: careerFormData.name,
          code: careerFormData.code,
          facultyId: careerFormData.facultyId
        });
        if (res.success) {
          showToast('success', res.message || 'Carrera creada con éxito.');
          setCareerModalOpen(false);
          await loadAcademicData();
        } else {
          showToast('error', res.message || 'Error al crear la carrera.');
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error de conexión');
    }
  };

  // Confirm delete execution
  const executeDelete = async () => {
    if (!deleteConfirm) return;

    try {
      if (deleteConfirm.type === 'faculty') {
        const res = await api.deleteFaculty(deleteConfirm.id);
        if (res.success) {
          showToast('success', res.message || 'Facultad eliminada con éxito.');
          if (selectedFacultyId === deleteConfirm.id) setSelectedFacultyId('ALL');
          await loadAcademicData();
        } else {
          showToast('error', res.message || 'Error al eliminar la facultad.');
        }
      } else {
        const res = await api.deleteCareer(deleteConfirm.id);
        if (res.success) {
          showToast('success', res.message || 'Carrera eliminada con éxito.');
          await loadAcademicData();
        } else {
          showToast('error', res.message || 'Error al eliminar la carrera.');
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error al procesar eliminación.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Toast Feedback */}
      {feedback && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '10px',
          background: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          color: feedback.type === 'success' ? '#15803d' : '#b91c1c',
          fontSize: '0.88rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
          animation: 'fadeIn 0.2s ease'
        }}>
          {feedback.type === 'success' ? <Check size={18} /> : <AlertTriangle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Left Section (Facultades), Divider Line, & Right Section (Carreras Profesionales) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(330px, 1fr) 1px minmax(440px, 1.4fr)',
        gap: '32px',
        alignItems: 'stretch'
      }}>

        {/* ================= SECTION 1: FACULTADES ================= */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
                <Building2 size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Facultades
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {tree.length} facultades registradas
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingFaculty(null);
                setFacultyFormData({ name: '', code: '' });
                setFacultyModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #0f5142',
                background: 'var(--urp-green-primary)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(15, 81, 66, 0.15)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0b3d32'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--urp-green-primary)'}
            >
              <Plus size={15} />
              <span>Nueva Facultad</span>
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchFaculty}
              onChange={(e) => setSearchFaculty(e.target.value)}
              placeholder="Buscar facultad por nombre o código..."
              className="input-futuristic"
              style={{ padding: '8px 12px 8px 34px', fontSize: '0.84rem', width: '100%' }}
            />
          </div>

          {/* Show All Pill Filter Button */}
          <button
            onClick={() => setSelectedFacultyId('ALL')}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: '8px',
              border: selectedFacultyId === 'ALL' ? '1.5px solid var(--urp-green-primary)' : '1px solid #e2e8f0',
              background: selectedFacultyId === 'ALL' ? 'var(--urp-green-light)' : '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={15} color={selectedFacultyId === 'ALL' ? 'var(--urp-green-primary)' : '#64748b'} />
              <span style={{ fontSize: '0.85rem', fontWeight: selectedFacultyId === 'ALL' ? 700 : 500, color: selectedFacultyId === 'ALL' ? 'var(--urp-green-primary)' : 'var(--text-main)' }}>
                Todas las Carreras URP
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '12px', color: '#64748b', fontWeight: 600 }}>
              {tree.reduce((acc, f) => acc + (f.careers?.length || 0), 0)} carreras
            </span>
          </button>

          {/* Faculties Scroll List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            height: 'calc(100vh - 328px)',
            maxHeight: 'calc(100vh - 328px)',
            minHeight: '440px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {filteredFaculties.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                No se encontraron facultades.
              </div>
            ) : (
              filteredFaculties.map(f => {
                const isSelected = selectedFacultyId === f.id;
                const careerCount = f.careers?.length || 0;
                const studentsCount = studentStats.byFaculty[f.name] || 0;

                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedFacultyId(f.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: isSelected ? '1.5px solid var(--urp-green-primary)' : '1px solid #e2e8f0',
                      background: isSelected ? 'rgba(15, 81, 66, 0.05)' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: isSelected ? 'var(--urp-green-primary)' : 'var(--text-main)' }}>
                            {f.name}
                          </span>
                        </div>
                        {f.code && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
                            Acrónimo: {f.code}
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setEditingFaculty(f);
                            setFacultyFormData({ name: f.name, code: f.code || '' });
                            setFacultyModalOpen(true);
                          }}
                          title="Editar Facultad"
                          style={{
                            padding: '5px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#f8fafc',
                            color: '#475569',
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'faculty', id: f.id, name: f.name })}
                          title="Eliminar Facultad"
                          style={{
                            padding: '5px',
                            borderRadius: '6px',
                            border: '1px solid #fee2e2',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f8fafc', paddingTop: '6px' }}>
                      <span style={{
                        fontSize: '0.73rem',
                        color: 'var(--urp-green-primary)',
                        background: 'var(--urp-green-light)',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontWeight: 600
                      }}>
                        {careerCount} {careerCount === 1 ? 'carrera' : 'carreras'}
                      </span>
                      <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                        {studentsCount} {studentsCount === 1 ? 'alumno' : 'alumnos'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= SOFT MINIMALIST DIVIDER LINE ================= */}
        <div 
          style={{
            width: '1px',
            background: '#e2e8f0',
            alignSelf: 'stretch',
            minHeight: 'calc(100vh - 270px)'
          }} 
        />

        {/* ================= SECTION 2: CARRERAS PROFESIONALES ================= */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                <GraduationCap size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {activeFaculty ? activeFaculty.name : 'Todas las Carreras Profesionales'}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {displayedCareers.length} carreras listadas {activeFaculty ? `en ${activeFaculty.name}` : ''}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingCareer(null);
                setCareerFormData({ 
                  name: '', 
                  code: '', 
                  facultyId: activeFaculty ? activeFaculty.id : (tree[0]?.id || '') 
                });
                setCareerModalOpen(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #0f5142',
                background: 'var(--urp-green-primary)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(15, 81, 66, 0.15)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0b3d32'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--urp-green-primary)'}
            >
              <Plus size={15} />
              <span>Nueva Carrera</span>
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchCareer}
              onChange={(e) => setSearchCareer(e.target.value)}
              placeholder="Buscar carrera por nombre, facultad o código..."
              className="input-futuristic"
              style={{ padding: '8px 12px 8px 34px', fontSize: '0.84rem', width: '100%' }}
            />
          </div>

          {/* Careers List */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            height: 'calc(100vh - 270px)',
            maxHeight: 'calc(100vh - 270px)',
            minHeight: '500px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {displayedCareers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                No se encontraron carreras profesionales {activeFaculty ? `para ${activeFaculty.name}` : ''}.
              </div>
            ) : (
              displayedCareers.map(c => {
                const enrolledCount = studentStats.byCareer[c.name] || 0;

                return (
                  <div
                    key={c.id || c.name}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'border-color 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>
                            {c.name}
                          </span>
                          {c.code && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              color: '#334155'
                            }}>
                              {c.code}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Building2 size={12} color="#94a3b8" />
                          <span>{c.facultyName || activeFaculty?.name || 'Facultad URP'}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setEditingCareer(c);
                            setCareerFormData({ 
                              name: c.name, 
                              code: c.code || '', 
                              facultyId: c.facultyId 
                            });
                            setCareerModalOpen(true);
                          }}
                          title="Editar Carrera"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.76rem',
                            fontWeight: 600
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'career', id: c.id || '', name: c.name })}
                          title="Eliminar Carrera"
                          style={{
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fee2e2',
                            background: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.76rem',
                            fontWeight: 600
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Estudiantes matriculados:
                      </span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: enrolledCount > 0 ? 'var(--urp-green-primary)' : '#64748b' }}>
                        {enrolledCount} {enrolledCount === 1 ? 'estudiante' : 'estudiantes'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ================= MODAL: NUEVA / EDITAR FACULTAD ================= */}
      {facultyModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} color="var(--urp-green-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {editingFaculty ? 'Editar Facultad' : 'Nueva Facultad'}
                </h3>
              </div>
              <button 
                onClick={() => setFacultyModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Nombre de la Facultad *
                </label>
                <input
                  type="text"
                  required
                  value={facultyFormData.name}
                  onChange={(e) => setFacultyFormData({ ...facultyFormData, name: e.target.value })}
                  placeholder="Ej: Facultad de Ingeniería"
                  className="input-futuristic"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Código o Acrónimo (Opcional)
                </label>
                <input
                  type="text"
                  value={facultyFormData.code}
                  onChange={(e) => setFacultyFormData({ ...facultyFormData, code: e.target.value })}
                  placeholder="Ej: FING"
                  className="input-futuristic"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFacultyModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: '1px solid #0f5142',
                    background: 'var(--urp-green-primary)',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(15, 81, 66, 0.2)'
                  }}
                >
                  {editingFaculty ? 'Guardar Cambios' : 'Crear Facultad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: NUEVA / EDITAR CARRERA ================= */}
      {careerModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={18} color="var(--urp-green-primary)" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {editingCareer ? 'Editar Carrera Profesional' : 'Nueva Carrera Profesional'}
                </h3>
              </div>
              <button 
                onClick={() => setCareerModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCareer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Facultad a la que Pertenece *
                </label>
                <select
                  required
                  value={careerFormData.facultyId}
                  onChange={(e) => setCareerFormData({ ...careerFormData, facultyId: e.target.value })}
                  className="input-futuristic"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.88rem' }}
                >
                  <option value="" disabled>Seleccione una facultad...</option>
                  {tree.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.code ? `(${f.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Nombre de la Carrera Profesional *
                </label>
                <input
                  type="text"
                  required
                  value={careerFormData.name}
                  onChange={(e) => setCareerFormData({ ...careerFormData, name: e.target.value })}
                  placeholder="Ej: Ingeniería Civil"
                  className="input-futuristic"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Código de Carrera (Opcional)
                </label>
                <input
                  type="text"
                  value={careerFormData.code}
                  onChange={(e) => setCareerFormData({ ...careerFormData, code: e.target.value })}
                  placeholder="Ej: ICIV"
                  className="input-futuristic"
                  style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCareerModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    color: '#475569',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: '1px solid #0f5142',
                    background: 'var(--urp-green-primary)',
                    color: '#ffffff',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(15, 81, 66, 0.2)'
                  }}
                >
                  {editingCareer ? 'Guardar Cambios' : 'Crear Carrera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CONFIRMATION MODAL ================= */}
      {deleteConfirm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px'
        }}>
          <div style={{
            maxWidth: '440px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                ¿Confirmar Eliminación?
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: '1.5' }}>
              ¿Estás seguro de que deseas eliminar {deleteConfirm.type === 'faculty' ? 'la facultad' : 'la carrera'} <strong>"{deleteConfirm.name}"</strong>?
              {deleteConfirm.type === 'faculty' && (
                <span style={{ display: 'block', marginTop: '6px', color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600 }}>
                  Aviso: También se eliminarán todas las carreras profesionales asociadas a esta facultad.
                </span>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeDelete}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: '1px solid #dc2626',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
