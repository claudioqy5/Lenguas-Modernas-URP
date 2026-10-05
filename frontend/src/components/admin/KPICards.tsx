import React from 'react';
import { Users, Clock, Calendar, UserCheck } from 'lucide-react';
import { AnalyticsSummary, AttendanceRecord } from '../../services/api';

interface KPICardsProps {
  summary: AnalyticsSummary | null;
  studentsCount: number;
  totalUsersCount?: number;
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
  totalUsersCount,
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

  // Extrae o calcula con precisión los minutos de permanencia de un registro
  const getRecordMinutes = (r: AttendanceRecord): number => {
    if (typeof r.durationMinutes === 'number' && r.durationMinutes > 0) {
      return r.durationMinutes;
    }
    if (r.checkOutTimestamp || r.checkOutTimeString) {
      const entryDate = r.timestamp 
        ? new Date(r.timestamp) 
        : (r.dateString && r.timeString ? new Date(`${r.dateString}T${r.timeString}`) : null);
      const exitDate = r.checkOutTimestamp 
        ? new Date(r.checkOutTimestamp) 
        : (r.dateString && r.checkOutTimeString ? new Date(`${r.dateString}T${r.checkOutTimeString}`) : null);

      if (entryDate && exitDate && !isNaN(entryDate.getTime()) && !isNaN(exitDate.getTime())) {
        const diffMs = exitDate.getTime() - entryDate.getTime();
        if (diffMs > 0) {
          return Math.max(1, Math.round(diffMs / 60000));
        }
      }
    }
    if (r.isActive) {
      const dateStr = r.dateString || (r.timestamp ? new Date(r.timestamp).toISOString().slice(0, 10) : '');
      const todayStr = new Date().toISOString().slice(0, 10);
      if (dateStr === todayStr) {
        const entryDate = r.timestamp 
          ? new Date(r.timestamp) 
          : (r.dateString && r.timeString ? new Date(`${r.dateString}T${r.timeString}`) : null);
        if (entryDate && !isNaN(entryDate.getTime())) {
          const diffMs = Date.now() - entryDate.getTime();
          if (diffMs > 0) {
            return Math.min(480, Math.max(1, Math.floor(diffMs / 60000)));
          }
        }
      }
    }
    return 0;
  };

  // Calculate Total Duration
  const totalDurationMinutes = React.useMemo(() => {
    if (!records || records.length === 0) return 0;
    return records.reduce((acc, r) => acc + getRecordMinutes(r), 0);
  }, [records]);

  // Format the duration string
  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return '0 min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${m} min`;
  };

  const totalDurationStr = formatDuration(totalDurationMinutes);

  // Calculate unique users count for the selected records/day or period
  const uniqueUsersCount = React.useMemo(() => {
    if (periodType && typeof periodUniqueStudentsCount === 'number') {
      return periodUniqueStudentsCount;
    }
    if (!records || records.length === 0) return 0;
    const uniqueKeys = new Set(
      records.map(r => (r.studentCode?.trim() || r.studentId?.trim() || r.studentName?.trim() || '')).filter(Boolean)
    );
    return uniqueKeys.size;
  }, [records, periodType, periodUniqueStudentsCount]);

  // Determine Card 4 (Tiempo Total) Title & Subtitle based on mode
  const isPeriodMode = Boolean(periodType);
  let card4Title = 'Tiempo Total de Estadía';
  let card4Subtitle = 'Suma total de permanencia';

  if (periodType) {
    if (periodType === 'week') {
      card4Title = 'Tiempo Total de la Semana';
      card4Subtitle = periodLabel ? `${periodLabel}` : 'Total de la semana';
    } else if (periodType === 'month') {
      card4Title = 'Tiempo Total del Mes';
      card4Subtitle = periodLabel ? `${periodLabel}` : 'Total del mes';
    } else if (periodType === 'year') {
      card4Title = 'Tiempo Total del Año';
      card4Subtitle = periodLabel ? `Año ${periodLabel}` : 'Total del año';
    } else {
      card4Title = 'Tiempo Total Histórico';
      card4Subtitle = 'Historial acumulado completo';
    }
  } else if (formattedDateLabel) {
    card4Title = 'Tiempo Total del Día';
    card4Subtitle = `Reporte del ${formattedDateLabel}`;
  }

  const currentOccupancy = summary?.currentOccupancy || 0;
  const maxCapacity = summary?.maxCapacity || 50;
  const occupancyPercent = Math.min(Math.round((currentOccupancy / maxCapacity) * 100), 100);
  const isOverCapacity = currentOccupancy > maxCapacity;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isPeriodMode ? 'repeat(auto-fit, minmax(220px, 1fr))' : 'repeat(5, 1fr)', gap: '12px', marginBottom: '16px' }}>
      {/* 1. Usuarios Registrados */}
      <div className="glass-panel" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Usuarios Registrados
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px', lineHeight: 1.1 }}>
              {totalUsersCount ?? (summary?.totalRegisteredStudents ?? studentsCount)}
            </div>
          </div>
          <div style={{ padding: '7px', borderRadius: '8px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={17} />
          </div>
        </div>
      </div>

      {/* 2. Asistencias del Día / Período */}
      <div className="glass-panel" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {card2Title}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--urp-green-primary)', marginTop: '2px', lineHeight: 1.1 }}>
              {card2Value}
            </div>
          </div>
          <div style={{ padding: '7px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={17} />
          </div>
        </div>
      </div>

      {/* 3. Usuarios Únicos */}
      <div className="glass-panel" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Usuarios Únicos
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-purple)', marginTop: '2px', lineHeight: 1.1 }}>
              {uniqueUsersCount}
            </div>
          </div>
          <div style={{ padding: '7px', borderRadius: '8px', background: '#f5f3ff', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={17} />
          </div>
        </div>
      </div>

      {/* 4. Tiempo Total de Estadía */}
      <div className="glass-panel" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {card4Title}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--urp-gold-primary)', marginTop: '2px', lineHeight: 1.1 }}>
              {totalDurationStr}
            </div>
          </div>
          <div style={{ padding: '7px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={17} />
          </div>
        </div>
      </div>

      {!isPeriodMode && (
        /* 5. Aforo Actual */
        <div className="glass-panel" style={{ padding: '12px 16px', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Aforo Actual
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: isOverCapacity ? '#ef4444' : 'var(--urp-green-primary)', marginTop: '2px', lineHeight: 1.1 }}>
                {currentOccupancy} <span style={{ fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ {maxCapacity}</span>
              </div>
            </div>
            <div style={{ padding: '7px', borderRadius: '8px', background: isOverCapacity ? '#fef2f2' : 'var(--urp-green-light)', color: isOverCapacity ? '#ef4444' : 'var(--urp-green-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={17} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
