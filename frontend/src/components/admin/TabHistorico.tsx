import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Calendar, Trophy, BookOpen } from 'lucide-react';
import { AnalyticsSummary } from '../../services/api';

interface TabHistoricoProps {
  summary: AnalyticsSummary;
}

const BAR_COLORS = ['#0f5142', '#0284c7', '#b45309', '#7c3aed', '#e11d48', '#059669'];

export const TabHistorico: React.FC<TabHistoricoProps> = ({ summary }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>

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
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Alumnos con mayor cantidad de ingresos a la biblioteca San Jerónimo</p>
            </div>
          </div>

          <div style={{ height: '300px', width: '100%', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={summary.topStudents.slice(0, 5)} 
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="fullName" stroke="#64748b" fontSize={11} width={100} tickFormatter={(val) => val.split(' ')[0] + ' ' + (val.split(' ')[1] ? val.split(' ')[1].charAt(0) + '.' : '')} />
                <Tooltip 
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  formatter={(val: any) => [`${val} visitas`, 'Total']}
                />
                <Bar dataKey="visitCount" radius={[0, 6, 6, 0]} barSize={24}>
                  {summary.topStudents.slice(0, 5).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#b45309' : index === 1 ? '#475569' : index === 2 ? '#0f5142' : '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Top Students Ranking & Reason Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '24px' }}>


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
  );
};
