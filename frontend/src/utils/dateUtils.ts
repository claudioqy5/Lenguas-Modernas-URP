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
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getCurrentWeek = (): string => {
  const todayStr = getTodayDateStr();
  return getISOWeekFromDateStr(todayStr);
};

export const getCurrentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
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
