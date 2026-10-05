import React, { useMemo, useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar } from 'recharts';
import { Clock, Building2, Activity, User, FileSpreadsheet, FileText, PieChart as PieChartIcon, Hourglass, LogOut, BarChart2, List, Timer, Users } from 'lucide-react';
import { AnalyticsSummary, AttendanceRecord } from '../../services/api';
import { exportDailyReportPDF, exportDailyReportExcel } from '../../utils/exportReports';
import { getRecordDateStr, getRecordHour, getTodayDateStr } from '../../utils/dateUtils';

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
  const [tick, setTick] = useState(0);
  const [trafficViewMode, setTrafficViewMode] = useState<'chart' | 'entries' | 'exits'>('chart');
  const [durationViewMode, setDurationViewMode] = useState<'chart' | 'users'>('chart');

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
    });
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
    });
  }, [filteredRecords]);

  // Combined traffic data (Ingresos y Salidas superpuestos)
  const combinedTrafficData = useMemo(() => {
    const entriesMap: Record<number, number> = {};
    const exitsMap: Record<number, number> = {};
    for (let h = 8; h <= 22; h++) {
      entriesMap[h] = 0;
      exitsMap[h] = 0;
    }

    if (filteredRecords && filteredRecords.length > 0) {
      filteredRecords.forEach(r => {
        // Ingresos
        const entryHour = getRecordHour(r);
        if (entryHour !== null && entryHour >= 8 && entryHour <= 22) {
          entriesMap[entryHour] = (entriesMap[entryHour] || 0) + 1;
        }
        // Salidas
        if (r.checkOutTimestamp && r.durationMinutes > 0) {
          const exitHour = new Date(r.checkOutTimestamp).getHours();
          if (exitHour >= 8 && exitHour <= 22) {
            exitsMap[exitHour] = (exitsMap[exitHour] || 0) + 1;
          }
        }
      });
    }

    return Object.keys(entriesMap).map(hStr => {
      const h = parseInt(hStr, 10);
      const label = `${h.toString().padStart(2, '0')}:00`;
      return {
        hour: h,
        label,
        entries: entriesMap[h],
        exits: exitsMap[h],
        count: entriesMap[h]
      };
    });
  }, [filteredRecords]);

  const peakHoursData = combinedTrafficData;

  // Active users currently in library
  const activeRecords = useMemo(() => {
    if (!filteredRecords) return [];
    return filteredRecords.filter(r => r.isActive === true || (r.isActive === undefined && !r.checkOutTimestamp));
  }, [filteredRecords]);

  // Aggregate active duration by career/program/role
  const activeDurationByGroup = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) return [];
    const isToday = !selectedDate || selectedDate === getTodayDateStr();
    const map: Record<string, { totalMinutes: number; userCount: number; personType: string }> = {};
    const now = new Date().getTime();

    filteredRecords.forEach(r => {
      const isActiveUser = r.isActive === true || (r.isActive === undefined && !r.checkOutTimestamp);

      let minutes = 0;
      if (isToday) {
        if (isActiveUser) {
          const entryTime = r.timestamp 
            ? new Date(r.timestamp).getTime() 
            : (r.dateString && r.timeString ? new Date(`${r.dateString}T${r.timeString}`).getTime() : 0);
          if (entryTime > 0 && !isNaN(entryTime)) {
            minutes = Math.max(1, Math.floor((now - entryTime) / 60000));
          } else {
            minutes = 1;
          }
        }
      } else {
        minutes = r.durationMinutes || 0;
      }

      if (minutes > 0 && (isToday ? isActiveUser : true)) {
        let groupName = '';
        const pType = r.personType?.trim() || '';
        const career = r.career?.trim() || '';

        if (pType === 'Docente') {
          groupName = 'Docentes';
        } else if (pType === 'Visitante') {
          groupName = 'Visitantes';
        } else if (career && career !== 'Sin Carrera') {
          groupName = career;
        } else if (pType && pType !== 'Alumno') {
          groupName = pType;
        } else {
          groupName = career || 'Comunidad General';
        }

        if (!map[groupName]) {
          map[groupName] = { totalMinutes: 0, userCount: 0, personType: pType };
        }
        map[groupName].totalMinutes += minutes;
        map[groupName].userCount += 1;
      }
    });

    return Object.entries(map).map(([name, data]) => {
      const h = Math.floor(data.totalMinutes / 60);
      const m = data.totalMinutes % 60;
      const formattedTime = h > 0 ? `${h}h ${m}m` : `${m} min`;
      return {
        name,
        totalMinutes: data.totalMinutes,
        userCount: data.userCount,
        formattedTime
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [filteredRecords, selectedDate, tick]);

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
          
          /* Combined Peak Hours Chart (Ingresos y Salidas Superpuestos) */
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
                    {trafficViewMode === 'chart' && 'Horarios de Mayor Afluencia (Ingresos vs Salidas)'}
                    {trafficViewMode === 'entries' && 'Últimos Ingresos Registrados'}
                    {trafficViewMode === 'exits' && 'Últimas Salidas Registradas'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {trafficViewMode === 'chart' && (formattedDateLabel ? `Distribución comparativa para el ${formattedDateLabel}` : 'Distribución comparativa de ingresos y salidas (08:00 a 22:00)')}
                    {trafficViewMode === 'entries' && (formattedDateLabel ? `Actividad reciente del ${formattedDateLabel}` : 'Actividad en tiempo real de hoy')}
                    {trafficViewMode === 'exits' && (formattedDateLabel ? `Salidas recientes del ${formattedDateLabel}` : 'Salidas en tiempo real de hoy')}
                  </p>
                </div>
              </div>

              {/* View Switcher & Legends */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {trafficViewMode === 'chart' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 700, color: '#0f5142' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#0f5142', display: 'inline-block' }} />
                      <span>Ingresos</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>
                      <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#b45309', display: 'inline-block' }} />
                      <span>Salidas</span>
                    </div>
                  </div>
                )}

                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  background: '#f1f5f9', 
                  padding: '3px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0' 
                }}>
                  <button
                    type="button"
                    onClick={() => setTrafficViewMode('chart')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: trafficViewMode === 'chart' ? '#ffffff' : 'transparent',
                      color: trafficViewMode === 'chart' ? 'var(--urp-green-primary)' : '#64748b',
                      fontWeight: trafficViewMode === 'chart' ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: trafficViewMode === 'chart' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <BarChart2 size={13} />
                    <span>Gráfico</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrafficViewMode('entries')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: trafficViewMode === 'entries' ? '#ffffff' : 'transparent',
                      color: trafficViewMode === 'entries' ? '#0f5142' : '#64748b',
                      fontWeight: trafficViewMode === 'entries' ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: trafficViewMode === 'entries' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <List size={13} />
                    <span>Ingresos ({recentActivity.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrafficViewMode('exits')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: trafficViewMode === 'exits' ? '#ffffff' : 'transparent',
                      color: trafficViewMode === 'exits' ? '#b45309' : '#64748b',
                      fontWeight: trafficViewMode === 'exits' ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: trafficViewMode === 'exits' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <LogOut size={13} />
                    <span>Salidas ({recentExits.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area (Height 270px) */}
            <div style={{ height: '270px', width: '100%' }}>
              {trafficViewMode === 'chart' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={combinedTrafficData} margin={{ top: 10, right: 25, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trafficEntriesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f5142" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#0f5142" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="trafficExitsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b45309" stopOpacity={0.40} />
                        <stop offset="95%" stopColor="#b45309" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 6px 16px rgba(0,0,0,0.08)' }} 
                      formatter={(val: any, name: string) => [
                        `${val} ${name === 'Ingresos' ? 'asistencias' : 'salidas'}`,
                        name
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="entries" 
                      name="Ingresos" 
                      stroke="#0f5142" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#trafficEntriesGrad)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="exits" 
                      name="Salidas" 
                      stroke="#b45309" 
                      strokeWidth={2.5} 
                      fillOpacity={1} 
                      fill="url(#trafficExitsGrad)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}

              {trafficViewMode === 'entries' && (
                <div style={{ height: '100%', width: '100%', overflowY: 'auto', paddingRight: '4px' }}>
                  {recentActivity.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', background: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
                      <User size={30} style={{ opacity: 0.5, marginBottom: '8px' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>No hay registros de ingreso para esta fecha.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recentActivity.map((record, i) => (
                        <div 
                          key={record.id || i}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #f1f5f9',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div style={{ 
                              width: '34px', 
                              height: '34px', 
                              borderRadius: '50%', 
                              background: 'var(--urp-green-light)', 
                              color: 'var(--urp-green-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                              flexShrink: 0
                            }}>
                              {record.studentName.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {record.studentName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span>{record.studentCode}</span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span style={{ fontWeight: 600 }}>{record.career}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '4px', 
                              color: 'var(--text-main)', 
                              fontWeight: 700, 
                              fontSize: '0.8rem', 
                              background: '#ffffff', 
                              padding: '3px 9px', 
                              borderRadius: '20px', 
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}>
                              <Clock size={11} style={{ color: 'var(--urp-green-primary)' }} />
                              {record.timeString}
                            </div>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              color: '#64748b', 
                              fontWeight: 500,
                              paddingRight: '2px'
                            }}>
                              {getRelativeTimeString(record.timestamp, record.dateString, record.timeString)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {trafficViewMode === 'exits' && (
                <div style={{ height: '100%', width: '100%', overflowY: 'auto', paddingRight: '4px' }}>
                  {recentExits.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', background: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
                      <Clock size={30} style={{ opacity: 0.5, marginBottom: '8px' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>No hay registros de salidas para esta fecha.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {recentExits.map((record, i) => (
                        <div 
                          key={record.id || i}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: '#f8fafc',
                            border: '1px solid #f1f5f9',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div style={{ 
                              width: '34px', 
                              height: '34px', 
                              borderRadius: '50%', 
                              background: 'var(--urp-gold-light)', 
                              color: 'var(--urp-gold-primary)',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontWeight: 700, 
                              fontSize: '0.9rem',
                              flexShrink: 0
                            }}>
                              {record.studentName.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', margin: '0 0 2px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {record.studentName}
                              </h4>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span>{record.studentCode}</span>
                                <span style={{ color: '#cbd5e1' }}>•</span>
                                <span>{record.career}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '2px' }}>
                              <Clock size={11} style={{ color: 'var(--urp-gold-primary)' }} />
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
              )}
            </div>
          </div>

          {/* Real-time Usage Duration by Career / Role Card */}
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff', width: '100%' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '12px', 
              marginBottom: '18px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                  <Timer size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    Permanencia en Tiempo Real por Programa / Rol
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Suma total de minutos de uso de las instalaciones en sala
                  </p>
                </div>
              </div>

              {/* View Switcher & Live indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  background: activeRecords.length > 0 ? '#f0fdf4' : '#f8fafc',
                  color: activeRecords.length > 0 ? '#15803d' : '#64748b',
                  border: `1px solid ${activeRecords.length > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                  padding: '4px 10px',
                  borderRadius: '20px'
                }}>
                  <span style={{ 
                    width: '7px', 
                    height: '7px', 
                    borderRadius: '50%', 
                    background: activeRecords.length > 0 ? '#22c55e' : '#94a3b8',
                    display: 'inline-block' 
                  }} />
                  <span>{activeRecords.length} en sala</span>
                </div>

                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  background: '#f1f5f9', 
                  padding: '3px', 
                  borderRadius: '8px', 
                  border: '1px solid #e2e8f0' 
                }}>
                  <button
                    type="button"
                    onClick={() => setDurationViewMode('chart')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: durationViewMode === 'chart' ? '#ffffff' : 'transparent',
                      color: durationViewMode === 'chart' ? 'var(--urp-gold-primary)' : '#64748b',
                      fontWeight: durationViewMode === 'chart' ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: durationViewMode === 'chart' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <BarChart2 size={13} />
                    <span>Barras</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationViewMode('users')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 11px',
                      borderRadius: '6px',
                      border: 'none',
                      background: durationViewMode === 'users' ? '#ffffff' : 'transparent',
                      color: durationViewMode === 'users' ? 'var(--urp-gold-primary)' : '#64748b',
                      fontWeight: durationViewMode === 'users' ? 700 : 500,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      boxShadow: durationViewMode === 'users' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Users size={13} />
                    <span>Detalle ({activeRecords.length})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area (Height 270px) */}
            <div style={{ height: '270px', width: '100%' }}>
              {durationViewMode === 'chart' ? (
                activeDurationByGroup.length === 0 ? (
                  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', background: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
                    <Timer size={32} style={{ opacity: 0.4, marginBottom: '8px', color: 'var(--urp-gold-primary)' }} />
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0, color: 'var(--text-main)' }}>No hay usuarios activos en sala en este momento.</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>El gráfico registrará el tiempo acumulado conforme ingresen usuarios.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={activeDurationByGroup}
                      margin={{ top: 5, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis 
                        type="number" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        tickFormatter={(min) => `${min}m`} 
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false}
                        width={135} 
                        tick={({ x, y, payload }) => (
                          <text x={x} y={y} dy={4} textAnchor="end" fill="#334155" fontSize={11} fontWeight={600}>
                            {payload.value.length > 17 ? `${payload.value.slice(0, 16)}…` : payload.value}
                          </text>
                        )}
                      />
                      <Tooltip
                        contentStyle={{ 
                          background: '#ffffff', 
                          border: '1px solid #e2e8f0', 
                          borderRadius: '10px', 
                          boxShadow: '0 6px 16px rgba(0,0,0,0.08)' 
                        }}
                        formatter={(val, _name, props) => [
                          `${props.payload.formattedTime} acumulados (${props.payload.userCount} ${props.payload.userCount === 1 ? 'persona activa' : 'personas activas'})`,
                          'Tiempo en sala'
                        ]}
                      />
                      <Bar dataKey="totalMinutes" radius={[0, 8, 8, 0]} maxBarSize={24}>
                        {activeDurationByGroup.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              ) : (
                <div style={{ height: '100%', width: '100%', overflowY: 'auto', paddingRight: '4px' }}>
                  {activeRecords.length === 0 ? (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', background: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
                      <Users size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>No hay usuarios activos en sala.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeRecords.map((record, i) => {
                        const entryDate = record.timestamp 
                          ? new Date(record.timestamp) 
                          : (record.dateString && record.timeString ? new Date(`${record.dateString}T${record.timeString}`) : null);
                        const mins = entryDate && !isNaN(entryDate.getTime()) 
                          ? Math.max(1, Math.floor((new Date().getTime() - entryDate.getTime()) / 60000))
                          : 1;
                        const h = Math.floor(mins / 60);
                        const m = mins % 60;
                        const formattedElap = h > 0 ? `${h}h ${m}m` : `${m} min`;

                        return (
                          <div 
                            key={record.id || i}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '10px',
                              background: '#f8fafc',
                              border: '1px solid #f1f5f9',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                              <div style={{ position: 'relative' }}>
                                <div style={{ 
                                  width: '34px', 
                                  height: '34px', 
                                  borderRadius: '50%', 
                                  background: 'var(--urp-green-light)', 
                                  color: 'var(--urp-green-primary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.9rem',
                                  flexShrink: 0
                                }}>
                                  {record.studentName.charAt(0)}
                                </div>
                                <span style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  right: 0,
                                  width: '9px',
                                  height: '9px',
                                  borderRadius: '50%',
                                  background: '#22c55e',
                                  border: '2px solid #ffffff'
                                }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {record.studentName}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <span>{record.personType || 'Alumno'}</span>
                                  <span style={{ color: '#cbd5e1' }}>•</span>
                                  <span style={{ fontWeight: 600 }}>{record.career || 'Sin Carrera'}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', fontSize: '0.8rem', fontWeight: 700, color: '#15803d', marginBottom: '2px' }}>
                                <Timer size={11} />
                                <span>{formattedElap}</span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                Ingreso: {record.timeString}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
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

        </div>

      </div>
    </div>
  );
};
