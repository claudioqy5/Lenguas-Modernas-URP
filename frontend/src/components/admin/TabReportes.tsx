import React, { useState, useEffect, useMemo } from 'react';
import { Search, FileSpreadsheet, FileText } from 'lucide-react';
import { AttendanceRecord, Student, AcademicTreeFaculty, api } from '../../services/api';
import { exportAttendanceToPDF, exportAttendanceToExcel } from '../../utils/exportReports';
import { getRecordDateStr } from '../../utils/dateUtils';

interface TabReportesProps {
  records: AttendanceRecord[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterCareer: string;
  setFilterCareer: (val: string) => void;
  filterFaculty: string;
  setFilterFaculty: (val: string) => void;
  filterStartDate: string;
  filterEndDate: string;
  students?: Student[];
}

export const TabReportes: React.FC<TabReportesProps> = ({ 
  records, 
  searchTerm, 
  setSearchTerm, 
  filterCareer, 
  setFilterCareer, 
  filterFaculty, 
  setFilterFaculty, 
  filterStartDate, 
  filterEndDate,
  students = []
}) => {
  const [academicTree, setAcademicTree] = useState<AcademicTreeFaculty[]>([]);

  useEffect(() => {
    let isMounted = true;
    api.getAcademicTree().then(tree => {
      if (isMounted && tree && tree.length > 0) {
        setAcademicTree(tree);
      }
    }).catch(err => console.warn('Could not load academic tree in TabReportes:', err));
    return () => { isMounted = false; };
  }, []);

  // Map career to faculty
  const careerToFaculty = useMemo(() => {
    const map = new Map<string, string>();
    academicTree.forEach(f => {
      f.careers?.forEach(c => map.set(c.name, f.name));
    });
    students.forEach(s => {
      if (s.career && s.faculty && !map.has(s.career)) {
        map.set(s.career, s.faculty);
      }
    });
    return map;
  }, [academicTree, students]);

  // Map studentCode to faculty
  const studentToFaculty = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach(s => {
      if (s.studentCode && s.faculty) {
        map.set(s.studentCode, s.faculty);
      }
    });
    return map;
  }, [students]);

  // Available faculties list
  const faculties = useMemo(() => {
    if (academicTree.length > 0) {
      return academicTree.map(f => f.name);
    }
    const facs = new Set<string>();
    students.forEach(s => { if (s.faculty) facs.add(s.faculty); });
    records.forEach(r => {
      const f = (r as any).faculty || careerToFaculty.get(r.career);
      if (f) facs.add(f);
    });
    return Array.from(facs);
  }, [academicTree, students, records, careerToFaculty]);

  // Available careers based on selected faculty
  const availableCareers = useMemo(() => {
    if (!filterFaculty || filterFaculty === 'ALL') {
      const allCareers = new Set<string>();
      academicTree.forEach(f => f.careers?.forEach(c => allCareers.add(c.name)));
      records.forEach(r => { if (r.career) allCareers.add(r.career); });
      students.forEach(s => { if (s.career) allCareers.add(s.career); });
      return Array.from(allCareers);
    }
    const matchedFac = academicTree.find(f => f.name.toLowerCase() === filterFaculty.toLowerCase());
    if (matchedFac && matchedFac.careers) {
      return matchedFac.careers.map(c => c.name);
    }
    const filtered = new Set<string>();
    records.forEach(r => {
      const fac = (r as any).faculty || careerToFaculty.get(r.career);
      if (fac === filterFaculty && r.career) filtered.add(r.career);
    });
    students.forEach(s => {
      if (s.faculty === filterFaculty && s.career) filtered.add(s.career);
    });
    return Array.from(filtered);
  }, [filterFaculty, academicTree, records, students, careerToFaculty]);

  // Handle Faculty change with cascading career update
  const handleFacultyFilterChange = (newFac: string) => {
    setFilterFaculty(newFac);
    if (newFac !== 'ALL') {
      const allowed = academicTree.find(f => f.name.toLowerCase() === newFac.toLowerCase())?.careers?.map(c => c.name) || [];
      if (filterCareer !== 'ALL' && allowed.length > 0 && !allowed.includes(filterCareer)) {
        setFilterCareer('ALL');
      }
    }
  };

  // Enriched filtered records
  const filteredRecords = useMemo(() => {
    return records
      .map(r => {
        const fac = r.faculty || studentToFaculty.get(r.studentCode) || careerToFaculty.get(r.career) || 'Facultad URP';
        return {
          ...r,
          faculty: fac
        };
      })
      .filter(r => {
        const matchSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            r.studentCode.includes(searchTerm) ||
                            r.visitReason.toLowerCase().includes(searchTerm.toLowerCase());
        const matchFaculty = !filterFaculty || filterFaculty === 'ALL' || r.faculty === filterFaculty;
        const matchCareer = filterCareer === 'ALL' || r.career === filterCareer;
        
        let matchDate = true;
        try {
          const recordDate = getRecordDateStr(r);
          if (filterStartDate && recordDate < filterStartDate) matchDate = false;
          if (filterEndDate && recordDate > filterEndDate) matchDate = false;
        } catch (e) {
          matchDate = true;
        }

        return matchSearch && matchFaculty && matchCareer && matchDate;
      });
  }, [records, searchTerm, filterFaculty, filterCareer, filterStartDate, filterEndDate, studentToFaculty, careerToFaculty]);

  return (
    <div style={{ padding: '0' }}>
      {/* Table Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por estudiante, código o motivo..."
            className="input-futuristic"
            style={{ paddingLeft: '40px', fontSize: '0.9rem', padding: '10px 14px 10px 40px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Faculty select */}
          <select
            value={filterFaculty || 'ALL'}
            onChange={(e) => handleFacultyFilterChange(e.target.value)}
            className="input-futuristic"
            style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto' }}
          >
            <option value="ALL">Todas las Facultades</option>
            {faculties.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          {/* Career select */}
          <select
            value={filterCareer}
            onChange={(e) => setFilterCareer(e.target.value)}
            className="input-futuristic"
            style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto' }}
          >
            <option value="ALL">{!filterFaculty || filterFaculty === 'ALL' ? 'Todas las Carreras' : `Carreras de ${filterFaculty}`}</option>
            {availableCareers.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontWeight: 600, padding: '0 4px' }}>
            Total: <span style={{ color: 'var(--urp-green-primary)' }}>{filteredRecords.length}</span> asistencias
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '6px' }}>
            <button
              onClick={() => exportAttendanceToExcel(filteredRecords, students)}
              title="Descargar reporte en formato Excel (.xlsx)"
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

            <button
              onClick={() => exportAttendanceToPDF(
                filteredRecords, 
                null, 
                'REPORTE DE ASISTENCIAS FILTRADAS', 
                (filterStartDate || filterEndDate) 
                  ? `Rango: ${filterStartDate || 'Inicio'} al ${filterEndDate || 'Fin'}${filterFaculty && filterFaculty !== 'ALL' ? ` • ${filterFaculty}` : ''}` 
                  : (filterFaculty && filterFaculty !== 'ALL' ? `Facultad: ${filterFaculty}` : '')
              )}
              title="Descargar reporte en formato PDF (.pdf)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 13px',
                borderRadius: '8px',
                border: '1px solid #dc2626',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fef2f2';
                e.currentTarget.style.color = '#dc2626';
              }}
            >
              <FileText size={15} />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-subtle)', background: '#f8fafc' }}>
              <th style={{ padding: '12px 14px' }}>Fecha</th>
              <th style={{ padding: '12px 14px' }}>Hora</th>
              <th style={{ padding: '12px 14px' }}>Código</th>
              <th style={{ padding: '12px 14px' }}>Estudiante</th>
              <th style={{ padding: '12px 14px' }}>Facultad</th>
              <th style={{ padding: '12px 14px' }}>Carrera</th>
              <th style={{ padding: '12px 14px' }}>Motivo</th>
              <th style={{ padding: '12px 14px' }}>Método</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron registros de asistencia.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, i) => (
                <tr 
                  key={r.id || i} 
                  style={{ 
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                  }}
                >
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{r.dateString}</span>
                  </td>
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--text-subtle)', fontWeight: 500 }}>{r.timeString}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--urp-green-primary)', fontWeight: 700 }}>
                    {r.studentCode}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                    {r.studentName}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ 
                      fontSize: '0.78rem', 
                      background: 'rgba(15, 81, 66, 0.08)', 
                      color: 'var(--urp-green-primary)', 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      fontWeight: 600 
                    }}>
                      {r.faculty}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                    {r.career}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="badge-tag" style={{ background: 'rgba(2, 132, 199, 0.08)', color: 'var(--accent-blue)', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                      {r.visitReason}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span className="badge-tag" style={{ 
                      background: r.entryMethod === 'Barcode' ? 'var(--urp-green-light)' : 'var(--urp-gold-light)',
                      color: r.entryMethod === 'Barcode' ? 'var(--urp-green-primary)' : 'var(--urp-gold-primary)',
                      border: r.entryMethod === 'Barcode' ? '1px solid rgba(15, 81, 66, 0.2)' : '1px solid rgba(180, 83, 9, 0.2)'
                    }}>
                      {r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'}
                    </span>
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
