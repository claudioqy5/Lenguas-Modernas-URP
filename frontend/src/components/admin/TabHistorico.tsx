import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Calendar, Trophy, BookOpen, Inbox } from 'lucide-react';
import { AnalyticsSummary, AttendanceRecord } from '../../services/api';

interface TabHistoricoProps {
  summary: AnalyticsSummary;
  records?: AttendanceRecord[];
  filterType?: string; // 'week', 'month', 'year', 'all'
  filterValue?: string; // e.g. "2026-W40" or "2026-09" or "2026"
}

const BAR_COLORS = ['#0f5142', '#0284c7', '#b45309', '#7c3aed', '#e11d48', '#059669'];

export const TabHistorico: React.FC<TabHistoricoProps> = ({ summary, records, filterType, filterValue }) => {
  // Filter records based on the selected period
  const filteredRecords = useMemo(() => {
    if (!records || filterType === 'all') return records || [];
    return records.filter(r => {
      if (!r.timestamp && !r.dateString) return false;
      const recDate = new Date(r.timestamp || r.dateString);
      
      if (filterType === 'year') {
        return recDate.getFullYear().toString() === filterValue;
      }
      if (filterType === 'month') { 
        const recMonth = `${recDate.getFullYear()}-${(recDate.getMonth() + 1).toString().padStart(2, '0')}`;
        return recMonth === filterValue;
      }
      if (filterType === 'week') { 
        const d = new Date(recDate);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        const week = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        const recWeek = `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`;
        return recWeek === filterValue;
      }
      return true;
    });
  }, [records, filterType, filterValue]);

  // Compute Peak Days
  const peakDaysData = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) {
      if (!records || records.length === 0) return summary.peakDays;
      return [
        { day: 'Lunes', count: 0 }, { day: 'Martes', count: 0 }, { day: 'Miércoles', count: 0 },
        { day: 'Jueves', count: 0 }, { day: 'Viernes', count: 0 }, { day: 'Sábado', count: 0 }
      ];
    }
    const daysMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    filteredRecords.forEach(r => {
      let dayNr = r.dayOfWeekNumber;
      if (dayNr === undefined && r.timestamp) {
        dayNr = new Date(r.timestamp).getDay(); 
      }
      if (dayNr >= 1 && dayNr <= 6) {
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
  }, [filteredRecords, records, summary.peakDays]);

  // Compute Top Students
  const topStudentsData = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) {
      if (!records || records.length === 0) return summary.topStudents.slice(0, 5);
      return [];
    }
    const studentsMap: Record<string, any> = {};
    filteredRecords.forEach(r => {
      if (!studentsMap[r.studentCode]) {
        studentsMap[r.studentCode] = { fullName: r.studentName, visitCount: 0 };
      }
      studentsMap[r.studentCode].visitCount++;
    });
    return Object.values(studentsMap)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);
  }, [filteredRecords, records, summary.topStudents]);

  // Compute Reason Distribution
  const reasonDistributionData = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) {
      if (!records || records.length === 0) return summary.reasonDistribution;
      return [];
    }
    const reasonMap: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const reason = r.visitReason || 'Lectura / Estudio';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });
    const total = filteredRecords.length;
    return Object.entries(reasonMap).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100)
    })).sort((a, b) => b.count - a.count);
  }, [filteredRecords, records, summary.reasonDistribution]);

  const isEmpty = filteredRecords && filteredRecords.length === 0 && records && records.length > 0;

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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Días de la Semana con Más Visitas
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comparativa de concurrencia de Lunes a Sábado en este período</p>
            </div>
          </div>

          <div style={{ height: '270px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakDaysData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradGold" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b45309" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="barGradGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f5142" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#0f5142" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  formatter={(val: any) => [`${val} visitas`, 'Total']}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {peakDaysData.map((_, index) => {
                    const isTop = index === 1 || index === 2;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={isTop ? 'url(#barGradGold)' : 'url(#barGradGreen)'} 
                        stroke={isTop ? '#b45309' : '#0f5142'} 
                        strokeWidth={2}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Top Students Leaderboard */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
              <Trophy size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Ranking de Estudiantes Asiduos
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alumnos con mayor cantidad de ingresos en este período</p>
            </div>
          </div>

          <div style={{ height: '300px', width: '100%', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={topStudentsData} 
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barHorizGradGold" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#b45309" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="barHorizGradSlate" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#475569" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#475569" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="barHorizGradGreen" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#0f5142" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#0f5142" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="barHorizGradGray" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#64748b" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#64748b" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="fullName" stroke="#64748b" fontSize={11} width={100} tickFormatter={(val) => val.split(' ')[0] + ' ' + (val.split(' ')[1] ? val.split(' ')[1].charAt(0) + '.' : '')} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  formatter={(val: any) => [`${val} visitas`, 'Total']}
                />
                <Bar dataKey="visitCount" radius={[0, 6, 6, 0]} barSize={24}>
                  {topStudentsData.map((_, index) => {
                    let fillUrl = 'url(#barHorizGradGray)';
                    let strokeColor = '#64748b';
                    if (index === 0) { fillUrl = 'url(#barHorizGradGold)'; strokeColor = '#b45309'; }
                    else if (index === 1) { fillUrl = 'url(#barHorizGradSlate)'; strokeColor = '#475569'; }
                    else if (index === 2) { fillUrl = 'url(#barHorizGradGreen)'; strokeColor = '#0f5142'; }
                    
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={fillUrl} 
                        stroke={strokeColor} 
                        strokeWidth={1.5}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Top Students Ranking & Reason Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>

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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Servicios más solicitados por los estudiantes en este período</p>
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
