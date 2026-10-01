import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Users, Calendar, Clock, ArrowLeft, LogOut, 
  TrendingUp, Landmark, RotateCcw, Send, GraduationCap, User
} from 'lucide-react';
import { 
  api, AnalyticsSummary, AttendanceRecord, Student, AuthSession 
} from '../services/api';
import { useAttendanceHub } from '../hooks/useAttendanceHub';
import { NewStudentModal } from './NewStudentModal';
import { KPICards } from './admin/KPICards';
import { TabInicio } from './admin/TabInicio';
import { TabHistorico } from './admin/TabHistorico';
import { TabReportes } from './admin/TabReportes';
import { TabAlumnos } from './admin/TabAlumnos';
import { TabDifusion } from './admin/TabDifusion';
import { TabAcademic } from './admin/TabAcademic';
import { TabSettings } from './admin/TabSettings';
import { 
  getISOWeekFromDateStr, getCurrentWeek, getCurrentMonth, 
  formatWeekLabel, formatMonthLabel, getTodayDateStr, getRecordDateStr
} from '../utils/dateUtils';

interface AdminDashboardProps {
  session: AuthSession;
  onLogout: () => void;
  onBackToKiosk: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  onLogout,
  onBackToKiosk
}) => {
  const [activeTab, setActiveTab] = useState<'inicio' | 'historico' | 'records' | 'students' | 'academic' | 'difusion' | 'settings'>('inicio');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCareer, setFilterCareer] = useState('ALL');
  const [filterFaculty, setFilterFaculty] = useState('ALL');
  const [inicioDate, setInicioDate] = useState(() => getTodayDateStr());

  const [recordsStartDate, setRecordsStartDate] = useState(() => getTodayDateStr());
  const [recordsEndDate, setRecordsEndDate] = useState(() => getTodayDateStr());
  const [historyFilter, setHistoryFilter] = useState('week');
  const [historyWeek, setHistoryWeek] = useState(getCurrentWeek());
  const [historyMonth, setHistoryMonth] = useState(getCurrentMonth());
  const [historyYear, setHistoryYear] = useState(new Date().getFullYear());

  const [showNewStudentModal, setShowNewStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);

  // Available years dynamically derived from records
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    const currentY = new Date().getFullYear().toString();
    yearsSet.add(currentY);
    records.forEach(r => {
      const dStr = getRecordDateStr(r);
      if (dStr && dStr.length >= 4) {
        yearsSet.add(dStr.slice(0, 4));
      }
    });
    return Array.from(yearsSet).sort().reverse();
  }, [records]);

  // Compute records filtered by historical period
  const historicoFilteredRecords = useMemo(() => {
    if (!records) return [];
    if (historyFilter === 'all') return records;

    return records.filter(r => {
      const dateStr = getRecordDateStr(r);
      if (!dateStr) return false;

      if (historyFilter === 'year') {
        return dateStr.slice(0, 4) === historyYear.toString();
      }
      if (historyFilter === 'month') {
        return dateStr.slice(0, 7) === historyMonth;
      }
      if (historyFilter === 'week') {
        return getISOWeekFromDateStr(dateStr) === historyWeek;
      }
      return true;
    });
  }, [records, historyFilter, historyWeek, historyMonth, historyYear]);

  // Dynamic label for historical period
  const historicoPeriodLabel = useMemo(() => {
    if (historyFilter === 'week') return formatWeekLabel(historyWeek);
    if (historyFilter === 'month') return formatMonthLabel(historyMonth);
    if (historyFilter === 'year') return `Año ${historyYear}`;
    return 'Histórico Completo';
  }, [historyFilter, historyWeek, historyMonth, historyYear]);

  // Unique students count in the historical period
  const historicoUniqueStudentsCount = useMemo(() => {
    return new Set(historicoFilteredRecords.map(r => r.studentCode)).size;
  }, [historicoFilteredRecords]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [sumData, recData, stuData] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getRecentAttendances(10000),
        api.getAllStudents()
      ]);
      setSummary(sumData);
      setRecords(recData);
      setStudents(stuData);
    } catch (e) {
      console.error(e);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Stable callback reference for SignalR — refreshes data silently on check-in event
  const handleAttendanceEvent = useCallback(() => {
    loadData(true);
  }, []);

  // Connect to SignalR hub for real-time updates
  useAttendanceHub(handleAttendanceEvent);

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteStudent = async (id?: string) => {
    if (!id) return;
    if (window.confirm('¿Seguro que deseas eliminar este estudiante?')) {
      await api.deleteStudent(id);
      loadData();
    }
  };

  // Ensure the whole page and body background is pure white exclusively for the admin section
  useEffect(() => {
    const prevBgColor = document.body.style.backgroundColor;
    const prevBgImage = document.body.style.backgroundImage;

    document.body.style.backgroundColor = '#ffffff';
    document.body.style.backgroundImage = 'none';

    return () => {
      document.body.style.backgroundColor = prevBgColor;
      document.body.style.backgroundImage = prevBgImage;
    };
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#ffffff', color: 'var(--text-main)' }}>
      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        style={{ 
          width: isSidebarHovered ? '280px' : '72px', 
          transition: 'width 0.3s ease',
          background: '#ffffff', 
          borderRight: '1px solid var(--border-card)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 100,
          boxShadow: '2px 0 8px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, padding: '24px 20px', borderBottom: '1px solid var(--border-card)', minWidth: '280px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          <div style={{ minWidth: '32px', display: 'flex', justifyContent: 'center' }}>
            <Landmark size={28} color="var(--urp-green-primary)" />
          </div>
          <div style={{ opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease', whiteSpace: 'normal' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--urp-green-primary)', lineHeight: 1.3, marginBottom: '6px' }}>
              FHLM-URP
            </h1>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Panel Administrador
            </h2>            
          </div>
        </div>

        <nav style={{ position: 'relative', zIndex: 1, padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: '280px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '8px', opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>
            Menú Principal
          </div>
          
          <button
            onClick={() => setActiveTab('inicio')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'inicio' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'inicio' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'inicio' ? 500 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              width: '100%',
              justifyContent: 'flex-start'
            }}
          >
            <TrendingUp size={18} style={{ minWidth: '18px' }} /> <span style={{ opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('historico')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'historico' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'historico' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'historico' ? 500 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.2s ease',
              width: '100%',
              justifyContent: 'flex-start'
            }}
          >
            <Calendar size={18} style={{ minWidth: '18px' }} /> <span style={{ opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>Histórico</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'records' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'records' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'records' ? 500 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={18} style={{ minWidth: '18px' }} /> <span style={{ opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>Reporte</span>
            </div>
            <span style={{ 
              background: activeTab === 'records' ? 'rgba(15,81,66,0.15)' : '#f1f5f9', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.75rem',
              fontWeight: 700,
              opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease'
            }}>
              {records.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'students' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'students' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'students' ? 500 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users size={18} style={{ minWidth: '18px' }} /> <span style={{ opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>Alumnos</span>
            </div>
            <span style={{ 
              background: activeTab === 'students' ? 'rgba(15,81,66,0.15)' : '#f1f5f9', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.75rem',
              fontWeight: 700,
              opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease'
            }}>
              {students.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('academic')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'academic' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'academic' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'academic' ? 600 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <GraduationCap size={18} style={{ minWidth: '18px' }} /> <span style={{ opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>Facultades y Carreras</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('difusion')}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'difusion' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'difusion' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === 'difusion' ? 600 : 400,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Send size={18} style={{ minWidth: '18px' }} /> <span style={{ opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>Difusión</span>
            </div>
            <span style={{ 
              background: activeTab === 'difusion' ? 'rgba(15,81,66,0.15)' : '#f1f5f9', 
              padding: '2px 8px', 
              borderRadius: '12px', 
              fontSize: '0.75rem',
              fontWeight: 700,
              opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease'
            }}>
              {students.filter(s => s.email && s.email.trim()).length}
            </span>
          </button>
        </nav>

        <div style={{ position: 'relative', zIndex: 1, padding: '20px 16px', borderTop: '1px solid var(--border-card)', minWidth: '280px' }}>
           <div 
             onClick={() => setActiveTab('settings')}
             style={{ 
               display: 'flex', 
               alignItems: 'center', 
               gap: '12px', 
               marginBottom: '16px', 
               padding: '8px', 
               borderRadius: '8px',
               cursor: 'pointer',
               background: activeTab === 'settings' ? 'var(--urp-green-light)' : 'transparent',
               transition: 'background 0.2s ease'
             }}
           >
              <div style={{ minWidth: '36px', height: '36px', borderRadius: '50%', background: 'var(--urp-green-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {session.fullName.charAt(0)}
              </div>
              <div style={{ overflow: 'hidden', opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>
                <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{session.fullName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--urp-green-primary)', fontWeight: 600 }}>{session.role}</div>
              </div>
           </div>
           
           <button
             onClick={onLogout}
             style={{
               width: 'calc(100% - 16px)', 
               padding: '10px 16px',
               borderRadius: '8px',
               border: isSidebarHovered ? '1px solid #e2e8f0' : '1px solid transparent',
               background: isSidebarHovered ? '#f8fafc' : 'transparent',
               color: '#64748b',
               fontWeight: 600,
               fontSize: '0.85rem',
               cursor: 'pointer',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'flex-start',
               gap: '8px',
               transition: 'all 0.2s ease'
             }}
           >
             <LogOut size={16} style={{ minWidth: '16px' }} /> <span style={{ opacity: isSidebarHovered ? 1 : 0, transition: 'opacity 0.2s ease' }}>Cerrar Sesión</span>
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#ffffff', minHeight: '100vh' }}>
        {/* Top Header */}
        <header 
          style={{ 
            background: '#ffffff', 
            borderBottom: '1px solid var(--border-card)',
            position: 'sticky',
            top: 0,
            zIndex: 90,
            padding: '16px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: '70px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
              {activeTab === 'inicio' && 'Inicio y Resumen Diario'}
              {activeTab === 'historico' && 'Estadísticas Históricas'}
              {activeTab === 'records' && 'Reporte de Asistencias'}
              {activeTab === 'students' && 'Alumnos'}
              {activeTab === 'academic' && 'Gestión de Facultades y Carreras'}
              {activeTab === 'difusion' && 'Difusión Institucional'}
              {activeTab === 'settings' && 'Mi Perfil'}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeTab === 'inicio' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'nowrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>Fecha:</span>
                <input 
                  type="date" 
                  className="input-futuristic" 
                  style={{ padding: '8px 14px', fontSize: '0.85rem', width: 'auto' }} 
                  value={inicioDate}
                  onChange={(e) => setInicioDate(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setInicioDate(getTodayDateStr())}
                  title="Restablecer al día de hoy"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #0f5142',
                    background: 'var(--urp-green-light)',
                    color: 'var(--urp-green-primary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--urp-green-primary)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--urp-green-light)';
                    e.currentTarget.style.color = 'var(--urp-green-primary)';
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Hoy</span>
                </button>
              </div>
            )}
            
            {activeTab === 'records' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'nowrap' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>Desde:</span>
                <input 
                  type="date" 
                  className="input-futuristic" 
                  style={{ padding: '8px 14px', fontSize: '0.85rem', width: 'auto' }} 
                  value={recordsStartDate}
                  onChange={(e) => setRecordsStartDate(e.target.value)}
                />
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>Hasta:</span>
                <input 
                  type="date" 
                  className="input-futuristic" 
                  style={{ padding: '8px 14px', fontSize: '0.85rem', width: 'auto' }} 
                  value={recordsEndDate}
                  onChange={(e) => setRecordsEndDate(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => {
                    const today = getTodayDateStr();
                    setRecordsStartDate(today);
                    setRecordsEndDate(today);
                  }}
                  title="Restablecer fechas a hoy"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: '1px solid #0f5142',
                    background: 'var(--urp-green-light)',
                    color: 'var(--urp-green-primary)',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--urp-green-primary)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--urp-green-light)';
                    e.currentTarget.style.color = 'var(--urp-green-primary)';
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Hoy</span>
                </button>
              </div>
            )}
            
            {activeTab === 'historico' && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-subtle)' }}>Período:</span>
                <select 
                  className="input-futuristic" 
                  style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                  value={historyFilter}
                  onChange={(e) => setHistoryFilter(e.target.value)}
                >
                  <option value="week">Por Semana</option>
                  <option value="month">Por Mes</option>
                  <option value="year">Por Año</option>
                  <option value="all">Histórico Completo</option>
                </select>
                
                {historyFilter === 'week' && (
                  <input 
                    type="week" 
                    className="input-futuristic" 
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }} 
                    value={historyWeek} 
                    onChange={(e) => setHistoryWeek(e.target.value)} 
                  />
                )}
                {historyFilter === 'month' && (
                  <input 
                    type="month" 
                    className="input-futuristic" 
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }} 
                    value={historyMonth} 
                    onChange={(e) => setHistoryMonth(e.target.value)} 
                  />
                )}
                {historyFilter === 'year' && (
                  <select 
                    className="input-futuristic" 
                    style={{ padding: '8px 14px', fontSize: '0.85rem' }} 
                    value={historyYear} 
                    onChange={(e) => setHistoryYear(parseInt(e.target.value, 10))}
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                )}
                {historyFilter === 'all' && (
                  <span style={{ 
                    fontSize: '0.82rem', 
                    color: 'var(--urp-green-primary)', 
                    fontWeight: 600, 
                    background: 'var(--urp-green-light)', 
                    padding: '6px 12px', 
                    borderRadius: '20px',
                    border: '1px solid rgba(15, 81, 66, 0.15)' 
                  }}>
                    Todos los registros
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        <main style={{ padding: '32px', width: '100%', maxWidth: '95%', margin: '0 auto', flex: 1, background: '#ffffff' }}>
          {/* KPI Cards */}
          {(activeTab === 'inicio' || activeTab === 'historico') && (
            <KPICards 
              summary={summary} 
              studentsCount={students.length}
              selectedDate={activeTab === 'inicio' ? inicioDate : undefined}
              selectedDateVisitsCount={
                activeTab === 'inicio' 
                  ? records.filter(r => {
                      const recDate = getRecordDateStr(r);
                      return recDate === inicioDate;
                    }).length
                  : undefined
              }
              periodType={activeTab === 'historico' ? (historyFilter as any) : undefined}
              periodLabel={activeTab === 'historico' ? historicoPeriodLabel : undefined}
              periodVisitsCount={activeTab === 'historico' ? historicoFilteredRecords.length : undefined}
              periodUniqueStudentsCount={activeTab === 'historico' ? historicoUniqueStudentsCount : undefined}
            />
          )}

          {/* TAB 1: INICIO (Daily Stats) */}
          {activeTab === 'inicio' && summary && (
            <TabInicio summary={summary} selectedDate={inicioDate} records={records} />
          )}

          {/* TAB 1B: HISTORICO */}
          {activeTab === 'historico' && summary && (
            <TabHistorico 
              summary={summary}
              records={records}
              filterType={historyFilter}
              filterValue={
                historyFilter === 'week' ? historyWeek :
                historyFilter === 'month' ? historyMonth :
                historyFilter === 'year' ? historyYear.toString() : ''
              }
              filteredRecords={historicoFilteredRecords}
            />
          )}

          {/* TAB 2: ATTENDANCE RECORDS */}
          {activeTab === 'records' && (
            <TabReportes
              records={records}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterCareer={filterCareer}
              setFilterCareer={setFilterCareer}
              filterFaculty={filterFaculty}
              setFilterFaculty={setFilterFaculty}
              filterStartDate={recordsStartDate}
              filterEndDate={recordsEndDate}
              students={students}
            />
          )}

          {/* TAB 3: STUDENT DATABASE */}
          {activeTab === 'students' && (
            <TabAlumnos
              students={students}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterCareer={filterCareer}
              setFilterCareer={setFilterCareer}
              filterFaculty={filterFaculty}
              setFilterFaculty={setFilterFaculty}
              onNewStudent={() => {
                setEditingStudent(undefined);
                setShowNewStudentModal(true);
              }}
              onEditStudent={(s) => {
                setEditingStudent(s);
                setShowNewStudentModal(true);
              }}
              onDeleteStudent={handleDeleteStudent}
              onNavigateToDifusion={() => setActiveTab('difusion')}
            />
          )}

          {/* TAB 5: DIFUSIÓN INSTITUCIONAL */}
          {activeTab === 'difusion' && (
            <TabDifusion students={students} />
          )}

          {/* TAB 6: GESTIÓN DE FACULTADES Y CARRERAS */}
          {activeTab === 'academic' && (
            <TabAcademic 
              students={students}
              onTreeUpdated={() => {
                api.getAllStudents().then(res => {
                  if (res) setStudents(res);
                }).catch(() => {});
              }}
            />
          )}

          {/* TAB 7: MI PERFIL */}
          {activeTab === 'settings' && (
            <TabSettings session={session} />
          )}
        </main>
      </div>

      {showNewStudentModal && (
        <NewStudentModal
          isOpen={showNewStudentModal}
          prefilledCode=""
          initialStudent={editingStudent}
          onClose={() => {
            setShowNewStudentModal(false);
            setEditingStudent(undefined);
          }}
          onSuccess={() => {
            setShowNewStudentModal(false);
            setEditingStudent(undefined);
            loadData();
          }}
        />
      )}
    </div>
  );
};
