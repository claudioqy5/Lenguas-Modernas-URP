import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Cell
} from 'recharts';
import { 
  Users, Calendar, Clock, Award, FileSpreadsheet, FileText, ArrowLeft, LogOut, 
  Search, Filter, Plus, Trash2, Edit3, CheckCircle2, TrendingUp, Sparkles, BookOpen,
  Trophy, Medal, Shield, Building2
} from 'lucide-react';
import { 
  api, AnalyticsSummary, AttendanceRecord, Student, AuthSession 
} from '../services/api';
import { exportAttendanceToPDF, exportAttendanceToExcel } from '../utils/exportReports';

interface AdminDashboardProps {
  session: AuthSession;
  onLogout: () => void;
  onBackToKiosk: () => void;
}

const BAR_COLORS = ['#0f5142', '#0284c7', '#b45309', '#7c3aed', '#e11d48', '#059669'];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  onLogout,
  onBackToKiosk
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'records' | 'students'>('analytics');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCareer, setFilterCareer] = useState('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumData, recData, stuData] = await Promise.all([
        api.getAnalyticsSummary(),
        api.getRecentAttendances(100),
        api.getAllStudents()
      ]);
      setSummary(sumData);
      setRecords(recData);
      setStudents(stuData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = records.filter(r => {
    const matchSearch = r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        r.studentCode.includes(searchTerm) ||
                        r.visitReason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCareer = filterCareer === 'ALL' || r.career === filterCareer;
    return matchSearch && matchCareer;
  });

  const filteredStudents = students.filter(s => {
    const matchSearch = s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        s.studentCode.includes(searchTerm) ||
                        s.documentNumber.includes(searchTerm);
    const matchCareer = filterCareer === 'ALL' || s.career === filterCareer;
    return matchSearch && matchCareer;
  });

  const handleDeleteStudent = async (id?: string) => {
    if (!id) return;
    if (window.confirm('¿Seguro que deseas eliminar este estudiante?')) {
      await api.deleteStudent(id);
      loadData();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-main)', paddingBottom: '60px' }}>
      {/* Top Navbar */}
      <header 
        style={{ 
          background: '#ffffff', 
          borderBottom: '1px solid var(--border-card)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '14px 32px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)'
        }}
      >
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={onBackToKiosk}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: 'var(--text-main)',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={16} /> Kiosco de Ingreso
            </button>
            <div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--urp-green-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                Universidad Ricardo Palma • Panel Bibliotecólogo
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Facultad de Humanidades y Lenguas Modernas — Control de Asistencias y Aforo
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => exportAttendanceToPDF(records, summary)}
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <FileText size={15} /> Exportar PDF
            </button>

            <button
              onClick={() => exportAttendanceToExcel(records, students)}
              style={{
                background: 'var(--urp-green-light)',
                border: '1px solid rgba(15, 81, 66, 0.25)',
                color: 'var(--urp-green-primary)',
                padding: '9px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={15} /> Exportar Excel
            </button>

            <div style={{ borderLeft: '1px solid #e2e8f0', height: '24px', margin: '0 4px' }} />

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>{session.fullName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--urp-green-primary)', fontWeight: 600 }}>{session.role}</div>
            </div>

            <button
              onClick={onLogout}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '8px',
                color: '#64748b',
                cursor: 'pointer'
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ maxWidth: '1440px', margin: '12px auto 0', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('analytics')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'analytics' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'analytics' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'analytics' ? '2.5px solid var(--urp-green-primary)' : '2.5px solid transparent',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <TrendingUp size={16} /> Estadísticas y Analítica
          </button>

          <button
            onClick={() => setActiveTab('records')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'records' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'records' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'records' ? '2.5px solid var(--urp-green-primary)' : '2.5px solid transparent',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Clock size={16} /> Registro de Asistencias ({records.length})
          </button>

          <button
            onClick={() => setActiveTab('students')}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'students' ? 'var(--urp-green-light)' : 'transparent',
              color: activeTab === 'students' ? 'var(--urp-green-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'students' ? '2.5px solid var(--urp-green-primary)' : '2.5px solid transparent',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Users size={16} /> Base de Datos de Alumnos ({students.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1440px', margin: '28px auto', padding: '0 32px' }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
          <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Alumnos Registrados
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
                  {summary?.totalRegisteredStudents ?? students.length}
                </div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
                <Users size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '8px' }}>
              Facultad de Humanidades y Lenguas Modernas
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Asistencias de Hoy
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--urp-green-primary)', marginTop: '4px' }}>
                  {summary?.totalVisitsToday ?? 18}
                </div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
                <Clock size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--urp-green-primary)', fontWeight: 600, marginTop: '8px' }}>
              Permite múltiples reingresos al día
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Asistencias del Mes
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--urp-gold-primary)', marginTop: '4px' }}>
                  {summary?.totalVisitsThisMonth ?? 340}
                </div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                <Calendar size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--urp-gold-primary)', fontWeight: 600, marginTop: '8px' }}>
              Afluencia total acumulada
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Aforo en Tiempo Real
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '4px' }}>
                  {summary?.currentOccupancy ?? 24} <span style={{ fontSize: '1.1rem', color: 'var(--text-subtle)', fontWeight: 600 }}>/ {summary?.maxCapacity ?? 60}</span>
                </div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', background: '#f5f3ff', color: 'var(--accent-purple)' }}>
                <Sparkles size={22} />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', fontWeight: 600, marginTop: '8px' }}>
              {summary?.occupancyPercentage ?? 40}% de puestos ocupados
            </div>
          </div>
        </div>

        {/* TAB 1: ANALYTICS */}
        {activeTab === 'analytics' && summary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
            {/* Chart Row 1: Peak Hours & Peak Days */}
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
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Distribución de estudiantes por franja horaria</p>
                  </div>
                </div>

                <div style={{ height: '270px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={summary.peakHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comparativa de concurrencia de Lunes a Sábado</p>
                  </div>
                </div>

                <div style={{ height: '270px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.peakDays} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                      <YAxis stroke="#64748b" fontSize={11} />
                      <Tooltip 
                        contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                        formatter={(val: any) => [`${val} visitas`, 'Total']}
                      />
                      <Bar dataKey="count" fill="#b45309" radius={[6, 6, 0, 0]}>
                        {summary.peakDays.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={index === 1 || index === 2 ? '#b45309' : '#0f5142'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Row 2: Top Students Ranking & Reason Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>
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
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alumnos con mayor cantidad de ingresos a biblioteca</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {summary.topStudents.slice(0, 5).map((student, idx) => {
                    const rankColor = idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#0f5142' : '#64748b';
                    const RankIcon = idx === 0 ? Trophy : idx === 1 ? Medal : Award;

                    return (
                      <div 
                        key={student.studentId || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          background: idx === 0 ? '#fefce8' : '#f8fafc',
                          borderRadius: '10px',
                          border: idx === 0 ? '1px solid #fef08a' : '1px solid #e2e8f0'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div 
                            style={{ 
                              width: '30px', 
                              height: '30px', 
                              borderRadius: '8px', 
                              background: '#ffffff',
                              border: `1.5px solid ${rankColor}`,
                              color: rankColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '0.8rem'
                            }}
                          >
                            <RankIcon size={15} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>
                              {student.fullName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Cód: {student.studentCode} • {student.career}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--urp-green-primary)' }}>
                            {student.visitCount}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginLeft: '4px' }}>visitas</span>
                        </div>
                      </div>
                    );
                  })}
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
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Servicios más solicitados por los estudiantes</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {summary.reasonDistribution.map((item, idx) => (
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
        )}

        {/* TAB 2: ATTENDANCE RECORDS */}
        {activeTab === 'records' && (
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-subtle)', background: '#f8fafc' }}>
                    <th style={{ padding: '12px 14px' }}>Fecha y Hora</th>
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
                      <td colSpan={6} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                          <span style={{ color: 'var(--text-subtle)', marginLeft: '6px' }}>{r.timeString}</span>
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
        )}

        {/* TAB 3: STUDENT DATABASE */}
        {activeTab === 'students' && (
          <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '13px', color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar estudiante por nombre, código o DNI..."
                  className="input-futuristic"
                  style={{ paddingLeft: '40px', fontSize: '0.9rem', padding: '10px 14px 10px 40px' }}
                />
              </div>

              <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Total: <strong style={{ color: 'var(--text-main)' }}>{filteredStudents.length}</strong> estudiantes registrados
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-subtle)', background: '#f8fafc' }}>
                    <th style={{ padding: '12px 14px' }}>Código</th>
                    <th style={{ padding: '12px 14px' }}>DNI</th>
                    <th style={{ padding: '12px 14px' }}>Estudiante</th>
                    <th style={{ padding: '12px 14px' }}>Carrera</th>
                    <th style={{ padding: '12px 14px' }}>Especialidad</th>
                    <th style={{ padding: '12px 14px' }}>Visitas</th>
                    <th style={{ padding: '12px 14px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: 'var(--urp-green-primary)', fontWeight: 700 }}>
                          {s.studentCode}
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-subtle)' }}>
                          {s.documentNumber || '—'}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-main)' }}>
                          <div>{s.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{s.email}</div>
                        </td>
                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                          {s.career}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className="badge-tag" style={{ background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)', border: '1px solid rgba(180, 83, 9, 0.2)' }}>
                            {s.primaryLanguage}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <strong style={{ color: 'var(--urp-green-primary)' }}>{s.totalVisits}</strong>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteStudent(s.id)}
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#ef4444',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            title="Eliminar Estudiante"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
