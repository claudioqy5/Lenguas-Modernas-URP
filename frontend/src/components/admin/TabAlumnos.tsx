import React from 'react';
import { Search, UserPlus, Edit3, Trash2, Mail, FileSpreadsheet } from 'lucide-react';
import { Student } from '../../services/api';
import { exportStudentsToExcel } from '../../utils/exportReports';
import { normalizeSearchText } from './TabReportes';

interface TabAlumnosProps {
  students: Student[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterCareer: string;
  setFilterCareer: (val: string) => void;
  filterFaculty: string;
  setFilterFaculty: (val: string) => void;
  onNewStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (id?: string) => void;
  onNavigateToDifusion?: () => void;
}

export const TabAlumnos: React.FC<TabAlumnosProps> = ({
  students,
  searchTerm,
  setSearchTerm,
  filterCareer,
  setFilterCareer,
  filterFaculty,
  setFilterFaculty,
  onNewStudent,
  onEditStudent,
  onDeleteStudent,
  onNavigateToDifusion
}) => {
  const filteredStudents = students.filter(s => {
    const tokens = normalizeSearchText(searchTerm).split(/\s+/).filter(Boolean);
    let matchSearch = true;
    if (tokens.length > 0) {
      const target = normalizeSearchText([
        s.fullName,
        s.firstName,
        s.lastName,
        s.studentCode,
        s.documentNumber,
        s.email,
        s.faculty,
        s.career
      ].filter(Boolean).join(' '));
      matchSearch = tokens.every(t => target.includes(t));
    }
    const matchCareer = filterCareer === 'ALL' || s.career === filterCareer;
    const matchFaculty = filterFaculty === 'ALL' || s.faculty === filterFaculty;
    return matchSearch && matchCareer && matchFaculty;
  });

  const excludedKeys = ['id', 'password', 'firstName', 'lastName', 'createdAt', 'primaryLanguage'];
  
  const targetOrder = [
    'documentNumber',
    'studentCode',
    'fullName',
    'email',
    'phone',
    'faculty',
    'career',
    'lastVisitAt',
    'totalVisits'
  ];

  const dynamicKeys = Array.from(new Set(filteredStudents.flatMap(s => Object.keys(s))))
    .filter(key => !excludedKeys.includes(key))
    .sort((a, b) => {
      const idxA = targetOrder.indexOf(a);
      const idxB = targetOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  
  const headerTranslations: Record<string, string> = {
    studentCode: 'Código',
    documentNumber: 'DNI / Documento',
    fullName: 'Apellidos y Nombres',
    career: 'Carrera',
    faculty: 'Facultad',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    primaryLanguage: 'Idioma / Especialidad',
    totalVisits: 'Total Visitas',
    lastVisitAt: 'Última Visita'
  };

  const faculties = Array.from(new Set(students.map(s => s.faculty))).filter(Boolean);

  const availableCareers = React.useMemo(() => {
    if (filterFaculty === 'ALL') {
      return Array.from(new Set(students.map(s => s.career))).filter(Boolean);
    }
    return Array.from(new Set(students.filter(s => s.faculty === filterFaculty).map(s => s.career))).filter(Boolean);
  }, [students, filterFaculty]);

  const handleFacultyFilterChange = (newFac: string) => {
    setFilterFaculty(newFac);
    if (newFac !== 'ALL') {
      const allowed = students.filter(s => s.faculty === newFac).map(s => s.career);
      if (filterCareer !== 'ALL' && !allowed.includes(filterCareer)) {
        setFilterCareer('ALL');
      }
    }
  };

  return (
    <div style={{ padding: '0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar estudiante..."
            className="input-futuristic"
            style={{ paddingLeft: '40px', fontSize: '0.9rem', padding: '10px 14px 10px 40px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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
          <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600, padding: '0 4px' }}>
            Total: <span style={{ color: 'var(--urp-green-primary)' }}>{filteredStudents.length}</span> estudiantes
          </div>

          <button
            onClick={() => exportStudentsToExcel(filteredStudents)}
            title="Exportar directorio de estudiantes a Excel (.xlsx)"
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

          {onNavigateToDifusion && (
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

          <button
            onClick={onNewStudent}
            title="Registrar nuevo alumno"
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
            <span>Nuevo Alumno</span>
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-subtle)', background: '#f8fafc' }}>
              {dynamicKeys.map(key => (
                <th key={key} style={{ padding: '12px 14px' }}>
                  {headerTranslations[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                </th>
              ))}
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={dynamicKeys.length + 1} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron estudiantes registrados.
                </td>
              </tr>
            ) : (
              filteredStudents.map((s, i) => (
                <tr 
                  key={s.id || s.studentCode} 
                  style={{ 
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  {dynamicKeys.map(key => {
                    const val = (s as any)[key];
                    let displayVal = val === null || val === undefined || val === '' ? '—' : String(val);
                    
                    if (key === 'fullName' && s.firstName && s.lastName) {
                      displayVal = `${s.lastName}, ${s.firstName}`;
                    } else if (key === 'lastVisitAt' && val && val !== '—') {
                      try {
                        const dateObj = new Date(val);
                        const hrs = dateObj.getHours().toString().padStart(2, '0');
                        const mins = dateObj.getMinutes().toString().padStart(2, '0');
                        const d = dateObj.getDate().toString().padStart(2, '0');
                        const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
                        const y = dateObj.getFullYear();
                        displayVal = `${hrs}:${mins} - ${d}/${m}/${y}`;
                      } catch (e) {
                        // fallback to original string
                      }
                    }
                    
                    return (
                      <td key={key} style={{ padding: '12px 14px', color: 'var(--text-main)', fontSize: '0.85rem' }}>
                        {key === 'primaryLanguage' && displayVal !== '—' ? (
                          <span className="badge-tag" style={{ background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)', border: '1px solid rgba(180, 83, 9, 0.2)' }}>
                            {displayVal}
                          </span>
                        ) : key === 'studentCode' ? (
                          <span style={{ fontFamily: 'monospace', color: 'var(--urp-green-primary)', fontWeight: 700 }}>
                            {displayVal}
                          </span>
                        ) : key === 'totalVisits' ? (
                          <strong style={{ color: 'var(--urp-green-primary)' }}>{displayVal}</strong>
                        ) : (
                          displayVal
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      <button
                        onClick={() => onEditStudent(s)}
                        style={{
                          padding: '6px',
                          background: 'rgba(2, 132, 199, 0.1)',
                          color: '#0284c7',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        onClick={() => onDeleteStudent(s.id)}
                        style={{
                          padding: '6px',
                          background: 'rgba(225, 29, 72, 0.1)',
                          color: '#e11d48',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
