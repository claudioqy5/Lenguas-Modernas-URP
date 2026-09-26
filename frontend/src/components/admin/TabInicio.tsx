import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Legend, Cell } from 'recharts';
import { Clock, Building2 } from 'lucide-react';
import { AnalyticsSummary } from '../../services/api';

interface TabInicioProps {
  summary: AnalyticsSummary;
}

const BAR_COLORS = ['#0f5142', '#0284c7', '#b45309', '#7c3aed', '#e11d48', '#059669'];

export const TabInicio: React.FC<TabInicioProps> = ({ summary }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Distribución de estudiantes por franja horaria (8am a 9pm)</p>
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

        {/* Career Distribution (Pie Chart) */}
        <div className="glass-panel" style={{ padding: '24px', background: '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Afluencia por Carrera (Ingresos de Hoy)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Distribución de estudiantes según su facultad/carrera</p>
            </div>
          </div>

          <div style={{ height: '270px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.careerDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {summary.careerDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
