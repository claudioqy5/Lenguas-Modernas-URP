import React from 'react';
import { Users, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { OccupancyData } from '../services/api';

interface OccupancyMonitorProps {
  occupancy: OccupancyData;
}

export const OccupancyMonitor: React.FC<OccupancyMonitorProps> = ({ occupancy }) => {
  const { currentOccupancy, maxCapacity, occupancyPercentage } = occupancy;

  // Determine state
  let statusColor = '#059669'; // Emerald
  let statusBg = '#ecfdf5';
  let statusText = 'Aforo Óptimo (Espacio Disponible)';
  let StatusIcon = CheckCircle2;

  if (occupancyPercentage >= 90) {
    statusColor = '#dc2626'; // Red
    statusBg = '#fef2f2';
    statusText = 'Aforo Casi Completo';
    StatusIcon = ShieldAlert;
  } else if (occupancyPercentage >= 65) {
    statusColor = '#d97706'; // Amber
    statusBg = '#fffbeb';
    statusText = 'Afluencia Moderada / Alta';
    StatusIcon = AlertCircle;
  }

  return (
    <div 
      className="glass-panel" 
      style={{ 
        padding: '20px 24px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '12px',
        borderLeft: `4px solid ${statusColor}`,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div 
            style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '10px', 
              background: statusBg, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: statusColor
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Monitor de Aforo en Vivo
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: statusColor, fontWeight: 700 }}>
              <StatusIcon size={15} />
              <span>{statusText}</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)' }}>{currentOccupancy}</span>
          <span style={{ fontSize: '0.95rem', color: 'var(--text-subtle)', fontWeight: 600 }}> / {maxCapacity}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
        <div 
          style={{ 
            width: `${Math.min(occupancyPercentage, 100)}%`, 
            height: '100%', 
            background: `linear-gradient(90deg, #059669 0%, ${statusColor} 100%)`, 
            borderRadius: '999px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }} 
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
        <span>Capacidad de Sala: <strong>{maxCapacity}</strong> puestos de estudio</span>
        <span style={{ fontWeight: 700, color: statusColor }}>{occupancyPercentage}% ocupado</span>
      </div>
    </div>
  );
};
