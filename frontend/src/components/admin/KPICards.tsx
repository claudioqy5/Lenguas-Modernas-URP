import React from 'react';
import { Users, Clock, Calendar } from 'lucide-react';
import { AnalyticsSummary } from '../../services/api';

interface KPICardsProps {
  summary: AnalyticsSummary | null;
  studentsCount: number;
  selectedDate?: string;
  selectedDateVisitsCount?: number;
}

export const KPICards: React.FC<KPICardsProps> = ({ 
  summary, 
  studentsCount,
  selectedDate,
  selectedDateVisitsCount 
}) => {
  // Format selected date YYYY-MM-DD -> DD/MM/YYYY
  const formattedDateLabel = selectedDate ? (() => {
    const parts = selectedDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return selectedDate;
  })() : null;

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
          Facultad de Humanidades y Lenguas Modernas
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              {formattedDateLabel ? `Asistencias del Día (${formattedDateLabel})` : 'Asistencias de Hoy'}
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--urp-green-primary)', marginTop: '4px' }}>
              {selectedDateVisitsCount ?? summary?.totalVisitsToday ?? 0}
            </div>
          </div>
          <div style={{ padding: '10px', borderRadius: '12px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
            <Clock size={22} />
          </div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--urp-green-primary)', fontWeight: 600, marginTop: '8px' }}>
          {formattedDateLabel ? `Reporte Diario (${formattedDateLabel})` : 'Permite múltiples reingresos al día'}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '22px', background: '#ffffff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase' }}>
              Asistencias del Mes
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--urp-gold-primary)', marginTop: '4px' }}>
              {summary?.totalVisitsThisMonth ?? 0}
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
    </div>
  );
};
