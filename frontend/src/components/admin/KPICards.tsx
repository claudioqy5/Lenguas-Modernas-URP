import React from 'react';
import { Users, Clock, Calendar, UserCheck } from 'lucide-react';
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

  // Calculate unique users count for the selected records/day
  const uniqueUsersCount = React.useMemo(() => {
    if (!records || records.length === 0) return 0;
    const uniqueKeys = new Set(
      records.map(r => (r.studentCode?.trim() || r.studentId?.trim() || r.studentName?.trim() || '')).filter(Boolean)
    );
    return uniqueKeys.size;
  }, [records]);

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
          <div className="glass-panel" style={{ padding: '18px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Aforo Actual
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: isOverCapacity ? '#ef4444' : 'var(--urp-green-primary)', marginTop: '4px' }}>
                  {currentOccupancy} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {maxCapacity}</span>
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: isOverCapacity ? '#fef2f2' : 'var(--urp-green-light)', color: isOverCapacity ? '#ef4444' : 'var(--urp-green-primary)' }}>
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: isOverCapacity ? '#ef4444' : 'var(--urp-green-primary)', fontWeight: 600, marginTop: '8px' }}>
              {isOverCapacity ? `Sobrecarga: ${currentOccupancy - maxCapacity}` : `${maxCapacity - currentOccupancy} libres`}
            </div>
          </div>

          {/* Unique Users of the selected Date */}
          <div className="glass-panel" style={{ padding: '18px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Usuarios Únicos
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '4px' }}>
                  {uniqueUsersCount}
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '10px', background: '#f5f3ff', color: 'var(--accent-purple)' }}>
                <UserCheck size={18} />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: 600, marginTop: '8px' }}>
              {formattedDateLabel ? `Sin reingresos (${formattedDateLabel})` : 'Sin contar reingresos'}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
