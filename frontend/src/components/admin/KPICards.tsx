import React from 'react';
import { Users, Clock, Calendar } from 'lucide-react';
import { AnalyticsSummary } from '../../services/api';

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
}

export const KPICards: React.FC<KPICardsProps> = ({ 
  summary, 
  studentsCount,
  selectedDate,
  selectedDateVisitsCount,
  periodType,
  periodLabel,
  periodVisitsCount,
  periodUniqueStudentsCount
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

  // Determine Card 3 Title & Subtitle based on mode
  const isPeriodMode = Boolean(periodType);
  const card3Title = isPeriodMode ? 'Alumnos en el Período' : 'Asistencias del Mes';
  const card3Value = isPeriodMode ? (periodUniqueStudentsCount ?? 0) : (summary?.totalVisitsThisMonth ?? 0);
  const card3Subtitle = isPeriodMode ? 'Estudiantes únicos que asistieron' : 'Afluencia total acumulada';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
      <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              Alumnos Registrados
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '4px' }}>
              {summary?.totalRegisteredStudents ?? studentsCount}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--accent-blue-light)', color: 'var(--accent-blue)' }}>
            <Users size={22} />
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontWeight: 600, marginTop: '8px' }}>
          Comunidad Universitaria URP
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              {card2Title}
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--urp-green-primary)', marginTop: '4px' }}>
              {card2Value}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
            <Clock size={22} />
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--urp-green-primary)', fontWeight: 600, marginTop: '8px' }}>
          {card2Subtitle}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              {card3Title}
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--urp-gold-primary)', marginTop: '4px' }}>
              {card3Value}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
            <Calendar size={22} />
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--urp-gold-primary)', fontWeight: 600, marginTop: '8px' }}>
          {card3Subtitle}
        </div>
      </div>
    </div>
  );
};
