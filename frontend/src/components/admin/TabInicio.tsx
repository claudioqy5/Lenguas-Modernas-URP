import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Legend, Cell } from 'recharts';
import { Clock, Building2, Activity, User } from 'lucide-react';
import { AnalyticsSummary, AttendanceRecord } from '../../services/api';

interface TabInicioProps {
  summary: AnalyticsSummary;
  selectedDate?: string;
  records?: AttendanceRecord[];
}

const BAR_COLORS = ['#0f5142', '#0284c7', '#b45309', '#7c3aed', '#e11d48', '#059669'];

export const TabInicio: React.FC<TabInicioProps> = ({ summary, selectedDate, records }) => {
  // Format selected date YYYY-MM-DD -> DD/MM/YYYY
  const formattedDateLabel = selectedDate ? (() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return selectedDate;
  })() : null;

  // Filter records by selected date if available
  const filteredRecords = useMemo(() => {
    if (!records || !selectedDate) return null;
    return records.filter(r => {
      const recDate = r.timestamp ? r.timestamp.split('T')[0] : r.dateString;
      return recDate === selectedDate;
    });
  }, [records, selectedDate]);

  // Extract recent activity for the selected date
  const recentActivity = useMemo(() => {
    if (!filteredRecords) return [];
    // Sort descending by timestamp (most recent first)
    return [...filteredRecords].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    }).slice(0, 7); // Show top 7 recent entries
  }, [filteredRecords]);

  // Compute peak hours data dynamically when records are filtered for a selected date
  const peakHoursData = useMemo(() => {
    const hoursMap: Record<number, number> = {};
    for (let h = 8; h <= 21; h++) {
      hoursMap[h] = 0;
    }
    
    if (filteredRecords && filteredRecords.length > 0) {
      filteredRecords.forEach(r => {
        let hour = r.hourOfDay;
        if (hour === undefined && r.timestamp) {
          hour = new Date(r.timestamp).getHours();
        }
        if (hour !== undefined && hour >= 8 && hour <= 21) {
          hoursMap[hour] = (hoursMap[hour] || 0) + 1;
        }
      });
    }

    return Object.keys(hoursMap).map(hStr => {
      const h = parseInt(hStr, 10);
      const label = `${h.toString().padStart(2, '0')}:00`;
      return { hour: h, label, count: hoursMap[h] };
    });
  }, [filteredRecords]);

  // Compute career distribution dynamically when records are filtered for a selected date
  const careerDistributionData = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) {
      return [];
    }
    const careerMap: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const c = r.career || 'Sin Carrera';
      careerMap[c] = (careerMap[c] || 0) + 1;
    });

    const total = filteredRecords.length;
    return Object.entries(careerMap).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }, [filteredRecords]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
        {/* Peak Hours Chart */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
              <Clock size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Horarios de Mayor Ingreso (Horas Pico)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {formattedDateLabel 
                  ? `Distribución por franja horaria para el ${formattedDateLabel}` 
                  : 'Distribución de estudiantes por franja horaria (8am a 9pm)'}
              </p>
            </div>
          </div>

          <div style={{ height: '270px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={peakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="hourColorLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f5142" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0f5142" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  formatter={(val: any) => [`${val} asistencias`, 'Afluencia']}
                />
                <Area type="monotone" dataKey="count" stroke="#0f5142" strokeWidth={2.5} fillOpacity={1} fill="url(#hourColorLight)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Career Distribution (Pie Chart) */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {formattedDateLabel ? `Afluencia por Carrera (${formattedDateLabel})` : 'Afluencia por Carrera (Ingresos de Hoy)'}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Distribución de estudiantes según su facultad/carrera</p>
            </div>
          </div>

          <div style={{ height: '270px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={careerDistributionData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {careerDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Nuevo Bloque: Últimos Ingresos (Actividad en Vivo) */}
      <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Últimos Ingresos Registrados
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {formattedDateLabel ? `Actividad reciente del ${formattedDateLabel}` : 'Actividad en tiempo real de hoy'}
            </p>
          </div>
        </div>

        {recentActivity.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)', background: '#f8fafc', borderRadius: '12px' }}>
            <User size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No hay registros de ingreso para esta fecha.</p>
            <p style={{ fontSize: '0.85rem' }}>La biblioteca se encuentra vacía o aún no hay ingresos.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentActivity.map((record, i) => (
              <div 
                key={record.id || i}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  transition: 'all 0.2s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                  e.currentTarget.style.background = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = '#f8fafc';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ 
                    width: '42px', 
                    height: '42px', 
                    borderRadius: '50%', 
                    background: 'var(--urp-green-light)', 
                    color: 'var(--urp-green-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem'
                  }}>
                    {record.studentName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                      {record.studentName}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{record.studentCode}</span>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <span style={{ fontWeight: 600 }}>{record.career}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem', background: '#ffffff', padding: '6px 14px', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
                  <Clock size={14} style={{ color: 'var(--urp-green-primary)' }} />
                  {record.timeString}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

