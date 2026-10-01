/**
 * Date and Week utilities for the attendance analytics dashboard.
 * Designed to avoid timezone shifts and DST issues by operating on date strings and local noon.
 */

export const getISOWeekFromDateStr = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const target = new Date(y, m - 1, d, 12, 0, 0);
  target.setDate(target.getDate() + 3 - (target.getDay() + 6) % 7);
  const week1 = new Date(target.getFullYear(), 0, 4);
  const week = 1 + Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `${target.getFullYear()}-W${week.toString().padStart(2, '0')}`;
};

export const getTodayDateStr = (): string => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
};

export const getCurrentWeek = (): string => {
  const todayStr = getTodayDateStr();
  return getISOWeekFromDateStr(todayStr);
};

export const getCurrentMonth = (): string => {
  return getTodayDateStr().slice(0, 7);
};

/**
 * Safely extracts the official Peru date string (YYYY-MM-DD) from an AttendanceRecord.
 * Prioritizes r.dateString (generated on VPS in Peru time).
 * Fallback to r.timestamp properly converted to America/Lima.
 */
export const getRecordDateStr = (r: { dateString?: string; timestamp?: string }): string => {
  if (r.dateString && r.dateString.trim()) {
    return r.dateString.trim();
  }
  if (r.timestamp) {
    try {
      const date = new Date(r.timestamp);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(date);
      }
    } catch {
      return r.timestamp.split('T')[0] || '';
    }
  }
  return '';
};

/**
 * Safely extracts the Peru hour of the day (0-23) from an AttendanceRecord.
 */
export const getRecordHour = (r: { hourOfDay?: number; timeString?: string; timestamp?: string }): number => {
  if (r.hourOfDay !== undefined && r.hourOfDay !== null && !isNaN(r.hourOfDay)) {
    return r.hourOfDay;
  }
  if (r.timeString && r.timeString.includes(':')) {
    const h = parseInt(r.timeString.split(':')[0], 10);
    if (!isNaN(h)) return h;
  }
  if (r.timestamp) {
    try {
      const date = new Date(r.timestamp);
      if (!isNaN(date.getTime())) {
        const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }).format(date);
        const parsed = parseInt(hourStr, 10);
        return parsed === 24 ? 0 : parsed;
      }
    } catch {}
  }
  return 0;
};

export const formatMonthLabel = (monthStr: string): string => {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length !== 2) return monthStr;
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const mIndex = parseInt(parts[1], 10) - 1;
  return `${monthNames[mIndex] || parts[1]} ${parts[0]}`;
};

export const formatWeekLabel = (weekStr: string): string => {
  if (!weekStr) return '';
  const parts = weekStr.split('-W');
  if (parts.length !== 2) return weekStr;
  return `Semana ${parseInt(parts[1], 10)}, ${parts[0]}`;
};

/**
 * Converts a YYYY-MM-DD date string to DD/MM/YYYY for display.
 * E.g. "2026-10-01" → "01/10/2026"
 */
export const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};
