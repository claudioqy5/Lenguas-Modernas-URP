import React from 'react';
import { Users, Clock, Calendar, Activity } from 'lucide-react';
import { AnalyticsSummary, AttendanceRecord } from '../../services/api';

interface KPICardsProps {
  summary: AnalyticsSummary | null;
  studentsCount: number;
  selectedDate?: string;
  selectedDateVisitsCount?: number;
  // Historical period props
  periodType?: 'week' | 'month' | 'year' | 'all';
  periodLabel?: string;
  periodVisitsCount?: number;
  periodUniqueStudentsCount?: number;
  records?: AttendanceRecord[];
}

export const KPICards: React.FC<KPICardsProps> = ({ 
  summary, 
  studentsCount,
  selectedDate,
  selectedDateVisitsCount,
  periodType,
  periodLabel,
  periodVisitsCount,
  periodUniqueStudentsCount,
  records
}) => {
  // Format selected date YYYY-MM-DD -> DD/MM/YYYY
  const formattedDateLabel = selectedDate ? (() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return selectedDate;
  })() : null;

  // Determine Card 2 Title & Subtitle based on mode
  let card2Title = 'Asistencias de Hoy';
  let card2Value = summary?.totalVisitsToday ?? 0;
  let card2Subtitle = 'Permite múltiples reingresos al día';

  if (periodType) {
    if (periodType === 'week') {
      card2Title = 'Asistencias de la Semana';
      card2Subtitle = periodLabel ? `${periodLabel}` : 'Total de la semana';
    } else if (periodType === 'month') {
      card2Title = 'Asistencias del Mes';
      card2Subtitle = periodLabel ? `${periodLabel}` : 'Total del mes';
    } else if (periodType === 'year') {
      card2Title = 'Asistencias del Año';
      card2Subtitle = periodLabel ? `Año ${periodLabel}` : 'Total del año';
    } else {
      card2Title = 'Total Asistencias Históricas';
      card2Subtitle = 'Historial completo acumulado';
    }
    card2Value = periodVisitsCount ?? 0;
  } else if (formattedDateLabel) {
    card2Title = 'Asistencias del Día';
    card2Value = selectedDateVisitsCount ?? summary?.totalVisitsToday ?? 0;
    card2Subtitle = `Reporte Diario (${formattedDateLabel})`;
  }

  // Calculate Average Duration
  let avgDurationMinutes = 0;
  if (records && records.length > 0) {
    const completedVisits = records.filter(r => r.durationMinutes && r.durationMinutes > 0);
    if (completedVisits.length > 0) {
      const totalDuration = completedVisits.reduce((acc, r) => acc + r.durationMinutes, 0);
      avgDurationMinutes = Math.round(totalDuration / completedVisits.length);
    }
  }

  // Format the duration string
  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const avgDurationStr = formatDuration(avgDurationMinutes);

  // Determine Card 3 Title & Subtitle based on mode
  const isPeriodMode = Boolean(periodType);
  const card3Title = 'Tiempo Prom. de Estadía';
  const card3Value = avgDurationStr;
  const card3Subtitle = isPeriodMode 
    ? `Promedio de estadía (${periodLabel || 'Período'})` 
    : (formattedDateLabel ? `Promedio del ${formattedDateLabel}` : 'Promedio de hoy');

  const currentOccupancy = summary?.currentOccupancy || 0;
  const maxCapacity = summary?.maxCapacity || 50;
  const occupancyPercent = Math.min(Math.round((currentOccupancy / maxCapacity) * 100), 100);
  const isOverCapacity = currentOccupancy > maxCapacity;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isPeriodMode ? 'repeat(auto-fit, minmax(240px, 1fr))' : 'repeat(5, 1fr)', gap: '16px', marginBottom: '28px' }}>
      <div className="glass-panel" style={{ padding: '18px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              Usuarios Registrados
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {summary?.totalRegisteredStudents ?? studentsCount}
            </div>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
            <Users size={18} />
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '8px' }}>
          Comunidad Universitaria
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '18px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              {card2Title}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--urp-green-primary)', marginTop: '4px' }}>
              {card2Value}
            </div>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
            <Clock size={18} />
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--urp-green-primary)', fontWeight: 600, marginTop: '8px' }}>
          {card2Subtitle}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '18px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              {card3Title}
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--urp-gold-primary)', marginTop: '4px' }}>
              {card3Value}
            </div>
          </div>
          <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
            <Calendar size={18} />
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--urp-gold-primary)', fontWeight: 600, marginTop: '8px' }}>
          {card3Subtitle}
        </div>
      </div>

      {!isPeriodMode && (
        <>
          {/* Aforo Actual Widget */}
          <div className="glass-panel" style={{ padding: '18px', background: '#ffffff', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                <circle 
                  cx="50" cy="50" r="40" 
                  fill="none" 
                  stroke={isOverCapacity ? '#ef4444' : 'var(--urp-green-primary)'} 
                  strokeWidth="12" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * occupancyPercent) / 100}
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease' }}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: isOverCapacity ? '#ef4444' : 'var(--text-main)', lineHeight: 1 }}>
                  {currentOccupancy}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ {maxCapacity}</span>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Users size={16} color="var(--urp-green-primary)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Aforo Actual</h3>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0 0 8px 0', lineHeight: 1.2 }}>
                Capacidad real
              </p>
              {isOverCapacity ? (
                <span style={{ background: '#fef2f2', color: '#ef4444', padding: '3px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700 }}>
                  Sobrecarga: {currentOccupancy - maxCapacity}
                </span>
              ) : (
                <span style={{ background: '#f0fdf4', color: '#15803d', padding: '3px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 700 }}>
                  {maxCapacity - currentOccupancy} libres
                </span>
              )}
            </div>
          </div>

          {/* Total Visits of the selected Date */}
          <div className="glass-panel" style={{ padding: '18px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
                <Activity size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>Total Asistencias</h3>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{formattedDateLabel ? `del ${formattedDateLabel}` : 'de hoy'}</p>
              </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1 }}>
              {selectedDateVisitsCount ?? summary?.totalVisitsToday ?? 0}
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '6px' }}>registros</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
