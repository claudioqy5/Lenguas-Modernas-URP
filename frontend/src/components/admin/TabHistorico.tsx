import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie } from 'recharts';
import { Calendar, Trophy, BookOpen, Inbox, Building2 } from 'lucide-react';
import { AnalyticsSummary, AttendanceRecord } from '../../services/api';
import { getISOWeekFromDateStr, formatMonthLabel, formatWeekLabel, getRecordDateStr } from '../../utils/dateUtils';
import { exportHistoricoReportPDF, exportHistoricoReportExcel } from '../../utils/exportReports';

interface TabHistoricoProps {
  summary: AnalyticsSummary;
  records?: AttendanceRecord[];
  filterType?: string; // 'week', 'month', 'year', 'all'
  filterValue?: string; // e.g. "2026-W38" or "2026-09" or "2026"
  filteredRecords?: AttendanceRecord[];
}

const BAR_COLORS = ['#0f5142', '#0284c7', '#b45309', '#7c3aed', '#e11d48', '#059669'];

export const TabHistorico: React.FC<TabHistoricoProps> = ({ 
  summary, 
  records, 
  filterType = 'week', 
  filterValue = '',
  filteredRecords: propFilteredRecords 
}) => {
  // Use passed filteredRecords or compute them cleanly using string-based date parsing
  const effectiveRecords = useMemo(() => {
    if (propFilteredRecords !== undefined) return propFilteredRecords;
    if (!records || filterType === 'all') return records || [];

    return records.filter(r => {
      const dateStr = getRecordDateStr(r);
      if (!dateStr) return false;

      if (filterType === 'year') {
        return dateStr.slice(0, 4) === filterValue;
      }
      if (filterType === 'month') {
        return dateStr.slice(0, 7) === filterValue;
      }
      if (filterType === 'week') {
        return getISOWeekFromDateStr(dateStr) === filterValue;
      }
      return true;
    });
  }, [records, filterType, filterValue, propFilteredRecords]);

  // Dynamic period text for chart subtitles
  const periodDescription = useMemo(() => {
    if (filterType === 'week') {
      return `la ${formatWeekLabel(filterValue || '')}`;
    }
    if (filterType === 'month') {
      return `el mes de ${formatMonthLabel(filterValue || '')}`;
    }
    if (filterType === 'year') {
      return `el año ${filterValue || ''}`;
    }
    return 'todo el histórico registrado';
  }, [filterType, filterValue]);

  // Compute Peak Days
  const peakDaysData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) {
      return [
        { day: 'Lunes', count: 0 }, { day: 'Martes', count: 0 }, { day: 'Miércoles', count: 0 },
        { day: 'Jueves', count: 0 }, { day: 'Viernes', count: 0 }, { day: 'Sábado', count: 0 }
      ];
    }
    const daysMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    effectiveRecords.forEach(r => {
      let dayNr = r.dayOfWeekNumber;
      if (!dayNr && r.dayOfWeek) {
        const nameMap: Record<string, number> = {
          'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6
        };
        dayNr = nameMap[r.dayOfWeek];
      }
      if (!dayNr) {
        const dateStr = getRecordDateStr(r);
        if (dateStr) {
          const parts = dateStr.split('-').map(Number);
          if (parts.length === 3) {
            dayNr = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getDay();
          }
        }
      }
      if (dayNr !== undefined && dayNr >= 1 && dayNr <= 6) {
        daysMap[dayNr]++;
      }
    });
    return [
      { day: 'Lunes', count: daysMap[1] },
      { day: 'Martes', count: daysMap[2] },
      { day: 'Miércoles', count: daysMap[3] },
      { day: 'Jueves', count: daysMap[4] },
      { day: 'Viernes', count: daysMap[5] },
      { day: 'Sábado', count: daysMap[6] }
    ];
  }, [effectiveRecords]);

  // Compute Top Students / Users
  const topStudentsData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) {
      return [];
    }
    const studentsMap: Record<string, any> = {};
    effectiveRecords.forEach(r => {
      const code = r.studentCode || r.studentId || r.studentName;
      if (!studentsMap[code]) {
        studentsMap[code] = { 
          fullName: r.studentName, 
          visitCount: 0,
          personType: r.personType || 'Alumno'
        };
      }
      studentsMap[code].visitCount++;
    });
    return Object.values(studentsMap)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);
  }, [effectiveRecords]);

  // Compute Reason Distribution
  const reasonDistributionData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) {
      return [];
    }
    const reasonMap: Record<string, number> = {};
    effectiveRecords.forEach(r => {
      const reason = r.visitReason || 'Lectura / Estudio';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });
    const total = effectiveRecords.length;
    return Object.entries(reasonMap).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  }, [effectiveRecords]);

  // Compute Career / Program / Role Distribution dynamically based on effectiveRecords
  const careerDistributionData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) {
      return [];
    }
    const careerMap: Record<string, number> = {};
    effectiveRecords.forEach(r => {
      let groupName = r.career?.trim();
      const prog = ((r as any).program || '').trim();
      const pType = r.personType?.trim() || 'Alumno';

      if (prog && prog !== 'General' && (!groupName || groupName === 'General' || pType === 'Maestrando' || pType === 'Doctorando')) {
        groupName = prog;
      }
      if (!groupName || groupName === 'General' || groupName === 'Sin Carrera') {
        if (pType === 'Docente') groupName = 'Docentes';
        else if (pType === 'Visitante') groupName = 'Visitantes';
        else if (pType === 'Administrativo') groupName = 'Administrativos';
        else if (pType === 'Maestrando') groupName = prog || 'Maestrías (Posgrado)';
        else if (pType === 'Doctorando') groupName = prog || 'Doctorados (Posgrado)';
        else groupName = 'Comunidad General';
      }

      careerMap[groupName] = (careerMap[groupName] || 0) + 1;
    });

    const total = effectiveRecords.length;
    return Object.entries(careerMap).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }, [effectiveRecords]);

  const sortedCareerData = [...careerDistributionData].sort((a, b) => b.count - a.count);

  const handleExportPDF = () => {
    exportHistoricoReportPDF(
      periodDescription,
      effectiveRecords,
      peakDaysData,
      topStudentsData,
      sortedCareerData,
      reasonDistributionData,
      summary
    );
  };

  const handleExportExcel = () => {
    exportHistoricoReportExcel(
      periodDescription,
      effectiveRecords,
      peakDaysData,
      topStudentsData,
      sortedCareerData,
      reasonDistributionData
    );
  };

  const isEmpty = effectiveRecords && effectiveRecords.length === 0 && records && records.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {isEmpty && (
        <div style={{ padding: '24px', background: '#fff5f5', color: '#e11d48', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #fecdd3' }}>
          <Inbox size={24} />
          <div>
            <h4 style={{ fontWeight: 700, margin: 0 }}>Sin registros en el período seleccionado</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No se encontraron asistencias en la fecha especificada. Intenta cambiar el filtro a un período anterior.</p>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Peak Days Chart */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
              <Calendar size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                Días de la Semana con Más Visitas
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Comparativa de concurrencia de Lunes a Sábado en {periodDescription}
              </p>
            </div>
          </div>

          <div style={{ height: '270px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={`peak-days-chart-${filterType}-${filterValue}`} data={peakDaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  cursor={{ fill: 'rgba(15, 81, 66, 0.04)' }}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  formatter={(val: any) => [`${val} visitas`, 'Total']}
                />
                <Bar 
                  dataKey="count" 
                  radius={[6, 6, 0, 0]}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {peakDaysData.map((entry, index) => {
                    const maxVal = Math.max(...peakDaysData.map(d => d.count), 0);
                    const isPeak = maxVal > 0 && entry.count === maxVal;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isPeak ? '#b45309' : '#0f5142'} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Career Distribution Donut Chart (Gráfico circular de alumnos por carrera) */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Afluencia por Carrera / Programa
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Distribución de usuarios según programa académico o rol en {periodDescription}
              </p>
            </div>
          </div>

          {sortedCareerData.length === 0 ? (
            <div style={{ height: '270px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '0.9rem' }}>
              No hay registros de carreras o programas en este período.
            </div>
          ) : (
            <div style={{ height: '270px', width: '100%', display: 'flex', alignItems: 'center' }}>
              {/* Pie Chart */}
              <div style={{ flex: '0 0 55%', height: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart key={`career-pie-chart-${filterType}-${filterValue}`}>
                    <Pie
                      data={sortedCareerData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={3}
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    >
                      {sortedCareerData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Custom Legend - sorted descending */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
                {sortedCareerData.map((item, index) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      flexShrink: 0,
                      background: BAR_COLORS[index % BAR_COLORS.length]
                    }} />
                    <span style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.3 }}>
                      {item.name} <strong style={{ color: 'var(--text-main)' }}>({item.count})</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Top Students Ranking (Bajado aquí) & Reason Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Top Students Leaderboard */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
              <Trophy size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Ranking de Usuarios Asiduos
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Usuarios con mayor cantidad de visitas en {periodDescription}</p>
            </div>
          </div>

          <div style={{ height: '300px', width: '100%', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                key={`top-students-chart-${filterType}-${filterValue}`}
                data={topStudentsData} 
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="fullName" stroke="#64748b" fontSize={11} width={100} tickFormatter={(val) => val.split(' ')[0] + ' ' + (val.split(' ')[1] ? val.split(' ')[1].charAt(0) + '.' : '')} />
                <Tooltip 
                  cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  formatter={(val: any) => [`${val} visitas`, 'Total']}
                />
                <Bar 
                  dataKey="visitCount" 
                  radius={[0, 6, 6, 0]} 
                  barSize={24}
                  isAnimationActive={true}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {topStudentsData.map((_, index) => {
                    const solidColors = ['#b45309', '#475569', '#0f5142', '#64748b', '#94a3b8'];
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={solidColors[index] || '#94a3b8'} 
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reasons Distribution */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
              <BookOpen size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Motivos de Visita a las Instalaciones
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Servicios más solicitados por los estudiantes en {periodDescription}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {reasonDistributionData.map((item, idx) => (
              <div key={item.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{item.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.count} visitas ({item.percentage}%)</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${item.percentage}%`, 
                      height: '100%', 
                      background: BAR_COLORS[idx % BAR_COLORS.length], 
                      borderRadius: '999px' 
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
