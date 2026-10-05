import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, LabelList } from 'recharts';
import { Calendar, Trophy, BookOpen, Inbox, Building2, Clock, Users, BarChart2, PieChart as PieChartIcon } from 'lucide-react';
import { AnalyticsSummary, AttendanceRecord } from '../../services/api';
import { getISOWeekFromDateStr, formatMonthLabel, formatWeekLabel, getRecordDateStr } from '../../utils/dateUtils';
import { exportHistoricoReportPDF, exportHistoricoReportExcel } from '../../utils/exportReports';

interface TabHistoricoProps {
  summary: AnalyticsSummary;
  records?: AttendanceRecord[];
  filterType?: string; // 'week', 'month', 'year', 'all'
  filterValue?: string; // e.g. "2026-W38" or "2026-09" or "2026"
  filteredRecords?: AttendanceRecord[];
}

const BAR_COLORS = ['#0f5142', '#0284c7', '#b45309', '#7c3aed', '#e11d48', '#059669'];

/**
 * Resuelve el índice del día de la semana (1 = Lunes, ..., 6 = Sábado, 7 = Domingo)
 * garantizando que NINGÚN registro sea omitido, sin importar formato o zona horaria.
 */
const getRecordDayIndex = (r: AttendanceRecord): number => {
  if (typeof r.dayOfWeekNumber === 'number' && r.dayOfWeekNumber >= 1 && r.dayOfWeekNumber <= 7) {
    return r.dayOfWeekNumber;
  }
  if (r.dayOfWeek) {
    const clean = r.dayOfWeek.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (clean.startsWith('lun')) return 1;
    if (clean.startsWith('mar')) return 2;
    if (clean.startsWith('mie')) return 3;
    if (clean.startsWith('jue')) return 4;
    if (clean.startsWith('vie')) return 5;
    if (clean.startsWith('sab')) return 6;
    if (clean.startsWith('dom')) return 7;
  }
  const dateStr = getRecordDateStr(r);
  if (dateStr) {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3) {
      const jsDay = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getDay();
      return jsDay === 0 ? 7 : jsDay;
    }
  }
  if (r.timestamp) {
    const d = new Date(r.timestamp);
    if (!isNaN(d.getTime())) {
      const jsDay = d.getDay();
      return jsDay === 0 ? 7 : jsDay;
    }
  }
  return -1;
};

/**
 * Extrae o calcula con precisión los minutos de permanencia de un registro
 */
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
    const dateStr = getRecordDateStr(r);
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

const formatMinutesDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${m} min`;
};

const CustomTemporalTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const titleLabel = data.fullDate 
      ? `${data.dayName} ${data.fullDate}` 
      : (data.fullLabel || data.day);
    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '10px',
        padding: '12px 16px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        minWidth: '220px'
      }}>
        <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '4px' }}>
          {titleLabel}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={13} style={{ color: '#0f5142' }} />
              <span>Total Asistencias:</span>
            </span>
            <span style={{ fontWeight: 700, color: '#0f5142' }}>{data.count} {data.count === 1 ? 'visita' : 'visitas'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={13} style={{ color: '#b45309' }} />
              <span>Tiempo de Permanencia:</span>
            </span>
            <span style={{ fontWeight: 700, color: '#b45309' }}>{data.formattedTime} ({Number(data.totalMinutes).toLocaleString()} min)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px dashed #f1f5f9' }}>
            <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={13} style={{ color: '#64748b' }} />
              <span>Promedio por Visita:</span>
            </span>
            <span style={{ fontWeight: 600, color: '#334155' }}>{data.formattedAvg}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomTemporalBarLabel = (props: any, mode: 'visits' | 'minutes', isMonthly: boolean, maxVal: number) => {
  const { x, y, width, payload } = props;
  if (isNaN(Number(x)) || isNaN(Number(y))) return null;
  const val = mode === 'visits' ? payload?.count : payload?.totalMinutes;
  if (!val || val <= 0) return null;

  // En vista mensual con 31 días, solo mostrar etiqueta en los picos para evitar colisión de texto
  if (isMonthly && val !== maxVal) return null;

  const labelText = mode === 'visits' 
    ? `${payload.count}`
    : payload.formattedTime;

  return (
    <text
      x={Number(x) + Number(width) / 2}
      y={Number(y) - 6}
      fill="#334155"
      textAnchor="middle"
      fontSize={isMonthly ? 9 : 10}
      fontWeight={700}
    >
      {labelText}
    </text>
  );
};

export const TabHistorico: React.FC<TabHistoricoProps> = ({ 
  summary, 
  records, 
  filterType = 'week', 
  filterValue = '',
  filteredRecords: propFilteredRecords 
}) => {
  // Mode switcher for Day of Week chart: 'visits' or 'minutes'
  const [dayMetricMode, setDayMetricMode] = useState<'visits' | 'minutes'>('visits');

  // Use passed filteredRecords or compute them cleanly using string-based date parsing
  const effectiveRecords = useMemo(() => {
    if (propFilteredRecords !== undefined) return propFilteredRecords;
    if (!records || filterType === 'all') return records || [];

    return records.filter(r => {
      const dateStr = getRecordDateStr(r);
      if (!dateStr) return false;

      if (filterType === 'year') {
        return dateStr.slice(0, 4) === filterValue;
      }
      if (filterType === 'month') {
        return dateStr.slice(0, 7) === filterValue;
      }
      if (filterType === 'week') {
        return getISOWeekFromDateStr(dateStr) === filterValue;
      }
      return true;
    });
  }, [records, filterType, filterValue, propFilteredRecords]);

  // Dynamic period text for chart subtitles
  const periodDescription = useMemo(() => {
    if (filterType === 'week') {
      return `la ${formatWeekLabel(filterValue || '')}`;
    }
    if (filterType === 'month') {
      return `el mes de ${formatMonthLabel(filterValue || '')}`;
    }
    if (filterType === 'year') {
      return `el año ${filterValue || ''}`;
    }
    return 'todo el histórico registrado';
  }, [filterType, filterValue]);

  // Compute Peak Days (Visits and Total Minutes Used)
  const peakDaysData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) {
      return [
        { day: 'Lunes', count: 0, totalMinutes: 0, formattedTime: '0 min', avgMinutes: 0, formattedAvg: '0 min' },
        { day: 'Martes', count: 0, totalMinutes: 0, formattedTime: '0 min', avgMinutes: 0, formattedAvg: '0 min' },
        { day: 'Miércoles', count: 0, totalMinutes: 0, formattedTime: '0 min', avgMinutes: 0, formattedAvg: '0 min' },
        { day: 'Jueves', count: 0, totalMinutes: 0, formattedTime: '0 min', avgMinutes: 0, formattedAvg: '0 min' },
        { day: 'Viernes', count: 0, totalMinutes: 0, formattedTime: '0 min', avgMinutes: 0, formattedAvg: '0 min' },
        { day: 'Sábado', count: 0, totalMinutes: 0, formattedTime: '0 min', avgMinutes: 0, formattedAvg: '0 min' }
      ];
    }

    const daysMap: Record<number, { count: number; totalMinutes: number }> = {
      1: { count: 0, totalMinutes: 0 },
      2: { count: 0, totalMinutes: 0 },
      3: { count: 0, totalMinutes: 0 },
      4: { count: 0, totalMinutes: 0 },
      5: { count: 0, totalMinutes: 0 },
      6: { count: 0, totalMinutes: 0 },
      7: { count: 0, totalMinutes: 0 },
    };

    effectiveRecords.forEach(r => {
      const dayIdx = getRecordDayIndex(r);
      if (dayIdx >= 1 && dayIdx <= 7) {
        daysMap[dayIdx].count += 1;
        const mins = getRecordMinutes(r);
        daysMap[dayIdx].totalMinutes += mins;
      }
    });

    const dayDefs = [
      { dayNr: 1, name: 'Lunes' },
      { dayNr: 2, name: 'Martes' },
      { dayNr: 3, name: 'Miércoles' },
      { dayNr: 4, name: 'Jueves' },
      { dayNr: 5, name: 'Viernes' },
      { dayNr: 6, name: 'Sábado' },
    ];

    if (daysMap[7].count > 0 || daysMap[7].totalMinutes > 0) {
      dayDefs.push({ dayNr: 7, name: 'Domingo' });
    }

    return dayDefs.map(def => {
      const data = daysMap[def.dayNr];
      const count = data.count;
      const totalMinutes = data.totalMinutes;
      const avgMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;

      return {
        day: def.name,
        count,
        totalMinutes,
        formattedTime: formatMinutesDuration(totalMinutes),
        avgMinutes,
        formattedAvg: formatMinutesDuration(avgMinutes)
      };
    });
  }, [effectiveRecords]);

  // Compute Daily Trend for Month (1 to 28/29/30/31)
  const monthDaysData = useMemo(() => {
    if (filterType !== 'month' || !effectiveRecords) return [];

    let numDays = 31;
    let yearNum = new Date().getFullYear();
    let monthNum = new Date().getMonth() + 1;
    if (filterValue && filterValue.includes('-')) {
      const parts = filterValue.split('-').map(Number);
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        yearNum = parts[0];
        monthNum = parts[1];
        numDays = new Date(yearNum, monthNum, 0).getDate();
      }
    }

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthPrefix = `${yearNum}-${String(monthNum).padStart(2, '0')}`;

    const daysList = [];
    for (let d = 1; d <= numDays; d++) {
      const dayStr = String(d).padStart(2, '0');
      const fullDateStr = `${monthPrefix}-${dayStr}`;
      const dayDate = new Date(yearNum, monthNum - 1, d, 12, 0, 0);
      const dayName = dayNames[dayDate.getDay()];

      const dayRecords = effectiveRecords.filter(r => getRecordDateStr(r) === fullDateStr);
      const count = dayRecords.length;
      const totalMinutes = dayRecords.reduce((acc, r) => acc + getRecordMinutes(r), 0);
      const avgMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;

      daysList.push({
        day: `${d}`,
        fullDate: `${dayStr}/${String(monthNum).padStart(2, '0')}/${yearNum}`,
        dayName,
        count,
        totalMinutes,
        formattedTime: formatMinutesDuration(totalMinutes),
        avgMinutes,
        formattedAvg: formatMinutesDuration(avgMinutes)
      });
    }

    return daysList;
  }, [filterType, filterValue, effectiveRecords]);

  // Compute Monthly Trend for Year (Ene to Dic)
  const yearMonthsData = useMemo(() => {
    if (filterType !== 'year' || !effectiveRecords) return [];

    const yearStr = filterValue || String(new Date().getFullYear());
    const monthNames = [
      { num: 1, short: 'Ene', full: 'Enero' },
      { num: 2, short: 'Feb', full: 'Febrero' },
      { num: 3, short: 'Mar', full: 'Marzo' },
      { num: 4, short: 'Abr', full: 'Abril' },
      { num: 5, short: 'May', full: 'Mayo' },
      { num: 6, short: 'Jun', full: 'Junio' },
      { num: 7, short: 'Jul', full: 'Julio' },
      { num: 8, short: 'Ago', full: 'Agosto' },
      { num: 9, short: 'Set', full: 'Setiembre' },
      { num: 10, short: 'Oct', full: 'Octubre' },
      { num: 11, short: 'Nov', full: 'Noviembre' },
      { num: 12, short: 'Dic', full: 'Diciembre' },
    ];

    return monthNames.map(m => {
      const monthPrefix = `${yearStr}-${String(m.num).padStart(2, '0')}`;
      const monthRecords = effectiveRecords.filter(r => {
        const d = getRecordDateStr(r);
        return d && d.startsWith(monthPrefix);
      });
      const count = monthRecords.length;
      const totalMinutes = monthRecords.reduce((acc, r) => acc + getRecordMinutes(r), 0);
      const avgMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;

      return {
        day: m.short,
        fullLabel: `${m.full} ${yearStr}`,
        count,
        totalMinutes,
        formattedTime: formatMinutesDuration(totalMinutes),
        avgMinutes,
        formattedAvg: formatMinutesDuration(avgMinutes)
      };
    });
  }, [filterType, filterValue, effectiveRecords]);

  // Compute Yearly Trend for All Time (Histórico Completo)
  const allTimeData = useMemo(() => {
    if (filterType !== 'all' || !effectiveRecords) return [];

    const yearsMap: Record<string, { count: number; totalMinutes: number }> = {};
    effectiveRecords.forEach(r => {
      const dateStr = getRecordDateStr(r);
      const year = dateStr ? dateStr.slice(0, 4) : 'Desconocido';
      if (!yearsMap[year]) {
        yearsMap[year] = { count: 0, totalMinutes: 0 };
      }
      yearsMap[year].count++;
      yearsMap[year].totalMinutes += getRecordMinutes(r);
    });

    const sortedYears = Object.keys(yearsMap).sort();
    return sortedYears.map(yr => {
      const data = yearsMap[yr];
      const count = data.count;
      const totalMinutes = data.totalMinutes;
      const avgMinutes = count > 0 ? Math.round(totalMinutes / count) : 0;
      return {
        day: yr,
        fullLabel: `Año ${yr}`,
        count,
        totalMinutes,
        formattedTime: formatMinutesDuration(totalMinutes),
        avgMinutes,
        formattedAvg: formatMinutesDuration(avgMinutes)
      };
    });
  }, [filterType, effectiveRecords]);

  // Active Temporal Data depending on current filter
  const activeTemporalData = useMemo(() => {
    if (filterType === 'month') return monthDaysData;
    if (filterType === 'year') return yearMonthsData;
    if (filterType === 'all') return allTimeData.length > 0 ? allTimeData : peakDaysData;
    return peakDaysData;
  }, [filterType, monthDaysData, yearMonthsData, allTimeData, peakDaysData]);

  // Max value among the active temporal dataset for peak detection & highlight
  const maxTemporalValue = useMemo(() => {
    if (!activeTemporalData || activeTemporalData.length === 0) return 0;
    return Math.max(...activeTemporalData.map(d => dayMetricMode === 'visits' ? d.count : d.totalMinutes), 0);
  }, [activeTemporalData, dayMetricMode]);

  // Dynamic config for Card 1 header and bars
  const temporalChartConfig = useMemo(() => {
    if (filterType === 'month') {
      return {
        title: 'Tendencia Diaria de Visitas del Mes',
        subtitle: dayMetricMode === 'visits' 
          ? `Distribución del día 1 al ${monthDaysData.length} en ${periodDescription}`
          : `Permanencia total del día 1 al ${monthDaysData.length} en ${periodDescription}`,
        barSize: 16,
        labelInterval: 0
      };
    }
    if (filterType === 'year') {
      return {
        title: 'Tendencia Mensual de Visitas y Permanencia',
        subtitle: dayMetricMode === 'visits'
          ? `Distribución mensual de asistencias en ${periodDescription}`
          : `Distribución mensual de permanencia en ${periodDescription}`,
        barSize: 32,
        labelInterval: 0
      };
    }
    if (filterType === 'all') {
      return {
        title: 'Evolución Histórica de Visitas y Permanencia',
        subtitle: dayMetricMode === 'visits'
          ? `Distribución global de asistencias en ${periodDescription}`
          : `Distribución global de permanencia en ${periodDescription}`,
        barSize: 40,
        labelInterval: 0
      };
    }
    return {
      title: 'Días de la Semana con Más Visitas y Permanencia',
      subtitle: dayMetricMode === 'visits'
        ? `Suma total de asistencias según día en ${periodDescription}`
        : `Suma total de minutos de permanencia según día en ${periodDescription}`,
      barSize: 44,
      labelInterval: 0
    };
  }, [filterType, periodDescription, dayMetricMode, monthDaysData.length]);

  // Aggregate metrics for summary badge and peak indicators
  const totalPeriodVisits = useMemo(() => {
    return peakDaysData.reduce((acc, d) => acc + d.count, 0);
  }, [peakDaysData]);

  const totalPeriodMinutes = useMemo(() => {
    return peakDaysData.reduce((acc, d) => acc + d.totalMinutes, 0);
  }, [peakDaysData]);

  const totalPeriodHoursFormatted = useMemo(() => {
    return formatMinutesDuration(totalPeriodMinutes);
  }, [totalPeriodMinutes]);

  const peakVisitsDay = useMemo(() => {
    return [...peakDaysData].sort((a, b) => b.count - a.count)[0] || { day: '—', count: 0 };
  }, [peakDaysData]);

  const peakMinutesDay = useMemo(() => {
    return [...peakDaysData].sort((a, b) => b.totalMinutes - a.totalMinutes)[0] || { day: '—', totalMinutes: 0, formattedTime: '0 min' };
  }, [peakDaysData]);

  // Compute Top Students / Users
  const topStudentsData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) {
      return [];
    }
    const studentsMap: Record<string, any> = {};
    effectiveRecords.forEach(r => {
      const code = r.studentCode || r.studentId || r.studentName;
      if (!studentsMap[code]) {
        studentsMap[code] = { 
          fullName: r.studentName, 
          visitCount: 0,
          personType: r.personType || 'Alumno'
        };
      }
      studentsMap[code].visitCount++;
    });
    return Object.values(studentsMap)
      .sort((a, b) => b.visitCount - a.visitCount)
      .slice(0, 5);
  }, [effectiveRecords]);

  // Compute Reason Distribution
  const reasonDistributionData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) {
      return [];
    }
    const reasonMap: Record<string, number> = {};
    effectiveRecords.forEach(r => {
      const reason = r.visitReason || 'Lectura / Estudio';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    });
    const total = effectiveRecords.length;
    return Object.entries(reasonMap).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    })).sort((a, b) => b.count - a.count);
  }, [effectiveRecords]);

  // Compute Career / Program / Role Distribution dynamically based on effectiveRecords
  const careerDistributionData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) {
      return [];
    }
    const careerMap: Record<string, number> = {};
    effectiveRecords.forEach(r => {
      let groupName = r.career?.trim();
      const prog = ((r as any).program || '').trim();
      const pType = r.personType?.trim() || 'Alumno';

      if (prog && prog !== 'General' && (!groupName || groupName === 'General' || pType === 'Maestrando' || pType === 'Doctorando')) {
        groupName = prog;
      }
      if (!groupName || groupName === 'General' || groupName === 'Sin Carrera') {
        if (pType === 'Docente') groupName = 'Docentes';
        else if (pType === 'Visitante') groupName = 'Visitantes';
        else if (pType === 'Administrativo') groupName = 'Administrativos';
        else if (pType === 'Maestrando') groupName = prog || 'Maestrías (Posgrado)';
        else if (pType === 'Doctorando') groupName = prog || 'Doctorados (Posgrado)';
        else groupName = 'Comunidad General';
      }

      careerMap[groupName] = (careerMap[groupName] || 0) + 1;
    });

    const total = effectiveRecords.length;
    return Object.entries(careerMap).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }, [effectiveRecords]);

  const sortedCareerData = [...careerDistributionData].sort((a, b) => b.count - a.count);

  // Compute Person Type Distribution (Roles)
  const personTypeDistributionData = useMemo(() => {
    if (!effectiveRecords || effectiveRecords.length === 0) return [];
    const typeMap: Record<string, number> = {};
    effectiveRecords.forEach(r => {
      const pType = r.personType || 'Alumno';
      typeMap[pType] = (typeMap[pType] || 0) + 1;
    });

    const total = effectiveRecords.length;
    return Object.entries(typeMap).map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }, [effectiveRecords]);

  const sortedPersonTypeData = useMemo(() => {
    return [...personTypeDistributionData].sort((a, b) => b.count - a.count);
  }, [personTypeDistributionData]);

  const handleExportPDF = () => {
    exportHistoricoReportPDF(
      periodDescription,
      effectiveRecords,
      peakDaysData,
      topStudentsData,
      sortedCareerData,
      reasonDistributionData,
      summary
    );
  };

  const handleExportExcel = () => {
    exportHistoricoReportExcel(
      periodDescription,
      effectiveRecords,
      peakDaysData,
      topStudentsData,
      sortedCareerData,
      reasonDistributionData
    );
  };

  const isEmpty = effectiveRecords && effectiveRecords.length === 0 && records && records.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {isEmpty && (
        <div style={{ padding: '24px', background: '#fff5f5', color: '#e11d48', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #fecdd3' }}>
          <Inbox size={24} />
          <div>
            <h4 style={{ fontWeight: 700, margin: 0 }}>Sin registros en el período seleccionado</h4>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>No se encontraron asistencias en la fecha especificada. Intenta cambiar el filtro a un período anterior.</p>
          </div>
        </div>
      )}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(0, 1.8fr) minmax(380px, 1fr)', 
        gap: '16px', 
        alignItems: 'start' 
      }}>
        {/* Columna Izquierda: Gráfico Temporal + Ranking debajo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 1: Tendencia Temporal (Semanal / Mensual / Anual) */}
          <div className="glass-panel" style={{ padding: '18px 20px', background: '#ffffff' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '12px', 
              marginBottom: '14px',
              minHeight: '40px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                    {temporalChartConfig.title}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    {temporalChartConfig.subtitle}
                  </p>
                </div>
              </div>

              {/* Toggle Switcher: Visitas vs Minutos Usados */}
              <div style={{
                display: 'inline-flex',
                background: '#f1f5f9',
                padding: '3px',
                borderRadius: '8px',
                gap: '2px'
              }}>
                <button
                  type="button"
                  onClick={() => setDayMetricMode('visits')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: dayMetricMode === 'visits' ? '#ffffff' : 'transparent',
                    color: dayMetricMode === 'visits' ? '#0f5142' : '#64748b',
                    boxShadow: dayMetricMode === 'visits' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Users size={13} />
                  <span>Total Visitas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDayMetricMode('minutes')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: dayMetricMode === 'minutes' ? '#ffffff' : 'transparent',
                    color: dayMetricMode === 'minutes' ? '#b45309' : '#64748b',
                    boxShadow: dayMetricMode === 'minutes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Clock size={13} />
                  <span>Minutos Usados</span>
                </button>
              </div>
            </div>

            <div style={{ height: '245px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  key={`temporal-chart-${filterType}-${filterValue}-${dayMetricMode}`} 
                  data={activeTemporalData} 
                  margin={{ top: 18, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke="#64748b" 
                    fontSize={filterType === 'month' ? (monthDaysData.length > 28 ? 9 : 10) : 11} 
                    tickLine={false} 
                    axisLine={false} 
                    interval={temporalChartConfig.labelInterval}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    allowDecimals={false}
                    tickFormatter={(val) => {
                      if (dayMetricMode === 'visits') return `${val}`;
                      if (val >= 60) {
                        const h = Math.floor(val / 60);
                        const m = val % 60;
                        return m > 0 ? `${h}h${m}m` : `${h}h`;
                      }
                      return `${val}m`;
                    }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(15, 81, 66, 0.04)' }}
                    content={<CustomTemporalTooltip />}
                  />
                  <Bar 
                    dataKey={dayMetricMode === 'visits' ? 'count' : 'totalMinutes'} 
                    radius={[5, 5, 0, 0]}
                    maxBarSize={temporalChartConfig.barSize}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    <LabelList 
                      content={(props: any) => renderCustomTemporalBarLabel(props, dayMetricMode, filterType === 'month', maxTemporalValue)} 
                    />
                    {activeTemporalData.map((entry, index) => {
                      const val = dayMetricMode === 'visits' ? entry.count : entry.totalMinutes;
                      const isPeak = maxTemporalValue > 0 && val === maxTemporalValue;
                      return (
                        <Cell 
                          key={`cell-temp-${index}`} 
                          fill={isPeak ? '#b45309' : '#0f5142'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Card 2: Ranking de Usuarios Asiduos (debajo de Card 1) */}
          <div className="glass-panel" style={{ padding: '18px 20px 14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', minHeight: '40px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                <Trophy size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Ranking de Usuarios Asiduos
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Usuarios con mayor cantidad de visitas en {periodDescription}</p>
              </div>
            </div>

            <div style={{ height: '275px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  key={`top-students-chart-${filterType}-${filterValue}`}
                  data={topStudentsData} 
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="fullName" stroke="#64748b" fontSize={11} width={100} tickFormatter={(val) => val.split(' ')[0] + ' ' + (val.split(' ')[1] ? val.split(' ')[1].charAt(0) + '.' : '')} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }}
                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                    formatter={(val: any) => [`${val} visitas`, 'Total']}
                  />
                  <Bar 
                    dataKey="visitCount" 
                    radius={[0, 6, 6, 0]} 
                    barSize={24}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {topStudentsData.map((_, index) => {
                      const solidColors = ['#b45309', '#475569', '#0f5142', '#64748b', '#94a3b8'];
                      return (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={solidColors[index] || '#94a3b8'} 
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Ambos gráficos circulares como en Inicio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 3: Afluencia por Tipo de Usuario */}
          <div className="glass-panel" style={{ padding: '18px 20px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', minHeight: '40px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-green-light)', color: 'var(--urp-green-primary)' }}>
                <PieChartIcon size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Afluencia por Tipo de Usuario
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Distribución de usuarios según su rol en {periodDescription}
                </p>
              </div>
            </div>

            {sortedPersonTypeData.length === 0 ? (
              <div style={{ height: '245px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '0.9rem', gap: '8px' }}>
                <PieChartIcon size={32} style={{ opacity: 0.3 }} />
                <span>No hay registros para este período.</span>
              </div>
            ) : (
              <div style={{ height: '245px', width: '100%', display: 'flex', alignItems: 'center' }}>
                {/* Pie Chart */}
                <div style={{ flex: '0 0 55%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={`roles-pie-chart-${filterType}-${filterValue}`}>
                      <Pie
                        data={sortedPersonTypeData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={82}
                        innerRadius={46}
                        paddingAngle={3}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {sortedPersonTypeData.map((_, index) => (
                          <Cell key={`cell-role-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                        formatter={(val: any) => [`${val} asistencias`, 'Total']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend - sorted descending */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px' }}>
                  {sortedPersonTypeData.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: BAR_COLORS[index % BAR_COLORS.length]
                      }} />
                      <span style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.3 }}>
                        {item.name} <strong style={{ color: 'var(--text-main)' }}>({item.count})</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Afluencia por Programa Académico */}
          <div className="glass-panel" style={{ padding: '18px 20px 14px', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', minHeight: '40px' }}>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--urp-gold-light)', color: 'var(--urp-gold-primary)' }}>
                <Building2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                  Afluencia por Programa Académico
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Distribución de usuarios según programa académico o rol en {periodDescription}
                </p>
              </div>
            </div>

            {sortedCareerData.length === 0 ? (
              <div style={{ height: '275px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-subtle)', fontSize: '0.9rem', gap: '8px' }}>
                <Building2 size={32} style={{ opacity: 0.3 }} />
                <span>No hay registros de carreras para este período.</span>
              </div>
            ) : (
              <div style={{ height: '275px', width: '100%', display: 'flex', alignItems: 'center' }}>
                {/* Pie Chart */}
                <div style={{ flex: '0 0 55%', height: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart key={`career-pie-chart-${filterType}-${filterValue}`}>
                      <Pie
                        data={sortedCareerData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={88}
                        innerRadius={50}
                        paddingAngle={3}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {sortedCareerData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend - sorted descending */}
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', maxHeight: '260px', overflowY: 'auto' }}>
                  {sortedCareerData.map((item, index) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: BAR_COLORS[index % BAR_COLORS.length]
                      }} />
                      <span style={{ fontSize: '11.5px', color: '#64748b', lineHeight: 1.3 }}>
                        {item.name} <strong style={{ color: 'var(--text-main)' }}>({item.count})</strong>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
