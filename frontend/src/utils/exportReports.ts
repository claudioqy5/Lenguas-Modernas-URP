import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { AttendanceRecord, Student, AnalyticsSummary, LibraryPerson } from '../services/api';
import { getRecordDateStr, getRecordHour, getTodayDateStr } from './dateUtils';

/**
 * Exporta el reporte diario específico (asistencias, horas pico y carreras del día seleccionado) a PDF
 */
export function exportDailyReportPDF(
  dateLabel: string,
  records: AttendanceRecord[],
  peakHoursData: { hour: number; label: string; count: number }[],
  careerData: { name: string; count: number; percentage: number }[],
  summary?: AnalyticsSummary | null
) {
  const doc = new jsPDF();

  // Encabezado institucional URP Verde
  doc.setFillColor(15, 81, 66);
  doc.rect(0, 0, 210, 28, 'F');

  // Línea dorada institucional
  doc.setFillColor(180, 83, 9);
  doc.rect(0, 28, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD RICARDO PALMA', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo', 14, 17);
  doc.text(`Fecha y hora de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 14, 23);

  // Título del reporte
  doc.setTextColor(15, 81, 66);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('REPORTE DIARIO DE ASISTENCIAS Y AFLUENCIA', 14, 38);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha analizada: ${dateLabel}`, 14, 44);

  // Estadísticas del día
  const totalVisits = records.length;
  const uniqueStudents = new Set(records.map(r => r.studentCode)).size;

  let peakHourStr = 'Sin afluencia';
  let maxCount = 0;
  peakHoursData.forEach(h => {
    if (h.count > maxCount) {
      maxCount = h.count;
      peakHourStr = `${h.label} (${h.count} asistencias)`;
    }
  });

  const topCareer = careerData.length > 0 ? `${careerData[0].name} (${careerData[0].count} asistencias)` : 'N/A';

  // Caja de métricas
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 47, 182, 17, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Asistencias: ', 18, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalVisits}`, 45, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Alumnos Únicos: ', 70, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${uniqueStudents}`, 94, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Horario Pico: ', 120, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${peakHourStr}`, 140, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Carrera con Mayor Afluencia: ', 18, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${topCareer}`, 58, 60);

  // Sección 1: Horarios Pico
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 81, 66);
  doc.text('Distribución por Franja Horaria (Horarios de Mayor Ingreso)', 14, 71);

  const hoursTableHead = peakHoursData.map(h => h.label);
  const hoursTableData = [peakHoursData.map(h => h.count.toString())];

  autoTable(doc, {
    startY: 74,
    head: [hoursTableHead],
    body: hoursTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      halign: 'center',
      cellPadding: 1.5
    },
    bodyStyles: {
      fontSize: 7.2,
      halign: 'center',
      cellPadding: 1.5,
      fontStyle: 'bold'
    },
    margin: { left: 14, right: 14 }
  });

  const lastY = (doc as any).lastAutoTable?.finalY || 88;

  // Sección 2: Detalle de Asistencias
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 81, 66);
  doc.text('Detalle de Asistencias del Día', 14, lastY + 8);

  const tableData = records.length === 0 ? [
    ['-', '-', '-', 'No se registraron asistencias en esta fecha.', '-', '-', '-']
  ] : records.map((r, i) => [
    (i + 1).toString(),
    r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
    r.studentCode,
    r.studentName,
    r.career,
    r.visitReason,
    r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
  ]);

  autoTable(doc, {
    startY: lastY + 11,
    head: [['#', 'Hora', 'Código', 'Estudiante', 'Carrera', 'Motivo', 'Método']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  const cleanDate = dateLabel.replace(/[\/\\]/g, '-');
  doc.save(`Reporte_Diario_URP_${cleanDate}.pdf`);
}

/**
 * Exporta el reporte diario específico a Excel (Multi-hoja con asistencias, horarios pico y carreras)
 */
export function exportDailyReportExcel(
  dateLabel: string,
  records: AttendanceRecord[],
  peakHoursData: { hour: number; label: string; count: number }[],
  careerData: { name: string; count: number; percentage: number }[]
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Asistencias del Día
  const attendanceRows = records.map((r, i) => ({
    'N°': i + 1,
    'Fecha': r.dateString || dateLabel,
    'Hora': r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
    'Código Estudiante': r.studentCode,
    'Estudiante': r.studentName,
    'Carrera': r.career,
    'Motivo de Visita': r.visitReason,
    'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
  }));

  const wsAttendance = XLSX.utils.json_to_sheet(
    attendanceRows.length > 0 ? attendanceRows : [{ 'Mensaje': `No se encontraron asistencias registradas para el ${dateLabel}` }]
  );
  wsAttendance['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 30 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Asistencias_Diarias');

  // Hoja 2: Horarios Pico
  const peakRows = peakHoursData.map(h => ({
    'Franja Horaria': h.label,
    'Cantidad de Asistencias': h.count
  }));
  const wsPeak = XLSX.utils.json_to_sheet(peakRows);
  wsPeak['!cols'] = [{ wch: 16 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsPeak, 'Horarios_Pico');

  // Hoja 3: Afluencia por Carrera
  const careerRows = careerData.map(c => ({
    'Carrera': c.name,
    'Total Asistencias': c.count,
    'Porcentaje (%)': `${c.percentage}%`
  }));
  const wsCareer = XLSX.utils.json_to_sheet(
    careerRows.length > 0 ? careerRows : [{ 'Carrera': 'Sin registros', 'Total Asistencias': 0, 'Porcentaje (%)': '0%' }]
  );
  wsCareer['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCareer, 'Afluencia_Carreras');

  const cleanDate = dateLabel.replace(/[\/\\]/g, '-');
  XLSX.writeFile(wb, `Reporte_Diario_URP_${cleanDate}.xlsx`);
}

/**
 * Resuelve el DNI y el Código institucional de una persona/alumno a partir del registro
 */
export function resolveAttendanceIdentifiers(
  r: AttendanceRecord,
  codeToPerson?: Map<string, LibraryPerson>,
  students?: Student[]
): { dni: string; code: string } {
  const cleanCode = (r.studentCode || '').trim();
  const cleanCodeLower = cleanCode.toLowerCase();
  const cleanNameLower = (r.studentName || '').trim().toLowerCase();

  let dni = '';
  let code = '';

  // 1. Buscar en LibraryPerson (vía codeToPerson)
  if (codeToPerson) {
    const p = codeToPerson.get(cleanCode) || codeToPerson.get(cleanCodeLower);
    if (p) {
      dni = (p.documentNumber || '').trim();
      code = (p.code || '').trim();
    }
  }

  // 2. Si falta alguno, buscar en el listado de Estudiantes
  if ((!dni || !code) && students && students.length > 0) {
    const s = students.find(item => 
      (item.studentCode && item.studentCode.trim().toLowerCase() === cleanCodeLower) ||
      (item.documentNumber && item.documentNumber.trim().toLowerCase() === cleanCodeLower) ||
      (cleanNameLower && item.fullName && item.fullName.trim().toLowerCase() === cleanNameLower)
    );
    if (s) {
      if (!dni) dni = (s.documentNumber || '').trim();
      if (!code) code = (s.studentCode || '').trim();
    }
  }

  // 3. Fallback inteligente si no se encontraron en catálogos
  if (!dni && !code && cleanCode) {
    const pType = r.personType || 'Alumno';
    if (pType === 'Docente' || pType === 'Visitante') {
      dni = cleanCode;
    } else {
      code = cleanCode;
    }
  }

  return {
    dni: dni || '-',
    code: code || '-'
  };
}

/**
 * Extrae y formatea los datos de fecha, entrada, salida, duración y estado para reportes
 */
export function getAttendanceEntryExit(r: AttendanceRecord) {
  const rawDate = r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—');
  let dateFormatted = rawDate;
  if (rawDate && rawDate.includes('-')) {
    const parts = rawDate.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  const entrada = r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—');
  const salida = r.isActive ? '—' : (r.checkOutTimeString || '—');

  let duracion = '—';
  if (r.isActive) {
    duracion = 'En curso';
  } else if (r.durationMinutes !== undefined && r.durationMinutes !== null) {
    duracion = r.durationMinutes < 60
      ? `${r.durationMinutes} min`
      : `${Math.floor(r.durationMinutes / 60)}h ${r.durationMinutes % 60}min`;
  }

  const isAutoClose = !r.isActive && (r.checkOutTimeString?.includes('cierre auto') ?? false);
  let estado = 'Ya se retiró';
  if (r.isActive || r.isActive === undefined) {
    estado = 'En sala';
  } else if (isAutoClose) {
    estado = 'Cierre auto';
  } else {
    estado = 'Ya se retiró';
  }

  return { dateFormatted, entrada, salida, duracion, estado };
}

export interface ExportInicioSectionParams {
  selectedDate?: string;
  records: AttendanceRecord[];
  summary?: AnalyticsSummary | null;
  students?: Student[];
  persons?: LibraryPerson[];
}

/**
 * Procesa y consolida las métricas de la sección Inicio para los reportes diarios
 */
export function computeInicioStats({
  selectedDate,
  records,
  students,
  persons
}: ExportInicioSectionParams) {
  const targetDateStr = selectedDate || getTodayDateStr();
  const parts = targetDateStr.split('-');
  const yStr = parts[0] || '';
  const mStr = parts[1] || '';
  const dStr = parts[2] || '';
  const dateFormatted = (dStr && mStr && yStr) ? `${dStr}/${mStr}/${yStr}` : targetDateStr;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  let spanishFullDate = dateFormatted;
  if (parts.length === 3) {
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    const dObj = new Date(y, m - 1, d, 12, 0, 0);
    if (!isNaN(dObj.getTime())) {
      spanishFullDate = `${dayNames[dObj.getDay()]}, ${d} de ${monthNames[m - 1]} de ${y}`;
    }
  }

  // Filtrar registros para la fecha objetivo
  const filteredRecords = (records || []).filter(r => getRecordDateStr(r) === targetDateStr);

  // Mapeo rápido de personas para resolución de DNI y Códigos
  const codeToPerson = new Map<string, LibraryPerson>();
  if (persons && persons.length > 0) {
    persons.forEach(p => {
      if (p.code) {
        codeToPerson.set(p.code.trim(), p);
        codeToPerson.set(p.code.trim().toLowerCase(), p);
      }
      if (p.documentNumber) {
        codeToPerson.set(p.documentNumber.trim(), p);
        codeToPerson.set(p.documentNumber.trim().toLowerCase(), p);
      }
    });
  }

  const totalVisits = filteredRecords.length;

  // Conteo de usuarios únicos
  const uniqueUsersSet = new Set<string>();
  filteredRecords.forEach(r => {
    const ids = resolveAttendanceIdentifiers(r, codeToPerson, students);
    const key = ids.code !== '-' ? ids.code : (ids.dni !== '-' ? ids.dni : r.studentName);
    if (key) uniqueUsersSet.add(key.trim().toLowerCase());
  });
  const uniqueUsers = uniqueUsersSet.size;

  // Usuarios actualmente activos en sala
  const activeNow = filteredRecords.filter(r => 
    r.isActive === true || (r.isActive === undefined && !r.checkOutTimestamp && !r.checkOutTimeString)
  ).length;

  // Tráfico por hora (08:00 a 22:00)
  const entriesMap: Record<number, number> = {};
  const exitsMap: Record<number, number> = {};
  for (let h = 8; h <= 22; h++) {
    entriesMap[h] = 0;
    exitsMap[h] = 0;
  }

  filteredRecords.forEach(r => {
    const entH = getRecordHour(r);
    if (entH !== null && entH >= 8 && entH <= 22) {
      entriesMap[entH] = (entriesMap[entH] || 0) + 1;
    }
    if (r.checkOutTimestamp || r.checkOutTimeString) {
      let extH: number | null = null;
      if (r.checkOutTimeString && r.checkOutTimeString.includes(':')) {
        const parsed = parseInt(r.checkOutTimeString.split(':')[0], 10);
        if (!isNaN(parsed)) extH = parsed;
      }
      if (extH === null && r.checkOutTimestamp) {
        try {
          const d = new Date(r.checkOutTimestamp);
          if (!isNaN(d.getTime())) {
            const hourStr = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', hour: 'numeric', hour12: false }).format(d);
            const p = parseInt(hourStr, 10);
            extH = p === 24 ? 0 : p;
          }
        } catch {}
      }
      if (extH !== null && extH >= 8 && extH <= 22) {
        exitsMap[extH] = (exitsMap[extH] || 0) + 1;
      }
    }
  });

  let maxEntries = 0;
  let peakHourStr = 'Sin afluencia';
  let peakHourShort = '—';
  const hourlyTraffic: { hour: number; label: string; entries: number; exits: number; net: number }[] = [];

  for (let h = 8; h <= 22; h++) {
    const ent = entriesMap[h] || 0;
    const ext = exitsMap[h] || 0;
    const label = `${h.toString().padStart(2, '0')}:00`;
    if (ent > maxEntries) {
      maxEntries = ent;
      peakHourStr = `${label} (${ent} asistencias)`;
      peakHourShort = label;
    }
    hourlyTraffic.push({
      hour: h,
      label,
      entries: ent,
      exits: ext,
      net: ent - ext
    });
  }

  // Permanencia promedio
  let sumFinishedMins = 0;
  let countFinished = 0;
  filteredRecords.forEach(r => {
    if (r.durationMinutes && r.durationMinutes > 0) {
      sumFinishedMins += r.durationMinutes;
      countFinished++;
    } else if (r.timestamp && r.checkOutTimestamp) {
      const diff = Math.floor((new Date(r.checkOutTimestamp).getTime() - new Date(r.timestamp).getTime()) / 60000);
      if (diff > 0) {
        sumFinishedMins += diff;
        countFinished++;
      }
    }
  });
  const avgMins = countFinished > 0 ? Math.round(sumFinishedMins / countFinished) : 0;
  const avgDurationStr = avgMins >= 60 ? `${Math.floor(avgMins / 60)}h ${avgMins % 60}m` : `${avgMins} min`;

  // Permanencia por Programa Académico / Rol
  const now = new Date().getTime();
  const groupMap: Record<string, { totalMinutes: number; userCount: number; activeCount: number; personType: string }> = {};

  filteredRecords.forEach(r => {
    const isActiveUser = r.isActive === true || (r.isActive === undefined && !r.checkOutTimestamp && !r.checkOutTimeString);
    let minutes = 0;
    if (isActiveUser) {
      const entryTime = r.timestamp 
        ? new Date(r.timestamp).getTime() 
        : (r.dateString && r.timeString ? new Date(`${r.dateString}T${r.timeString}`).getTime() : 0);
      if (entryTime > 0 && !isNaN(entryTime)) {
        minutes = Math.max(1, Math.floor((now - entryTime) / 60000));
      } else {
        minutes = 1;
      }
    } else {
      minutes = r.durationMinutes || 0;
      if (minutes === 0 && r.timestamp && r.checkOutTimestamp) {
        const diff = Math.floor((new Date(r.checkOutTimestamp).getTime() - new Date(r.timestamp).getTime()) / 60000);
        if (diff > 0) minutes = diff;
      }
    }

    if (minutes > 0) {
      let groupName = '';
      const pType = r.personType?.trim() || '';
      const programOrCareer = ((r as any).program || r.career || '').trim();

      if (pType === 'Docente') {
        groupName = 'Docentes';
      } else if (pType === 'Visitante') {
        groupName = 'Visitantes';
      } else if (programOrCareer && programOrCareer !== 'Sin Carrera') {
        groupName = programOrCareer;
      } else if (pType && pType !== 'Alumno') {
        groupName = pType;
      } else {
        groupName = 'Comunidad General';
      }

      if (!groupMap[groupName]) {
        groupMap[groupName] = { totalMinutes: 0, userCount: 0, activeCount: 0, personType: pType };
      }
      groupMap[groupName].totalMinutes += minutes;
      groupMap[groupName].userCount += 1;
      if (isActiveUser) {
        groupMap[groupName].activeCount += 1;
      }
    }
  });

  const sortedPermanence = Object.entries(groupMap).map(([name, d]) => {
    const h = Math.floor(d.totalMinutes / 60);
    const m = d.totalMinutes % 60;
    return {
      name,
      totalMinutes: d.totalMinutes,
      userCount: d.userCount,
      activeCount: d.activeCount,
      formattedTime: h > 0 ? `${h}h ${m}m` : `${m} min`
    };
  }).sort((a, b) => b.totalMinutes - a.totalMinutes);

  // Distribución por rol de usuario
  const personTypeMap: Record<string, number> = {};
  filteredRecords.forEach(r => {
    const pType = r.personType || 'Alumno';
    personTypeMap[pType] = (personTypeMap[pType] || 0) + 1;
  });
  const sortedPersonTypes = Object.entries(personTypeMap).map(([name, count]) => ({
    name,
    count,
    percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  // Distribución por carrera/programa
  const careerMap: Record<string, number> = {};
  filteredRecords.forEach(r => {
    const c = r.career || 'Sin Carrera';
    careerMap[c] = (careerMap[c] || 0) + 1;
  });
  const sortedCareers = Object.entries(careerMap).map(([name, count]) => ({
    name,
    count,
    percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0
  })).sort((a, b) => b.count - a.count);

  return {
    targetDateStr,
    dateFormatted,
    spanishFullDate,
    filteredRecords,
    codeToPerson,
    totalVisits,
    uniqueUsers,
    activeNow,
    hourlyTraffic,
    peakHourStr,
    peakHourShort,
    maxEntries,
    avgDurationStr,
    sortedPermanence,
    sortedPersonTypes,
    sortedCareers
  };
}

/**
 * Exporta la sección de Inicio a un archivo Excel (.xlsx) estructurado en múltiples hojas
 */
export function exportInicioSectionExcel(params: ExportInicioSectionParams) {
  const stats = computeInicioStats(params);
  const wb = XLSX.utils.book_new();

  // 1. Hoja: Resumen_Diario
  const summaryAoa: any[][] = [
    ['UNIVERSIDAD RICARDO PALMA'],
    ['FACULTAD DE HUMANIDADES Y LENGUAS MODERNAS'],
    ['BIBLIOTECA ESPECIALIZADA SAN JERÓNIMO'],
    ['REPORTE DIARIO DE ASISTENCIA Y OPERACIONES'],
    [''],
    ['DATOS DE LA JORNADA'],
    ['Fecha Analizada:', stats.spanishFullDate],
    ['Fecha (dd/mm/aaaa):', stats.dateFormatted],
    ['Fecha y Hora de Emisión:', `${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`],
    [''],
    ['INDICADORES CLAVE (KPIS)', 'VALOR'],
    ['Total Asistencias del Día', stats.totalVisits],
    ['Usuarios Únicos Registrados', stats.uniqueUsers],
    ['Usuarios Actualmente en Sala', stats.activeNow],
    ['Horario Pico de Mayor Afluencia', stats.peakHourStr],
    ['Permanencia Promedio por Visita', stats.avgDurationStr],
    ['Carrera con Mayor Afluencia', stats.sortedCareers[0] ? `${stats.sortedCareers[0].name} (${stats.sortedCareers[0].count} asistencias)` : 'Sin afluencia'],
    ['Rol con Mayor Afluencia', stats.sortedPersonTypes[0] ? `${stats.sortedPersonTypes[0].name} (${stats.sortedPersonTypes[0].count} asistencias)` : 'Sin afluencia'],
    [''],
    ['DISTRIBUCIÓN POR FRANJA HORARIA (INGRESOS VS SALIDAS)'],
    ['Franja Horaria', 'Ingresos', 'Salidas', 'Flujo Neto'],
    ...stats.hourlyTraffic.map(h => [h.label, h.entries, h.exits, h.net]),
    [''],
    ['PERMANENCIA EN TIEMPO REAL POR PROGRAMA / ROL'],
    ['Programa Académico / Rol', 'Total Visitas', 'Minutos Acumulados', 'Tiempo Formateado', 'Actualmente en Sala'],
    ...stats.sortedPermanence.map(p => [p.name, p.userCount, p.totalMinutes, p.formattedTime, p.activeCount]),
    [''],
    ['DISTRIBUCIÓN POR TIPO DE PERSONA / ROL'],
    ['Tipo de Persona / Rol', 'Total Asistencias', 'Porcentaje (%)'],
    ...stats.sortedPersonTypes.map(pt => [pt.name, pt.count, `${pt.percentage}%`]),
    [''],
    ['DISTRIBUCIÓN POR CARRERA / PROGRAMA ACADÉMICO'],
    ['Programa Académico / Carrera', 'Total Asistencias', 'Porcentaje (%)'],
    ...stats.sortedCareers.map(c => [c.name, c.count, `${c.percentage}%`])
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
  wsSummary['!cols'] = [
    { wch: 42 },
    { wch: 22 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen_Diario');

  // 2. Hoja: Asistencias_Detalladas
  const detailedRows = stats.filteredRecords.map((r, idx) => {
    const ids = resolveAttendanceIdentifiers(r, stats.codeToPerson, params.students);
    const timing = getAttendanceEntryExit(r);
    return {
      'N°': idx + 1,
      'Fecha': timing.dateFormatted,
      'Hora Ingreso': timing.entrada,
      'Hora Salida': timing.salida,
      'Duración (Minutos)': r.durationMinutes || 0,
      'Duración Formateada': timing.duracion,
      'Estado': timing.estado,
      'DNI': ids.dni,
      'Código': ids.code,
      'Estudiante / Persona': r.studentName || '-',
      'Tipo de Usuario': r.personType || 'Alumno',
      'Programa / Carrera': (r as any).program || r.career || '-',
      'Motivo de Visita': r.visitReason || '-',
      'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Código de Barras' : 'Registro Manual'
    };
  });

  const wsDetailed = XLSX.utils.json_to_sheet(
    detailedRows.length > 0 ? detailedRows : [{ 'Mensaje': `No se encontraron asistencias registradas para el ${stats.dateFormatted}` }]
  );
  wsDetailed['!cols'] = [
    { wch: 6 },
    { wch: 13 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 32 },
    { wch: 16 },
    { wch: 28 },
    { wch: 22 },
    { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDetailed, 'Asistencias_Detalladas');

  // 3. Hoja: Horarios_Afluencia
  const wsHourly = XLSX.utils.json_to_sheet(stats.hourlyTraffic.map(h => ({
    'Franja Horaria': h.label,
    'Ingresos': h.entries,
    'Salidas': h.exits,
    'Flujo Neto': h.net
  })));
  wsHourly['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsHourly, 'Horarios_Afluencia');

  // 4. Hoja: Permanencia_Programas
  const wsPermanence = XLSX.utils.json_to_sheet(stats.sortedPermanence.map(p => ({
    'Programa / Rol': p.name,
    'Cantidad de Visitas': p.userCount,
    'Minutos Totales': p.totalMinutes,
    'Tiempo Formateado': p.formattedTime,
    'Usuarios Actualmente en Sala': p.activeCount
  })));
  wsPermanence['!cols'] = [{ wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 20 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsPermanence, 'Permanencia_Programas');

  // 5. Hoja: Afluencia_Por_Tipo
  const wsRoles = XLSX.utils.json_to_sheet(stats.sortedPersonTypes.map(pt => ({
    'Tipo de Persona': pt.name,
    'Cantidad de Asistencias': pt.count,
    'Porcentaje (%)': `${pt.percentage}%`
  })));
  wsRoles['!cols'] = [{ wch: 22 }, { wch: 24 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsRoles, 'Afluencia_Por_Tipo');

  // 6. Hoja: Afluencia_Por_Carrera
  const wsCareers = XLSX.utils.json_to_sheet(stats.sortedCareers.map(c => ({
    'Carrera / Programa': c.name,
    'Cantidad de Asistencias': c.count,
    'Porcentaje (%)': `${c.percentage}%`
  })));
  wsCareers['!cols'] = [{ wch: 35 }, { wch: 24 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCareers, 'Afluencia_Por_Carrera');

  const cleanDate = stats.targetDateStr.replace(/[\/\\]/g, '-');
  XLSX.writeFile(wb, `Reporte_Diario_URP_${cleanDate}.xlsx`);
}

/**
 * Exporta la sección de Inicio a un PDF institucional elegante de alta resolución,
 * incluyendo los 4 gráficos capturados dinámicamente con html2canvas y tablas completas.
 */
export async function exportInicioSectionPDF(params: ExportInicioSectionParams): Promise<void> {
  const stats = computeInicioStats(params);

  // Captura de los 4 paneles de gráficos mediante html2canvas
  const captureCard = async (id: string): Promise<string | null> => {
    if (typeof document === 'undefined') return null;
    const el = document.getElementById(id);
    if (!el) return null;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: el.scrollWidth || el.offsetWidth,
        windowHeight: el.scrollHeight || el.offsetHeight
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      console.warn(`[exportInicioSectionPDF] No se pudo capturar gráfico #${id}:`, err);
      return null;
    }
  };

  const [imgTraffic, imgRoles, imgDuration, imgCareers] = await Promise.all([
    captureCard('chart-card-traffic'),
    captureCard('chart-card-roles'),
    captureCard('chart-card-duration'),
    captureCard('chart-card-careers')
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // ==========================================
  // PÁGINA 1: RESUMEN EJECUTIVO + GRÁFICOS VISUALES
  // ==========================================
  
  // Banner Institucional Superior URP
  doc.setFillColor(15, 81, 66); // Verde URP
  doc.rect(0, 0, 210, 26, 'F');

  // Franja Dorada Institucional
  doc.setFillColor(180, 83, 9); // Dorado URP
  doc.rect(0, 26, 210, 2.5, 'F');

  // Textos del Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('UNIVERSIDAD RICARDO PALMA', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo', 14, 17);

  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Fecha y hora de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 14, 23);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text('REPORTE DIARIO DE ASISTENCIA Y OPERACIONES', 196, 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text('MÓDULO DE ANALÍTICA Y CONTROL EN SALA', 196, 17.5, { align: 'right' });

  // Título y Subtítulo de la Jornada
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 81, 66);
  doc.text('RESUMEN EJECUTIVO Y OPERATIVO DEL DÍA', 14, 35);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Fecha Analizada: ${stats.spanishFullDate} (${stats.dateFormatted})`, 14, 40);

  // 5 KPI Cards Superiores
  const kpiCards = [
    { label: 'TOTAL ASISTENCIAS', val: `${stats.totalVisits}`, sub: 'Registros del día', color: [15, 81, 66] },
    { label: 'USUARIOS ÚNICOS', val: `${stats.uniqueUsers}`, sub: 'Personas distintas', color: [15, 81, 66] },
    { label: 'EN SALA AHORA', val: `${stats.activeNow}`, sub: 'Usuarios activos', color: [22, 163, 74] },
    { label: 'HORARIO PICO', val: `${stats.peakHourShort}`, sub: stats.maxEntries > 0 ? `${stats.maxEntries} asistencias` : 'Sin afluencia', color: [180, 83, 9] },
    { label: 'PERMANENCIA PROM.', val: `${stats.avgDurationStr}`, sub: 'Por estancia', color: [15, 81, 66] }
  ];

  let kX = 14;
  const kW = 34.4;
  kpiCards.forEach((c) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kX, 44, kW, 18, 1.5, 1.5, 'FD');

    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(kX, 44, kW, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, kX + kW / 2, 49.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.val, kX + kW / 2, 55, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, kX + kW / 2, 59.5, { align: 'center' });

    kX += kW + 2.5;
  });

  // Título Sección de Gráficos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 81, 66);
  doc.text('PANEL ANALÍTICO VISUAL DE LA SALA', 14, 66.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Gráficos de flujo de usuarios, permanencia en sala y distribución de la población académica', 14, 70);

  // Fila 1 de Gráficos (Horarios de Mayor Afluencia + Afluencia por Tipo)
  if (imgTraffic) {
    doc.addImage(imgTraffic, 'PNG', 14, 73, 110, 54, undefined, 'FAST');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 73, 110, 54, 1.5, 1.5, 'S');
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 73, 110, 54, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Gráfico: Horarios de Mayor Afluencia (Ingresos vs Salidas)', 20, 100);
  }

  if (imgRoles) {
    doc.addImage(imgRoles, 'PNG', 126, 73, 70, 54, undefined, 'FAST');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(126, 73, 70, 54, 1.5, 1.5, 'S');
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(126, 73, 70, 54, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Gráfico: Afluencia por Tipo', 132, 100);
  }

  // Fila 2 de Gráficos (Permanencia en Tiempo Real + Afluencia por Programa)
  if (imgDuration) {
    doc.addImage(imgDuration, 'PNG', 14, 129, 110, 60, undefined, 'FAST');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 129, 110, 60, 1.5, 1.5, 'S');
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 129, 110, 60, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Gráfico: Permanencia en Tiempo Real', 20, 159);
  }

  if (imgCareers) {
    doc.addImage(imgCareers, 'PNG', 126, 129, 70, 60, undefined, 'FAST');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(126, 129, 70, 60, 1.5, 1.5, 'S');
  } else {
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(126, 129, 70, 60, 1.5, 1.5, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Gráfico: Afluencia por Carrera / Programa', 132, 159);
  }

  // Tabla Síntesis de Permanencia en Parte Inferior de Página 1
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 81, 66);
  doc.text('SÍNTESIS DE PERMANENCIA EN TIEMPO REAL (TOP PROGRAMAS Y ROLES)', 14, 194);

  const topPermanenceRows = stats.sortedPermanence.slice(0, 6).map((p, idx) => [
    (idx + 1).toString(),
    p.name,
    `${p.userCount} ${p.userCount === 1 ? 'visita' : 'visitas'}`,
    p.formattedTime,
    p.activeCount > 0 ? `${p.activeCount} en sala` : '0 en sala'
  ]);

  autoTable(doc, {
    startY: 197,
    head: [['#', 'Programa Académico / Rol', 'Visitas Registradas', 'Tiempo Acumulado', 'Usuarios en Sala']],
    body: topPermanenceRows.length > 0 ? topPermanenceRows : [['-', 'No se registraron tiempos de permanencia para esta fecha.', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      halign: 'left',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [30, 41, 59],
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 84 },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 28, halign: 'center' }
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // ==========================================
  // PÁGINA 2: DESGLOSE ESTADÍSTICO DE LA JORNADA
  // ==========================================
  doc.addPage();

  // Banner compacto
  doc.setFillColor(15, 81, 66);
  doc.rect(0, 0, 210, 16, 'F');
  doc.setFillColor(180, 83, 9);
  doc.rect(0, 16, 210, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('UNIVERSIDAD RICARDO PALMA', 14, 7.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo', 14, 12.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('DESGLOSE ESTADÍSTICO DE LA JORNADA', 196, 8, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(`Fecha: ${stats.dateFormatted}`, 196, 12.5, { align: 'right' });

  // Título de página 2
  doc.setTextColor(15, 81, 66);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DESGLOSE ESTADÍSTICO Y CONSOLIDADO DE SALA', 14, 25);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Distribución de afluencia por horarios, permanencia acumulada y segmentación académica', 14, 29.5);

  // Tabla 1: Distribución por Franja Horaria (Ingresos vs Salidas)
  doc.setTextColor(15, 81, 66);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. Distribución por Franja Horaria (Ingresos vs Salidas)', 14, 36);

  const hourlyHead = ['Franja', ...stats.hourlyTraffic.map(h => h.label)];
  const entriesRow = ['Ingresos', ...stats.hourlyTraffic.map(h => h.entries.toString())];
  const exitsRow = ['Salidas', ...stats.hourlyTraffic.map(h => h.exits.toString())];
  const netRow = ['Flujo Neto', ...stats.hourlyTraffic.map(h => (h.net > 0 ? `+${h.net}` : `${h.net}`))];

  autoTable(doc, {
    startY: 38.5,
    head: [hourlyHead],
    body: [entriesRow, exitsRow, netRow],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 6.2,
      halign: 'center',
      cellPadding: 1.5
    },
    bodyStyles: {
      fontSize: 6.5,
      halign: 'center',
      cellPadding: 1.8,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 18, fontStyle: 'bold', halign: 'left', fillColor: [241, 245, 249] }
    },
    margin: { left: 14, right: 14 }
  });

  let currentY = (doc as any).lastAutoTable?.finalY || 65;

  // Tabla 2: Permanencia Completa por Programa / Rol
  doc.setTextColor(15, 81, 66);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. Permanencia Acumulada por Programa Académico / Rol', 14, currentY + 7);

  const permTableRows = stats.sortedPermanence.map((p, i) => [
    (i + 1).toString(),
    p.name,
    p.userCount.toString(),
    `${p.totalMinutes} min`,
    p.formattedTime,
    p.activeCount > 0 ? `${p.activeCount} en sala` : '0'
  ]);

  autoTable(doc, {
    startY: currentY + 9.5,
    head: [['#', 'Programa / Carrera / Rol', 'Visitas', 'Minutos Totales', 'Tiempo Formateado', 'Activos']],
    body: permTableRows.length > 0 ? permTableRows : [['-', 'Sin registros de permanencia', '-', '-', '-', '-']],
    theme: 'striped',
    headStyles: {
      fillColor: [180, 83, 9],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.8
    },
    alternateRowStyles: {
      fillColor: [254, 252, 232]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 78 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 18, halign: 'center' }
    },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable?.finalY || 135;

  // Tablas 3 & 4: Distribución por Rol y Carrera
  doc.setTextColor(15, 81, 66);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('3. Distribución por Tipo de Persona y Programas Académicos', 14, currentY + 7);

  const rolesRows = stats.sortedPersonTypes.map(r => [r.name, r.count.toString(), `${r.percentage}%`]);
  const careersRows = stats.sortedCareers.map(c => [c.name, c.count.toString(), `${c.percentage}%`]);

  autoTable(doc, {
    startY: currentY + 9.5,
    head: [['Tipo de Persona / Rol', 'Asistencias', '%']],
    body: rolesRows.length > 0 ? rolesRows : [['Sin registros', '0', '0%']],
    theme: 'grid',
    tableWidth: 88,
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.8
    },
    margin: { left: 14 }
  });

  autoTable(doc, {
    startY: currentY + 9.5,
    head: [['Programa Académico / Carrera', 'Asistencias', '%']],
    body: careersRows.length > 0 ? careersRows : [['Sin registros', '0', '0%']],
    theme: 'grid',
    tableWidth: 90,
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      cellPadding: 1.8
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.8
    },
    margin: { left: 106 }
  });

  // ==========================================
  // PÁGINA 3+: REGISTRO DETALLADO DE ASISTENCIAS
  // ==========================================
  doc.addPage();

  const drawPageHeader = () => {
    doc.setFillColor(15, 81, 66);
    doc.rect(0, 0, 210, 16, 'F');
    doc.setFillColor(180, 83, 9);
    doc.rect(0, 16, 210, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('UNIVERSIDAD RICARDO PALMA', 14, 7.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo', 14, 12.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('REGISTRO DETALLADO DE ASISTENCIAS', 196, 8, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Fecha: ${stats.dateFormatted} | Total: ${stats.filteredRecords.length}`, 196, 12.5, { align: 'right' });
  };

  drawPageHeader();

  doc.setTextColor(15, 81, 66);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('REGISTRO INDIVIDUAL DE ASISTENCIAS DEL DÍA', 14, 25);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Listado nominal completo de usuarios con control de ingreso, egreso, duración y motivo', 14, 29.5);

  const detailRows = stats.filteredRecords.length === 0 ? [
    ['-', '-', '-', '-', '-', '-', '-', 'No se registraron asistencias en la fecha seleccionada.', '-', '-', '-']
  ] : stats.filteredRecords.map((r, idx) => {
    const ids = resolveAttendanceIdentifiers(r, stats.codeToPerson, params.students);
    const timing = getAttendanceEntryExit(r);
    return [
      (idx + 1).toString(),
      timing.entrada,
      timing.salida,
      timing.duracion,
      timing.estado,
      ids.dni,
      ids.code,
      r.studentName || '-',
      r.personType || 'Alumno',
      (r as any).program || r.career || '-',
      r.visitReason || '-'
    ];
  });

  autoTable(doc, {
    startY: 33,
    head: [['#', 'Ingreso', 'Salida', 'Duración', 'Estado', 'DNI', 'Código', 'Nombre Completo', 'Tipo', 'Programa / Carrera', 'Motivo']],
    body: detailRows,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 6.8,
      fontStyle: 'bold',
      cellPadding: 1.5,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 6.5,
      textColor: [30, 41, 59],
      cellPadding: 1.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 12, halign: 'center' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 15, halign: 'center' },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 32 },
      8: { cellWidth: 15, halign: 'center' },
      9: { cellWidth: 23 },
      10: { cellWidth: 20 }
    },
    margin: { top: 22, left: 14, right: 14, bottom: 15 },
    didDrawPage: (data) => {
      if (data.pageNumber >= 3) {
        drawPageHeader();
      }
    }
  });

  // Numeración institucional en el pie de página de todas las páginas
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 287, 196, 287);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Universidad Ricardo Palma • Facultad de Humanidades y Lenguas Modernas • Biblioteca Especializada San Jerónimo',
      14,
      291
    );
    doc.text(
      `Página ${p} de ${totalPages}`,
      196,
      291,
      { align: 'right' }
    );
  }

  const cleanDate = stats.targetDateStr.replace(/[\/\\]/g, '-');
  doc.save(`Reporte_Diario_URP_${cleanDate}.pdf`);
}

/**
 * Exporta listado de asistencias a PDF (general) en formato horizontal (Landscape)
 */
export function exportAttendanceToPDF(
  records: AttendanceRecord[], 
  summary?: AnalyticsSummary | null,
  title: string = 'INFORME DE CONTROL DE ASISTENCIA',
  subtitle: string = '',
  personType: string = 'Todos',
  codeToPerson?: Map<string, LibraryPerson>,
  students?: Student[]
) {
  // Orientación horizontal para visualización óptima de múltiples columnas
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 81, 66);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setFillColor(180, 83, 9);
  doc.rect(0, 26, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD RICARDO PALMA', 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo', 14, 16);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 14, 22);

  doc.setTextColor(15, 81, 66);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 36);

  if (subtitle) {
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 42);
  }

  // Resumen numérico en la esquina superior derecha
  const total = records.length;
  const enSala = records.filter(r => r.isActive).length;
  const retirados = records.filter(r => !r.isActive && !r.checkOutTimeString?.includes('cierre auto')).length;
  const cierreAuto = records.filter(r => !r.isActive && r.checkOutTimeString?.includes('cierre auto')).length;

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${total} | En sala: ${enSala} | Retirados: ${retirados} | Cierre auto: ${cierreAuto}`, pageWidth - 14, 36, { align: 'right' });

  const roleNameMap: Record<string, string> = {
    'Todos': 'Todos_los_Usuarios',
    'Alumno': 'Alumnos',
    'Docente': 'Docentes',
    'Visitante': 'Visitantes',
    'Maestrando': 'Maestrandos',
    'Doctorando': 'Doctorandos'
  };
  const roleSuffix = roleNameMap[personType] || personType;

  let head: string[][] = [['#', 'Fecha', 'Entrada', 'Salida', 'Duración', 'Estado', 'Código', 'Estudiante', 'Facultad', 'Carrera', 'Motivo', 'Método']];
  let tableData: any[][] = [];

  if (personType === 'Todos') {
    head = [['#', 'Fecha', 'Entrada', 'Salida', 'Duración', 'Estado', 'Tipo', 'DNI', 'Código', 'Usuario', 'Detalles (Fac./Prog.)', 'Motivo', 'Método']];
    tableData = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      const p = codeToPerson?.get(r.studentCode) || (iden.code !== '-' ? codeToPerson?.get(iden.code) : undefined) || (iden.dni !== '-' ? codeToPerson?.get(iden.dni) : undefined);
      let details = r.career || r.faculty || '—';
      if (p) {
        if (p.personType === 'Alumno') details = `${p.faculty || ''} - ${p.career || ''}`;
        else if (p.personType === 'Docente') details = p.faculty || p.email || '—';
        else if (p.personType === 'Maestrando' || p.personType === 'Doctorando') details = p.program || '—';
        else if (p.personType === 'Visitante') details = p.email || p.phone || '—';
      }
      return [
        (i + 1).toString(),
        dateFormatted,
        entrada,
        salida,
        duracion,
        estado,
        p?.personType || r.personType || 'Alumno',
        iden.dni,
        iden.code,
        r.studentName,
        details,
        r.visitReason,
        r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
      ];
    });
  } else if (personType === 'Alumno') {
    head = [['#', 'Fecha', 'Entrada', 'Salida', 'Duración', 'Estado', 'DNI', 'Código', 'Estudiante', 'Facultad', 'Carrera', 'Motivo', 'Método']];
    tableData = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      return [
        (i + 1).toString(),
        dateFormatted,
        entrada,
        salida,
        duracion,
        estado,
        iden.dni,
        iden.code !== '-' ? iden.code : r.studentCode,
        r.studentName,
        r.faculty || '—',
        r.career,
        r.visitReason,
        r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
      ];
    });
  } else if (personType === 'Docente') {
    head = [['#', 'Fecha', 'Entrada', 'Salida', 'Duración', 'Estado', 'DNI', 'Código', 'Docente', 'Facultad', 'Correo', 'Motivo', 'Método']];
    tableData = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      const p = codeToPerson?.get(r.studentCode) || (iden.dni !== '-' ? codeToPerson?.get(iden.dni) : undefined);
      return [
        (i + 1).toString(),
        dateFormatted,
        entrada,
        salida,
        duracion,
        estado,
        iden.dni,
        iden.code,
        r.studentName,
        p?.faculty || r.faculty || '—',
        p?.email || '—',
        r.visitReason,
        r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
      ];
    });
  } else if (personType === 'Maestrando' || personType === 'Doctorando') {
    head = [['#', 'Fecha', 'Entrada', 'Salida', 'Duración', 'Estado', 'DNI', 'Código', personType, 'Programa', 'Motivo', 'Método']];
    tableData = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      const p = codeToPerson?.get(r.studentCode) || (iden.code !== '-' ? codeToPerson?.get(iden.code) : undefined) || (iden.dni !== '-' ? codeToPerson?.get(iden.dni) : undefined);
      return [
        (i + 1).toString(),
        dateFormatted,
        entrada,
        salida,
        duracion,
        estado,
        iden.dni,
        iden.code,
        r.studentName,
        p?.program || r.career || '—',
        r.visitReason,
        r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
      ];
    });
  } else if (personType === 'Visitante') {
    head = [['#', 'Fecha', 'Entrada', 'Salida', 'Duración', 'Estado', 'DNI', 'Visitante', 'Correo', 'Celular', 'Motivo', 'Método']];
    tableData = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      const p = codeToPerson?.get(r.studentCode) || (iden.dni !== '-' ? codeToPerson?.get(iden.dni) : undefined);
      return [
        (i + 1).toString(),
        dateFormatted,
        entrada,
        salida,
        duracion,
        estado,
        iden.dni,
        r.studentName,
        p?.email || '—',
        p?.phone || '—',
        r.visitReason,
        r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
      ];
    });
  }

  if (tableData.length === 0) {
    const colCount = head[0]?.length || 10;
    const emptyRow = new Array(colCount).fill('-');
    emptyRow[Math.floor(colCount / 2)] = 'No se encontraron asistencias para los filtros seleccionados.';
    tableData = [emptyRow];
  }

  autoTable(doc, {
    startY: subtitle ? 46 : 42,
    head: head,
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [30, 41, 59],
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: 'center' }, // #
      1: { halign: 'center' }, // Fecha
      2: { halign: 'center' }, // Entrada
      3: { halign: 'center' }, // Salida
      4: { halign: 'center' }, // Duración
      5: { halign: 'center' }, // Estado
      6: { halign: 'center' }, // Tipo o DNI
      7: { halign: 'center' }, // DNI o Código
      8: { halign: 'center' }  // Código o Nombre
    },
    margin: { left: 10, right: 10 }
  });

  doc.save(`Reporte_Asistencias_URP_${roleSuffix}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Exporta listado de asistencias a Excel (general)
 */
export function exportAttendanceToExcel(
  records: AttendanceRecord[], 
  students?: Student[],
  customFilename?: string,
  personType: string = 'Todos',
  codeToPerson?: Map<string, LibraryPerson>
) {
  const wb = XLSX.utils.book_new();

  let attendanceRows: any[] = [];
  let cols: any[] = [];

  const roleNameMap: Record<string, string> = {
    'Todos': 'Todos_los_Usuarios',
    'Alumno': 'Alumnos',
    'Docente': 'Docentes',
    'Visitante': 'Visitantes',
    'Maestrando': 'Maestrandos',
    'Doctorando': 'Doctorandos'
  };
  const roleSuffix = roleNameMap[personType] || personType;

  if (personType === 'Todos') {
    attendanceRows = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      const p = codeToPerson?.get(r.studentCode) || (iden.code !== '-' ? codeToPerson?.get(iden.code) : undefined) || (iden.dni !== '-' ? codeToPerson?.get(iden.dni) : undefined);
      let details = r.career || r.faculty || '—';
      if (p) {
        if (p.personType === 'Alumno') details = `${p.faculty || ''} - ${p.career || ''}`;
        else if (p.personType === 'Docente') details = p.faculty || p.email || '—';
        else if (p.personType === 'Maestrando' || p.personType === 'Doctorando') details = p.program || '—';
        else if (p.personType === 'Visitante') details = p.email || p.phone || '—';
      }
      return {
        'N°': i + 1,
        'Fecha': dateFormatted,
        'Entrada': entrada,
        'Salida': salida,
        'Duración': duracion,
        'Estado': estado,
        'Tipo de Usuario': p?.personType || r.personType || 'Alumno',
        'DNI': iden.dni,
        'Código': iden.code,
        'Usuario': r.studentName,
        'Detalles (Fac./Prog.)': details,
        'Motivo de Visita': r.visitReason,
        'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
      };
    });
    cols = [
      { wch: 6 },
      { wch: 12 },
      { wch: 11 },
      { wch: 22 },
      { wch: 13 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 15 },
      { wch: 32 },
      { wch: 32 },
      { wch: 22 },
      { wch: 18 }
    ];
  } else if (personType === 'Alumno') {
    attendanceRows = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      return {
        'N°': i + 1,
        'Fecha': dateFormatted,
        'Entrada': entrada,
        'Salida': salida,
        'Duración': duracion,
        'Estado': estado,
        'DNI': iden.dni,
        'Código Estudiante': iden.code !== '-' ? iden.code : r.studentCode,
        'Estudiante': r.studentName,
        'Facultad': r.faculty || '—',
        'Carrera': r.career,
        'Motivo de Visita': r.visitReason,
        'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
      };
    });
    cols = [
      { wch: 6 },
      { wch: 12 },
      { wch: 11 },
      { wch: 22 },
      { wch: 13 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 32 },
      { wch: 28 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 }
    ];
  } else if (personType === 'Docente') {
    attendanceRows = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      const p = codeToPerson?.get(r.studentCode) || (iden.dni !== '-' ? codeToPerson?.get(iden.dni) : undefined);
      return {
        'N°': i + 1,
        'Fecha': dateFormatted,
        'Entrada': entrada,
        'Salida': salida,
        'Duración': duracion,
        'Estado': estado,
        'DNI': iden.dni,
        'Código': iden.code,
        'Docente': r.studentName,
        'Facultad': p?.faculty || r.faculty || '—',
        'Correo': p?.email || '—',
        'Motivo de Visita': r.visitReason,
        'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
      };
    });
    cols = [
      { wch: 6 },
      { wch: 12 },
      { wch: 11 },
      { wch: 22 },
      { wch: 13 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 32 },
      { wch: 26 },
      { wch: 28 },
      { wch: 22 },
      { wch: 18 }
    ];
  } else if (personType === 'Maestrando' || personType === 'Doctorando') {
    attendanceRows = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      const p = codeToPerson?.get(r.studentCode) || (iden.code !== '-' ? codeToPerson?.get(iden.code) : undefined) || (iden.dni !== '-' ? codeToPerson?.get(iden.dni) : undefined);
      return {
        'N°': i + 1,
        'Fecha': dateFormatted,
        'Entrada': entrada,
        'Salida': salida,
        'Duración': duracion,
        'Estado': estado,
        'DNI': iden.dni,
        'Código': iden.code,
        [personType]: r.studentName,
        'Programa': p?.program || r.career || '—',
        'Motivo de Visita': r.visitReason,
        'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
      };
    });
    cols = [
      { wch: 6 },
      { wch: 12 },
      { wch: 11 },
      { wch: 22 },
      { wch: 13 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 32 },
      { wch: 30 },
      { wch: 22 },
      { wch: 18 }
    ];
  } else if (personType === 'Visitante') {
    attendanceRows = records.map((r, i) => {
      const { dateFormatted, entrada, salida, duracion, estado } = getAttendanceEntryExit(r);
      const iden = resolveAttendanceIdentifiers(r, codeToPerson, students);
      const p = codeToPerson?.get(r.studentCode) || (iden.dni !== '-' ? codeToPerson?.get(iden.dni) : undefined);
      return {
        'N°': i + 1,
        'Fecha': dateFormatted,
        'Entrada': entrada,
        'Salida': salida,
        'Duración': duracion,
        'Estado': estado,
        'DNI': iden.dni,
        'Visitante': r.studentName,
        'Correo': p?.email || '—',
        'Celular': p?.phone || '—',
        'Motivo de Visita': r.visitReason,
        'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
      };
    });
    cols = [
      { wch: 6 },
      { wch: 12 },
      { wch: 11 },
      { wch: 22 },
      { wch: 13 },
      { wch: 14 },
      { wch: 14 },
      { wch: 32 },
      { wch: 26 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 }
    ];
  }

  if (attendanceRows.length === 0) {
    attendanceRows = [{
      'Mensaje': `No se encontraron asistencias registradas con los filtros actuales (${personType === 'Todos' ? 'Todos los tipos' : personType}).`
    }];
    cols = [{ wch: 70 }];
  }

  const now = new Date();
  const fechaGeneracion = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaGeneracion = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const enSalaCount = records.filter(r => r.isActive).length;
  const retiradosCount = records.filter(r => !r.isActive && !r.checkOutTimeString?.includes('cierre auto')).length;
  const autoCloseCount = records.filter(r => !r.isActive && r.checkOutTimeString?.includes('cierre auto')).length;

  const titleRows = [
    ['UNIVERSIDAD RICARDO PALMA'],
    ['Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo'],
    [`REPORTE DE CONTROL DE ASISTENCIAS - ${personType === 'Todos' ? 'TODOS LOS USUARIOS' : personType.toUpperCase() + 'S'}`],
    [`Fecha y hora de emisión: ${fechaGeneracion} a las ${horaGeneracion}`],
    [`Total registros: ${records.length} | En sala: ${enSalaCount} | Retirados: ${retiradosCount} | Cierre auto: ${autoCloseCount}`],
    []
  ];

  const wsAttendance = XLSX.utils.aoa_to_sheet(titleRows);
  XLSX.utils.sheet_add_json(wsAttendance, attendanceRows, { origin: 'A7' });
  wsAttendance['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, wsAttendance, `Asistencias_${roleSuffix}`.slice(0, 31));

  const filename = customFilename || `Reporte_Asistencias_URP_${roleSuffix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

/**
 * Exporta el directorio de estudiantes a Excel
 */
export function exportStudentsToExcel(students: Student[]) {
  const wb = XLSX.utils.book_new();
  const rows = students.map((s, i) => ({
    'N°': i + 1,
    'Código': s.studentCode,
    'DNI / Documento': s.documentNumber,
    'Apellidos y Nombres': s.firstName && s.lastName ? `${s.lastName}, ${s.firstName}` : s.fullName,
    'Facultad': s.faculty,
    'Carrera': s.career,
    'Correo Institucional': s.email,
    'Teléfono': s.phone || '—',
    'Idioma / Especialidad': s.primaryLanguage || '—',
    'Total Visitas': s.totalVisits,
    'Última Visita': s.lastVisitAt ? new Date(s.lastVisitAt).toLocaleDateString('es-PE') : 'Sin visitas'
  }));

  const now = new Date();
  const fechaGeneracion = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaGeneracion = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const titleRows = [
    ['UNIVERSIDAD RICARDO PALMA'],
    ['Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo'],
    ['DIRECTORIO DE ESTUDIANTES'],
    [`Fecha y hora de emisión: ${fechaGeneracion} a las ${horaGeneracion}`],
    [`Total estudiantes registrados: ${students.length}`],
    []
  ];

  const ws = XLSX.utils.aoa_to_sheet(titleRows);
  XLSX.utils.sheet_add_json(ws, rows, { origin: 'A7' });
  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 16 },
    { wch: 32 },
    { wch: 28 },
    { wch: 28 },
    { wch: 30 },
    { wch: 16 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Directorio_Estudiantes');
  XLSX.writeFile(wb, `Directorio_Estudiantes_URP_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta el directorio de personas (Docentes, Visitantes, Maestrandos, Doctorandos) a Excel
 */
export function exportPersonsToExcel(persons: LibraryPerson[], personType: string) {
  const wb = XLSX.utils.book_new();
  const rows = persons.map((p, i) => {
    const base: Record<string, any> = {
      'N°': i + 1,
      'DNI / Documento': p.documentNumber,
    };

    if (personType !== 'Visitante' && personType !== 'Docente') {
      base['Código'] = p.code || '—';
    }

    base['Apellidos y Nombres'] = p.fullName || `${p.lastName}, ${p.firstName}`.trim();

    if (personType === 'Alumno') {
      base['Facultad'] = p.faculty || '—';
      base['Carrera'] = p.career || '—';
    } else if (personType === 'Maestrando' || personType === 'Doctorando') {
      base['Programa'] = p.program || '—';
    }

    base['Correo Electrónico'] = p.email || '—';
    base['Teléfono'] = p.phone || '—';
    base['Total Visitas'] = p.totalVisits || 0;
    base['Última Visita'] = p.lastVisitAt ? new Date(p.lastVisitAt).toLocaleDateString('es-PE') : 'Sin visitas';
    
    return base;
  });

  const now = new Date();
  const fechaGeneracion = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaGeneracion = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const titleRows = [
    ['UNIVERSIDAD RICARDO PALMA'],
    ['Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo'],
    [`DIRECTORIO DE ${personType.toUpperCase()}S`],
    [`Fecha y hora de emisión: ${fechaGeneracion} a las ${horaGeneracion}`],
    [`Total registros: ${persons.length}`],
    []
  ];

  const ws = XLSX.utils.aoa_to_sheet(titleRows);
  XLSX.utils.sheet_add_json(ws, rows, { origin: 'A7' });
  ws['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 16 },
    { wch: 32 },
    { wch: 30 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, `Directorio_${personType}s`);
  XLSX.writeFile(wb, `Directorio_${personType}s_URP_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export interface UnifiedCommunityRow {
  code: string;
  documentNumber: string;
  fullName: string;
  faculty: string;
  career: string;
  program: string;
  email: string;
  phone: string;
  totalVisits: number;
  lastVisitAt?: string;
  personType?: string;
}

/**
 * Exporta la tabla unificada de la Comunidad a Excel con las 11 columnas exactas
 */
export function exportCommunityMembersToExcel(members: UnifiedCommunityRow[], categoryLabel: string = 'Todos') {
  if (!members || members.length === 0) {
    alert('No hay registros para exportar con los filtros seleccionados.');
    return;
  }

  const wb = XLSX.utils.book_new();
  const rows = members.map((m, i) => {
    const row: Record<string, any> = {
      'N°': i + 1,
      'CODIGO': m.code || '—',
      'DNI': m.documentNumber || '—',
      'NOMBRES COMPLETOS': m.fullName || '—',
    };

    if (categoryLabel === 'Todos') {
      row['TIPO DE USUARIO'] = m.personType || '—';
    }

    row['FACULTAD'] = m.faculty || '—';
    row['CARRERA PROFESIONAL'] = m.career || '—';
    row['PROGRAMA'] = m.program || '—';
    row['CORREO'] = m.email || '—';
    row['CELULAR'] = m.phone || '—';
    row['TOTAL VISITAS'] = m.totalVisits || 0;
    row['ULTIMA VISITA'] = m.lastVisitAt ? new Date(m.lastVisitAt).toLocaleDateString('es-PE') : 'Sin visitas';

    return row;
  });

  const now = new Date();
  const fechaGeneracion = now.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaGeneracion = now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const titleRows = [
    ['UNIVERSIDAD RICARDO PALMA'],
    ['Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo'],
    [`DIRECTORIO DE COMUNIDAD UNIVERSITARIA - ${categoryLabel === 'Todos' ? 'TODOS LOS USUARIOS' : categoryLabel.toUpperCase() + 'S'}`],
    [`Fecha y hora de emisión: ${fechaGeneracion} a las ${horaGeneracion}`],
    [`Total miembros registrados: ${members.length}`],
    []
  ];

  const ws = XLSX.utils.aoa_to_sheet(titleRows);
  XLSX.utils.sheet_add_json(ws, rows, { origin: 'A7' });
  const cols = [
    { wch: 6 },
    { wch: 16 },
    { wch: 14 },
    { wch: 32 }
  ];
  if (categoryLabel === 'Todos') {
    cols.push({ wch: 16 });
  }
  cols.push(
    { wch: 28 },
    { wch: 28 },
    { wch: 30 },
    { wch: 28 },
    { wch: 15 },
    { wch: 14 },
    { wch: 16 }
  );
  ws['!cols'] = cols;

  const pluralRoleMap: Record<string, string> = {
    'Todos': 'Todos_los_Usuarios',
    'Alumno': 'Alumnos',
    'Docente': 'Docentes',
    'Visitante': 'Visitantes',
    'Maestrando': 'Maestrandos',
    'Doctorando': 'Doctorandos'
  };

  const rolePlural = pluralRoleMap[categoryLabel] || categoryLabel;
  XLSX.utils.book_append_sheet(wb, ws, rolePlural.slice(0, 31));
  XLSX.writeFile(wb, `Comunidad_URP_${rolePlural}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exporta el reporte estadístico histórico (asistencias, días concurridos, top estudiantes, carreras y motivos) a PDF
 */
export function exportHistoricoReportPDF(
  periodDescription: string,
  records: AttendanceRecord[],
  peakDaysData: { day: string; count: number }[],
  topStudentsData: { fullName: string; visitCount: number; studentCode?: string }[],
  careerData: { name: string; count: number; percentage: number }[],
  reasonData: { name: string; count: number; percentage: number }[],
  summary?: AnalyticsSummary | null
) {
  const doc = new jsPDF();

  // Encabezado institucional URP Verde
  doc.setFillColor(15, 81, 66);
  doc.rect(0, 0, 210, 28, 'F');

  // Línea dorada institucional
  doc.setFillColor(180, 83, 9);
  doc.rect(0, 28, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD RICARDO PALMA', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo', 14, 17);
  doc.text(`Fecha y hora de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 14, 23);

  // Título del reporte
  doc.setTextColor(15, 81, 66);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME ESTADÍSTICO HISTÓRICO DE ASISTENCIAS', 14, 38);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período analizado: ${periodDescription}`, 14, 44);

  // Estadísticas del período
  const totalVisits = records.length;
  const uniqueStudents = new Set(records.map(r => r.studentCode)).size;

  let peakDayStr = 'Sin afluencia';
  let maxDayCount = 0;
  peakDaysData.forEach(d => {
    if (d.count > maxDayCount) {
      maxDayCount = d.count;
      peakDayStr = `${d.day} (${d.count} visitas)`;
    }
  });

  const topCareerStr = careerData.length > 0 ? `${careerData[0].name} (${careerData[0].count} visitas)` : 'N/A';

  // Caja de métricas
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 47, 182, 17, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Asistencias: ', 18, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalVisits}`, 45, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Alumnos Únicos: ', 70, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${uniqueStudents}`, 94, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Día con Más Visitas: ', 120, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(`${peakDayStr}`, 148, 54);

  doc.setFont('helvetica', 'bold');
  doc.text('Carrera con Mayor Afluencia: ', 18, 60);
  doc.setFont('helvetica', 'normal');
  doc.text(`${topCareerStr}`, 58, 60);

  // Sección 1: Concurrencia por Día
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 81, 66);
  doc.text('Concurrencia por Día de la Semana', 14, 71);

  const daysTableHead = peakDaysData.map(d => d.day);
  const daysTableData = [peakDaysData.map(d => d.count.toString())];

  autoTable(doc, {
    startY: 74,
    head: [daysTableHead],
    body: daysTableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7.5,
      halign: 'center',
      cellPadding: 2,
      fontStyle: 'bold'
    },
    margin: { left: 14, right: 14 }
  });

  let currentY = (doc as any).lastAutoTable?.finalY || 88;

  // Sección 2: Top Estudiantes
  if (topStudentsData.length > 0) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 81, 66);
    doc.text('Ranking de Estudiantes Asiduos', 14, currentY + 8);

    const studentsRows = topStudentsData.map((s, idx) => [
      `#${idx + 1}`,
      s.fullName,
      `${s.visitCount} ingresos`
    ]);

    autoTable(doc, {
      startY: currentY + 11,
      head: [['Puesto', 'Estudiante', 'Total de Ingresos']],
      body: studentsRows,
      theme: 'striped',
      headStyles: {
        fillColor: [180, 83, 9],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 7.2,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [254, 252, 232]
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
  }

  // Sección 3: Listado de Asistencias del Período
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 81, 66);
  doc.text('Registros de Asistencia en el Período', 14, currentY + 8);

  const tableData = records.length === 0 ? [
    ['-', '-', '-', 'No se registraron asistencias en este período.', '-', '-', '-', '-']
  ] : records.map((r, i) => [
    (i + 1).toString(),
    r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
    r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
    r.studentCode,
    r.studentName,
    r.career,
    r.visitReason,
    r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
  ]);

  autoTable(doc, {
    startY: currentY + 11,
    head: [['#', 'Fecha', 'Hora', 'Código', 'Estudiante', 'Carrera', 'Motivo', 'Método']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.2,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  const safeFilename = periodDescription.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  doc.save(`Reporte_Historico_URP_${safeFilename}.pdf`);
}

/**
 * Exporta el reporte estadístico histórico a Excel
 */
export function exportHistoricoReportExcel(
  periodDescription: string,
  records: AttendanceRecord[],
  peakDaysData: { day: string; count: number }[],
  topStudentsData: { fullName: string; visitCount: number; studentCode?: string }[],
  careerData: { name: string; count: number; percentage: number }[],
  reasonData: { name: string; count: number; percentage: number }[]
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Asistencias del Período
  const attendanceRows = records.map((r, i) => ({
    'N°': i + 1,
    'Fecha': r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
    'Hora': r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
    'Código Estudiante': r.studentCode,
    'Estudiante': r.studentName,
    'Carrera': r.career,
    'Motivo de Visita': r.visitReason,
    'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
  }));

  const wsAttendance = XLSX.utils.json_to_sheet(
    attendanceRows.length > 0 ? attendanceRows : [{ 'Mensaje': `No se encontraron asistencias registradas en ${periodDescription}` }]
  );
  wsAttendance['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 },
    { wch: 30 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Asistencias_Periodo');

  // Hoja 2: Días con Más Visitas
  const daysRows = peakDaysData.map(d => ({
    'Día de la Semana': d.day,
    'Cantidad de Visitas': d.count
  }));
  const wsDays = XLSX.utils.json_to_sheet(daysRows);
  wsDays['!cols'] = [{ wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsDays, 'Dias_Concurrencia');

  // Hoja 3: Ranking de Estudiantes
  const studentsRows = topStudentsData.map((s, idx) => ({
    'Puesto': idx + 1,
    'Estudiante': s.fullName,
    'Total Visitas': s.visitCount
  }));
  const wsStudents = XLSX.utils.json_to_sheet(
    studentsRows.length > 0 ? studentsRows : [{ 'Mensaje': 'Sin datos de ranking' }]
  );
  wsStudents['!cols'] = [{ wch: 10 }, { wch: 32 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Ranking_Estudiantes');

  // Hoja 4: Afluencia por Carrera
  const careerRows = careerData.map(c => ({
    'Carrera': c.name,
    'Total Asistencias': c.count,
    'Porcentaje (%)': `${c.percentage}%`
  }));
  const wsCareer = XLSX.utils.json_to_sheet(
    careerRows.length > 0 ? careerRows : [{ 'Carrera': 'Sin registros', 'Total Asistencias': 0, 'Porcentaje (%)': '0%' }]
  );
  wsCareer['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCareer, 'Afluencia_Carreras');

  // Hoja 5: Motivos de Visita
  const reasonRows = reasonData.map(m => ({
    'Motivo': m.name,
    'Total Visitas': m.count,
    'Porcentaje (%)': `${m.percentage}%`
  }));
  const wsReason = XLSX.utils.json_to_sheet(
    reasonRows.length > 0 ? reasonRows : [{ 'Motivo': 'Sin registros', 'Total Visitas': 0, 'Porcentaje (%)': '0%' }]
  );
  wsReason['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsReason, 'Motivos_Visita');

  const safeFilename = periodDescription.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  XLSX.writeFile(wb, `Reporte_Historico_URP_${safeFilename}.xlsx`);
}
