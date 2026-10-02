import React, { useState, useMemo } from 'react';
import { Search, UserPlus, Edit3, Trash2, Mail, FileSpreadsheet, Users, Briefcase, MapPin, GraduationCap, Building2 } from 'lucide-react';
import { Student, LibraryPerson, PersonTypeValue } from '../../services/api';
import { exportStudentsToExcel, exportPersonsToExcel } from '../../utils/exportReports';

interface TabComunidadProps {
  students: Student[];
  persons: LibraryPerson[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterCareer: string;
  setFilterCareer: (val: string) => void;
  filterFaculty: string;
  setFilterFaculty: (val: string) => void;
  activePersonType: PersonTypeValue;
  onNewPerson: (type: PersonTypeValue) => void;
  onEditPerson: (person: LibraryPerson | Student) => void;
  onDeletePerson: (id?: string, type?: PersonTypeValue) => void;
  onNavigateToDifusion?: () => void;
}

export const TabComunidad: React.FC<TabComunidadProps> = ({
  students,
  persons,
  searchTerm,
  setSearchTerm,
  filterCareer,
  setFilterCareer,
  filterFaculty,
  setFilterFaculty,
  activePersonType,
  onNewPerson,
  onEditPerson,
  onDeletePerson,
  onNavigateToDifusion
}) => {
  const [filterProgram, setFilterProgram] = useState('ALL');

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.studentCode.includes(searchTerm) ||
                          s.documentNumber.includes(searchTerm);
      const matchCareer = filterCareer === 'ALL' || s.career === filterCareer;
      const matchFaculty = filterFaculty === 'ALL' || s.faculty === filterFaculty;
      return matchSearch && matchCareer && matchFaculty;
    });
  }, [students, searchTerm, filterCareer, filterFaculty]);

  // Filtered Persons (Docentes, Visitantes, Maestrandos, Doctorandos)
  const filteredPersons = useMemo(() => {
    return persons
      .filter(p => activePersonType === 'Todos' || p.personType === activePersonType)
      .filter(p => {
        const fullName = p.fullName || `${p.lastName} ${p.firstName}`.trim();
        const matchSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (p.code && p.code.includes(searchTerm)) ||
                            (p.documentNumber && p.documentNumber.includes(searchTerm)) ||
                            (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            (p.program && p.program.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchProgram = true;
        if (activePersonType === 'Maestrando' || activePersonType === 'Doctorando') {
          matchProgram = filterProgram === 'ALL' || p.program === filterProgram;
        }

        return matchSearch && matchProgram;
      });
  }, [persons, activePersonType, searchTerm, filterProgram]);

  // Derived faculties & careers for Alumnos
  const faculties = useMemo(() => Array.from(new Set(students.map(s => s.faculty))).filter(Boolean), [students]);

  const availableCareers = useMemo(() => {
    if (filterFaculty === 'ALL') {
      return Array.from(new Set(students.map(s => s.career))).filter(Boolean);
    }
    return Array.from(new Set(students.filter(s => s.faculty === filterFaculty).map(s => s.career))).filter(Boolean);
  }, [students, filterFaculty]);

  // Available programs for Maestrandos or Doctorandos
  const availablePrograms = useMemo(() => {
    const list = persons
      .filter(p => p.personType === activePersonType)
      .map(p => p.program)
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [persons, activePersonType]);

  const handleFacultyFilterChange = (newFac: string) => {
    setFilterFaculty(newFac);
    if (newFac !== 'ALL') {
      const allowed = students.filter(s => s.faculty === newFac).map(s => s.career);
      if (filterCareer !== 'ALL' && !allowed.includes(filterCareer)) {
        setFilterCareer('ALL');
      }
    }
  };

  const getRoleSingular = (type: PersonTypeValue) => {
    switch (type) {
      case 'Alumno': return 'Alumno';
      case 'Docente': return 'Docente';
      case 'Visitante': return 'Visitante';
      case 'Maestrando': return 'Maestrando';
      case 'Doctorando': return 'Doctorando';
      default: return type;
    }
  };

  const getRolePlural = (type: PersonTypeValue) => {
    switch (type) {
      case 'Alumno': return 'estudiantes';
      case 'Docente': return 'docentes';
      case 'Visitante': return 'visitantes';
      case 'Maestrando': return 'maestrandos';
      case 'Doctorando': return 'doctorandos';
      default: return 'registros';
    }
  };

  const currentCount = activePersonType === 'Alumno' ? filteredStudents.length : filteredPersons.length;

  const handleExportExcel = () => {
    if (activePersonType === 'Alumno') {
      exportStudentsToExcel(filteredStudents);
    } else {
      exportPersonsToExcel(filteredPersons, activePersonType);
    }
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Toolbar: Buscador, Filtros y Botones de Acción */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Buscar ${getRoleSingular(activePersonType).toLowerCase()} por nombre, código o DNI...`}
            className="input-futuristic"
            style={{ paddingLeft: '40px', fontSize: '0.9rem', padding: '10px 14px 10px 40px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Filtros específicos de Alumnos */}
          {activePersonType === 'Alumno' && (
            <>
              <select
                value={filterFaculty}
                onChange={(e) => handleFacultyFilterChange(e.target.value)}
                className="input-futuristic"
                style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto' }}
              >
                <option value="ALL">Todas las Facultades</option>
                {faculties.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select
                value={filterCareer}
                onChange={(e) => setFilterCareer(e.target.value)}
                className="input-futuristic"
                style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto' }}
              >
                <option value="ALL">{filterFaculty === 'ALL' ? 'Todas las Carreras' : `Carreras de ${filterFaculty}`}</option>
                {availableCareers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </>
          )}

          {/* Filtros específicos de Posgrado (Maestrando / Doctorando) */}
          {(activePersonType === 'Maestrando' || activePersonType === 'Doctorando') && availablePrograms.length > 0 && (
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="input-futuristic"
              style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto', maxWidth: '280px' }}
            >
              <option value="ALL">Todos los Programas</option>
              {availablePrograms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}

          <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600, padding: '0 4px' }}>
            Total: <span style={{ color: 'var(--urp-green-primary)' }}>{currentCount}</span> {getRolePlural(activePersonType)}
          </div>

          {/* Botón Excel */}
          <button
            onClick={handleExportExcel}
            title={`Exportar directorio de ${getRolePlural(activePersonType)} a Excel (.xlsx)`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 13px',
              borderRadius: '8px',
              border: '1px solid #16a34a',
              background: '#f0fdf4',
              color: '#15803d',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#15803d';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f0fdf4';
              e.currentTarget.style.color = '#15803d';
            }}
          >
            <FileSpreadsheet size={15} />
            <span>Excel</span>
          </button>

          {/* Botón Difundir Correo (solo para Alumnos por ahora) */}
          {activePersonType === 'Alumno' && onNavigateToDifusion && (
            <button
              onClick={onNavigateToDifusion}
              title="Ir a la sección de Difusión para redactar y enviar comunicados"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '8px',
                border: '1px solid #0284c7',
                background: '#f0f9ff',
                color: '#0284c7',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(2, 132, 199, 0.08)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0284c7';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f0f9ff';
                e.currentTarget.style.color = '#0284c7';
              }}
            >
              <Mail size={15} />
              <span>Difundir Correo</span>
            </button>
          )}

          {/* Botón Nuevo Registro Contextual */}
          <button
            onClick={() => onNewPerson(activePersonType)}
            title={`Registrar nuevo ${getRoleSingular(activePersonType).toLowerCase()}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid #0f5142',
              background: 'var(--urp-green-primary)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px rgba(15, 81, 66, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0b3d32';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--urp-green-primary)';
            }}
          >
            <UserPlus size={15} />
            <span>Nuevo {getRoleSingular(activePersonType)}</span>
          </button>
        </div>
      </div>

      {/* Tabla de Comunidad */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-subtle)', background: '#f8fafc' }}>
              <th style={{ padding: '12px 14px', width: '40px' }}>#</th>
              <th style={{ padding: '12px 14px' }}>DNI / Documento</th>
              
              {/* Código visible para Alumnos, Maestrandos, Doctorandos */}
              {activePersonType !== 'Visitante' && activePersonType !== 'Docente' && (
                <th style={{ padding: '12px 14px' }}>Código</th>
              )}

              <th style={{ padding: '12px 14px' }}>Apellidos y Nombres</th>

              {/* Columnas específicas */}
              {activePersonType === 'Alumno' && (
                <>
                  <th style={{ padding: '12px 14px' }}>Facultad</th>
                  <th style={{ padding: '12px 14px' }}>Carrera</th>
                </>
              )}



              {(activePersonType === 'Maestrando' || activePersonType === 'Doctorando') && (
                <th style={{ padding: '12px 14px' }}>
                  {activePersonType === 'Maestrando' ? 'Programa de Maestría' : 'Programa de Doctorado'}
                </th>
              )}

              <th style={{ padding: '12px 14px' }}>Correo Electrónico</th>
              <th style={{ padding: '12px 14px' }}>Teléfono</th>
              <th style={{ padding: '12px 14px' }}>Total Visitas</th>
              <th style={{ padding: '12px 14px' }}>Última Visita</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {/* VISTA 1: ALUMNOS */}
            {activePersonType === 'Alumno' && (
              filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      No se encontraron alumnos registrados.
                    </p>
                    <p style={{ fontSize: '0.8rem' }}>Haz clic en "+ Nuevo Alumno" para registrar a un estudiante.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id || s.studentCode} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }} className="table-row-hover">
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>{s.documentNumber || '—'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--urp-green-primary)' }}>{s.studentCode}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>{s.fullName}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.faculty || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.career || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.85rem' }}>{s.email || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{s.phone || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'rgba(15, 81, 66, 0.08)',
                        color: 'var(--urp-green-primary)',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {s.totalVisits || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.82rem' }}>
                      {s.lastVisitAt ? new Date(s.lastVisitAt).toLocaleDateString('es-PE') : 'Sin visitas'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => onEditPerson(s)}
                          title="Editar datos del alumno"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#0284c7',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => onDeletePerson(s.id, 'Alumno')}
                          title="Eliminar alumno"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #fee2e2',
                            background: '#fef2f2',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )
            )}

            {/* VISTA 2: OTROS ROLES (Docente, Visitante, Maestrando, Doctorando) */}
            {activePersonType !== 'Alumno' && (
              filteredPersons.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {activePersonType === 'Docente' && <Briefcase size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />}
                    {activePersonType === 'Visitante' && <MapPin size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />}
                    {activePersonType === 'Maestrando' && <GraduationCap size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />}
                    {activePersonType === 'Doctorando' && <Building2 size={36} style={{ margin: '0 auto 10px', opacity: 0.3 }} />}
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      No se encontraron {getRolePlural(activePersonType)} registrados.
                    </p>
                    <p style={{ fontSize: '0.8rem' }}>Haz clic en "+ Nuevo {getRoleSingular(activePersonType)}" para agregar un nuevo registro.</p>
                  </td>
                </tr>
              ) : (
                filteredPersons.map((p, idx) => (
                  <tr key={p.id || p.documentNumber} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }} className="table-row-hover">
                    <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '0.8rem' }}>{idx + 1}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>{p.documentNumber || '—'}</td>
                    
                    {activePersonType !== 'Visitante' && activePersonType !== 'Docente' && (
                      <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--urp-green-primary)' }}>
                        {p.code || '—'}
                      </td>
                    )}

                    <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                      {p.fullName || `${p.lastName} ${p.firstName}`.trim()}
                    </td>



                    {(activePersonType === 'Maestrando' || activePersonType === 'Doctorando') && (
                      <td style={{ padding: '12px 14px', color: '#0f5142', fontWeight: 600, fontSize: '0.84rem' }}>
                        {p.program || '—'}
                      </td>
                    )}

                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.85rem' }}>{p.email || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>{p.phone || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        background: 'rgba(15, 81, 66, 0.08)',
                        color: 'var(--urp-green-primary)',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}>
                        {p.totalVisits || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.82rem' }}>
                      {p.lastVisitAt ? new Date(p.lastVisitAt).toLocaleDateString('es-PE') : 'Sin visitas'}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => onEditPerson(p)}
                          title={`Editar datos de ${getRoleSingular(activePersonType).toLowerCase()}`}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            color: '#0284c7',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => onDeletePerson(p.id, activePersonType)}
                          title={`Eliminar ${getRoleSingular(activePersonType).toLowerCase()}`}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #fee2e2',
                            background: '#fef2f2',
                            color: '#ef4444',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
