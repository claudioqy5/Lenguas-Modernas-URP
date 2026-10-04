import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Clock, Building2, Activity, User, FileSpreadsheet, FileText, PieChart as PieChartIcon, Hourglass, LogOut } from 'lucide-react';
import { AnalyticsSummary, AttendanceRecord } from '../../services/api';
import { exportDailyReportPDF, exportDailyReportExcel } from '../../utils/exportReports';
import { getRecordDateStr, getRecordHour } from '../../utils/dateUtils';

interface TabInicioProps {
  summary: AnalyticsSummary;
  selectedDate?: string;
  records?: AttendanceRecord[];
}

const BAR_COLORS = ['#0f5142', '#0284c7', '#b45309', '#7c3aed', '#e11d48', '#059669'];

// Helper to format dynamic relative time
const getRelativeTimeString = (timestamp?: string, dateString?: string, timeString?: string): string => {
  if (!timestamp && (!dateString || !timeString)) return '';

  let recordDate: Date;
  if (timestamp) {
    recordDate = new Date(timestamp);
  } else {
    recordDate = new Date(`${dateString}T${timeString}`);
  }

  if (isNaN(recordDate.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - recordDate.getTime();

  // If timestamp is slightly in future due to clock sync
  if (diffMs < 0 && diffMs > -60000) {
    return 'hace unos segundos';
  }
  if (diffMs < 0) {
    return 'recién registrado';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) {
    return 'hace unos segundos';
  }
  if (diffMin === 1) {
    return 'hace 1 min';
  }
  if (diffMin < 60) {
    return `hace ${diffMin} min`;
  }
  if (diffHour === 1) {
    return 'hace 1 hora';
  }
  if (diffHour < 24) {
    return `hace ${diffHour} horas`;
  }
  if (diffDay === 1) {
    return 'hace 1 día';
  }
  if (diffDay < 7) {
    return `hace ${diffDay} días`;
  }
  const diffWeeks = Math.floor(diffDay / 7);
  if (diffWeeks === 1) {
    return 'hace 1 semana';
  }
  if (diffDay < 30) {
    return `hace ${diffWeeks} semanas`;
  }
  const diffMonths = Math.floor(diffDay / 30);
  if (diffMonths === 1) {
    return 'hace 1 mes';
  }
  if (diffMonths < 12) {
    return `hace ${diffMonths} meses`;
  }
  const diffYears = Math.floor(diffDay / 365);
  if (diffYears === 1) {
    return 'hace 1 año';
  }
  return `hace ${diffYears} años`;
};

export const TabInicio: React.FC<TabInicioProps> = ({ summary, selectedDate, records }) => {
  // Tick state to re-evaluate relative time every 30 seconds
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);
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
      const recDate = getRecordDateStr(r);
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

  // Extract recent exits for the selected date
  const recentExits = useMemo(() => {
    if (!filteredRecords) return [];
    // Sort descending by checkOutTimestamp (most recent first)
    const checkedOut = filteredRecords.filter(r => r.checkOutTimestamp && r.durationMinutes > 0);
    return checkedOut.sort((a, b) => {
      const timeA = new Date(a.checkOutTimestamp!).getTime();
      const timeB = new Date(b.checkOutTimestamp!).getTime();
      return timeB - timeA;
    }).slice(0, 7); // Show top 7 recent exits
  }, [filteredRecords]);

  // Compute peak hours data dynamically when records are filtered for a selected date
  const peakHoursData = useMemo(() => {
    const hoursMap: Record<number, number> = {};
    for (let h = 8; h <= 22; h++) {
      hoursMap[h] = 0;
    }
    
    if (filteredRecords && filteredRecords.length > 0) {
      filteredRecords.forEach(r => {
        const hour = getRecordHour(r);
        if (hour >= 8 && hour <= 22) {
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

  const sortedCareerData = [...careerDistributionData].sort((a, b) => b.count - a.count);

  // Compute person type distribution
  const personTypeDistributionData = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) return [];
    const typeMap: Record<string, number> = {};
    filteredRecords.forEach(r => {
      const pType = r.personType || 'Alumno';
      typeMap[pType] = (typeMap[pType] || 0) + 1;
    });

    const total = filteredRecords.length;
    return Object.entries(typeMap).map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100)
    }));
  }, [filteredRecords]);

  const sortedPersonTypeData = [...personTypeDistributionData].sort((a, b) => b.count - a.count);

  // Compute exit peak hours data dynamically when records are filtered for a selected date
  const exitPeakHoursData = useMemo(() => {
    const hoursMap: Record<number, number> = {};
    for (let h = 8; h <= 22; h++) {
      hoursMap[h] = 0;
    }
    
    if (filteredRecords && filteredRecords.length > 0) {
      filteredRecords.forEach(r => {
        if (r.checkOutTimestamp && r.durationMinutes > 0) {
          const hour = new Date(r.checkOutTimestamp).getHours();
          if (hour >= 8 && hour <= 22) {
            hoursMap[hour] = (hoursMap[hour] || 0) + 1;
          }
        }
      });
    }

    return Object.keys(hoursMap).map(hStr => {
      const h = parseInt(hStr, 10);
      const label = `${h.toString().padStart(2, '0')}:00`;
      return { hour: h, label, count: hoursMap[h] };
    });
  }, [filteredRecords]);

  const handleExportPDF = () => {
    exportDailyReportPDF(
      formattedDateLabel || selectedDate || new Date().toLocaleDateString('es-PE'),
      filteredRecords || [],
      peakHoursData,
      sortedCareerData,
      summary
    );
  };

  const handleExportExcel = () => {
    exportDailyReportExcel(
      formattedDateLabel || selectedDate || new Date().toLocaleDateString('es-PE'),
      filteredRecords || [],
      peakHoursData,
      sortedCareerData
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(380px, 1fr)', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Peak Hours Chart */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '12px', 
              marginBottom: '18px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
                  <Clock size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Horarios de Mayor Ingreso (Horas Pico)
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {formattedDateLabel 
                      ? `Distribución por franja horaria para el ${formattedDateLabel}` 
                      : 'Distribución de estudiantes por franja horaria (8am a 9pm)'}
                  </p>
                </div>
              </div>

              {/* Export Buttons in Top-Right Corner */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={handleExportExcel}
                  title="Descargar reporte del día en formato Excel (.xlsx)"
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
                  onClick={handleExportPDF}
                  title="Descargar reporte del día en formato PDF (.pdf)"
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

          {/* Exit Peak Hours Chart */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                <LogOut size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Horarios de Mayor Salida (Horas Pico)
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  {formattedDateLabel 
                    ? `Distribución de salidas por franja horaria para el ${formattedDateLabel}` 
                    : 'Distribución de salidas por franja horaria de hoy'}
                </p>
              </div>
            </div>

            <div style={{ height: '240px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={exitPeakHoursData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="exitHourColorLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--urp-gold-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--urp-gold-primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                    formatter={(val: any) => [`${val} salidas`, 'Afluencia']}
                  />
                  <Area type="monotone" dataKey="count" stroke="var(--urp-gold-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#exitHourColorLight)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Últimos Ingresos (Actividad en Vivo) */}
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
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        color: 'var(--text-main)', 
                        fontWeight: 700, 
                        fontSize: '0.88rem', 
                        background: '#ffffff', 
                        padding: '5px 12px', 
                        borderRadius: '20px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}>
                        <Clock size={13} style={{ color: 'var(--urp-green-primary)' }} />
                        {record.timeString}
                      </div>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        color: '#64748b', 
                        fontWeight: 500,
                        paddingRight: '4px' 
                      }}>
                        {getRelativeTimeString(record.timestamp, record.dateString, record.timeString)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Person Type Distribution (Pie Chart) */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
                <PieChartIcon size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {formattedDateLabel ? `Afluencia por Tipo (${formattedDateLabel})` : 'Afluencia por Tipo (Hoy)'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Distribución de usuarios según su rol</p>
              </div>
            </div>

            {sortedPersonTypeData.length === 0 ? (
              <div style={{ height: '270px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '0.9rem', gap: '8px' }}>
                <PieChartIcon size={32} style={{ opacity: 0.3 }} />
                <span>No hay registros para esta fecha.</span>
              </div>
            ) : (
              <div style={{ height: '270px', width: '100%', display: 'flex', alignItems: 'center' }}>
                {/* Pie Chart */}
                <div style={{ flex: '0 0 55%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sortedPersonTypeData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={3}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {sortedPersonTypeData.map((entry, index) => (
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
                  {sortedPersonTypeData.map((item, index) => (
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

          {/* Career Distribution (Pie Chart) */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                <Building2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {formattedDateLabel ? `Afluencia por Programa Académico (${formattedDateLabel})` : 'Afluencia por Programa Académico (Hoy)'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Distribución de usuarios según su programa o carrera</p>
              </div>
            </div>

            {sortedCareerData.length === 0 ? (
              <div style={{ height: '270px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '0.9rem', gap: '8px' }}>
                <Building2 size={32} style={{ opacity: 0.3 }} />
                <span>No hay registros de carreras para esta fecha.</span>
              </div>
            ) : (
              <div style={{ height: '270px', width: '100%', display: 'flex', alignItems: 'center' }}>
                {/* Pie Chart */}
                <div style={{ flex: '0 0 55%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
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
                      >
                        {sortedCareerData.map((entry, index) => (
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

          {/* Últimas Salidas (Actividad de Salida en Vivo) */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                <Clock size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Últimas Salidas Registradas
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {formattedDateLabel ? `Salidas recientes del ${formattedDateLabel}` : 'Salidas en tiempo real de hoy'}
                </p>
              </div>
            </div>

            {recentExits.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)', background: '#f8fafc', borderRadius: '12px' }}>
                <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No hay registros de salidas para esta fecha.</p>
                <p style={{ fontSize: '0.85rem' }}>Aún no se ha retirado nadie.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {recentExits.map((record, i) => (
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
                      e.currentTarget.style.borderColor = 'var(--urp-gold-light)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = '#f1f5f9';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '50%', 
                        background: 'var(--urp-gold-light)', 
                        color: 'var(--urp-gold-primary)',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.1rem'
                      }}>
                        {record.studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 2px 0' }}>
                          {record.studentName}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                          <span>{record.studentCode}</span>
                          <span style={{ color: '#cbd5e1' }}>•</span>
                          <span>{record.career}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
                        <Clock size={12} />
                        {record.checkOutTimeString}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--urp-gold-primary)', fontWeight: 600 }}>
                        {record.durationMinutes} minutos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

