import React from 'react';
import { Search } from 'lucide-react';
import { AttendanceRecord } from '../../services/api';

interface TabReportesProps {
  records: AttendanceRecord[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterCareer: string;
  setFilterCareer: (val: string) => void;
  filterStartDate: string;
  filterEndDate: string;
}

export const TabReportes: React.FC<TabReportesProps> = ({ 
  records, searchTerm, setSearchTerm, filterCareer, setFilterCareer, filterStartDate, filterEndDate 
}) => {
  const filteredRecords = records.filter(r => {
    const matchSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.studentCode.includes(searchTerm) ||
                        r.visitReason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCareer = filterCareer === 'ALL' || r.career === filterCareer;
    
    // Convert all to YYYY-MM-DD for easy comparison
    let matchDate = true;
    try {
      const recordDate = r.timestamp.split('T')[0];
      if (filterStartDate && recordDate < filterStartDate) matchDate = false;
      if (filterEndDate && recordDate > filterEndDate) matchDate = false;
    } catch (e) {
      matchDate = true; // Fallback
    }

    return matchSearch && matchCareer && matchDate;
  });

  return (
    <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
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

        <select
          value={filterCareer}
          onChange={(e) => setFilterCareer(e.target.value)}
          className="input-futuristic"
          style={{ fontSize: '0.88rem', padding: '9px 14px', width: 'auto' }}
        >
          <option value="ALL">Todas las Carreras</option>
          <option value="Traducción e Interpretación">Traducción e Interpretación</option>
          <option value="Humanidades y Lingüística">Humanidades y Lingüística</option>
          <option value="Turismo, Hotelería y Lenguas">Turismo, Hotelería y Lenguas</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-subtle)', background: '#f8fafc' }}>
              <th style={{ padding: '12px 14px' }}>Fecha</th>
              <th style={{ padding: '12px 14px' }}>Hora</th>
              <th style={{ padding: '12px 14px' }}>Código</th>
              <th style={{ padding: '12px 14px' }}>Estudiante</th>
              <th style={{ padding: '12px 14px' }}>Carrera</th>
              <th style={{ padding: '12px 14px' }}>Motivo</th>
              <th style={{ padding: '12px 14px' }}>Método</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No se encontraron registros de asistencia.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, i) => (
                <tr 
                  key={r.id || i} 
                  style={{ 
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#ffffff' : '#f8fafc'
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
