import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AttendanceRecord, Student, AnalyticsSummary, LibraryPerson } from '../services/api';

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
/**
 * Exporta el reporte estadístico histórico (asistencias, concurrencia temporal, top estudiantes, tipos de usuario y carreras) a PDF
 */
export function exportHistoricoReportPDF(
  periodDescription: string,
  records: AttendanceRecord[],
  temporalData: { day: string; count: number; totalMinutes?: number; formattedTime?: string }[],
  topStudentsData: { fullName: string; visitCount: number; studentCode?: string; personType?: string }[],
  careerData: { name: string; count: number; percentage: number }[],
  personTypeData?: { name: string; count: number; percentage: number }[],
  summary?: AnalyticsSummary | null
) {
  // Formato Horizontal (Landscape) para presentar limpiamente todas las columnas
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado institucional URP Verde
  doc.setFillColor(15, 81, 66);
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Línea dorada institucional
  doc.setFillColor(180, 83, 9);
  doc.rect(0, 26, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD RICARDO PALMA', 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo', 14, 16);
  doc.text(`Fecha y hora de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 14, 22);

  // Título del reporte
  doc.setTextColor(15, 81, 66);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME ESTADÍSTICO HISTÓRICO DE ASISTENCIAS', 14, 36);

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Período analizado: ${periodDescription.toUpperCase()}`, 14, 42);

  // Estadísticas del período
  const totalVisits = records.length;
  const uniqueStudents = new Set(records.map(r => r.studentCode)).size;

  let totalMinutesSum = 0;
  records.forEach(r => {
    totalMinutesSum += (r.durationMinutes || 0);
  });
  const totalHours = Math.floor(totalMinutesSum / 60);
  const totalMins = totalMinutesSum % 60;
  const totalTimeFormatted = totalHours > 0 ? `${totalHours}h ${totalMins}m` : `${totalMins} min`;

  let peakTemporalStr = 'Sin afluencia';
  let maxTemporalCount = 0;
  (temporalData || []).forEach(d => {
    if (d.count > maxTemporalCount) {
      maxTemporalCount = d.count;
      peakTemporalStr = `${d.day} (${d.count} visitas)`;
    }
  });

  const topCareerStr = careerData && careerData.length > 0 ? `${careerData[0].name} (${careerData[0].count} visitas)` : 'N/A';
  const topPersonTypeStr = personTypeData && personTypeData.length > 0 ? `${personTypeData[0].name} (${personTypeData[0].count} asistencias)` : 'N/A';

  // Caja de métricas (KPIs)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 46, pageWidth - 28, 16, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Asistencias:', 18, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalVisits}`, 48, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Usuarios Únicos:', 70, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`${uniqueStudents}`, 98, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Tiempo Total Acumulado:', 125, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalTimeFormatted}`, 168, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Período / Día Pico:', 205, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(`${peakTemporalStr}`, 235, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Programa con Mayor Afluencia:', 18, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(`${topCareerStr}`, 68, 58);

  doc.setFont('helvetica', 'bold');
  doc.text('Rol con Mayor Afluencia:', 155, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(`${topPersonTypeStr}`, 196, 58);

  let currentY = 67;

  // Sección 1: Concurrencia Temporal en el Período
  if (temporalData && temporalData.length > 0) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 81, 66);
    doc.text('1. Concurrencia Temporal en el Período', 14, currentY);

    const temporalHead = temporalData.map(d => d.day);
    const temporalVisitsRow = temporalData.map(d => `${d.count}`);
    const temporalTimeRow = temporalData.map(d => d.formattedTime || (d.totalMinutes ? `${d.totalMinutes}m` : '0m'));

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Métrica \\ Período', ...temporalHead]],
      body: [
        ['Total Visitas', ...temporalVisitsRow],
        ['Permanencia', ...temporalTimeRow]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [15, 81, 66],
        textColor: [255, 255, 255],
        fontSize: 7.2,
        halign: 'center',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 7,
        halign: 'center',
        cellPadding: 2,
        fontStyle: 'bold'
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 20;
  }

  // Sección 2: Ranking de Usuarios Asiduos
  if (topStudentsData && topStudentsData.length > 0) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 81, 66);
    doc.text('2. Ranking de Usuarios Asiduos', 14, currentY + 7);

    const studentsRows = topStudentsData.map((s, idx) => [
      `#${idx + 1}`,
      s.studentCode || '—',
      s.fullName,
      s.personType || 'Alumno',
      `${s.visitCount} visitas`
    ]);

    autoTable(doc, {
      startY: currentY + 10,
      head: [['Puesto', 'Código / DNI', 'Nombre Completo', 'Tipo / Rol', 'Total Asistencias']],
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

    currentY = (doc as any).lastAutoTable?.finalY || currentY + 25;
  }

  // Sección 3: Listado de Registros en el Período
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 81, 66);
  doc.text('3. Registros de Asistencia del Período', 14, currentY + 7);

  const tableData = records.length === 0 ? [
    ['-', '-', '-', '-', '-', '-', '-', '-', '-', 'No se encontraron asistencias registradas en este período.']
  ] : records.map((r, i) => {
    const ee = getAttendanceEntryExit(r);
    return [
      (i + 1).toString(),
      ee.dateFormatted,
      ee.entrada,
      ee.salida,
      ee.duracion,
      ee.estado,
      r.personType || 'Alumno',
      r.studentCode,
      r.studentName,
      (r as any).program || r.career || 'Sin Carrera'
    ];
  });

  autoTable(doc, {
    startY: currentY + 10,
    head: [['#', 'Fecha', 'Hora Ing.', 'Hora Sal.', 'Estadía', 'Estado', 'Tipo Usuario', 'Código / DNI', 'Nombres y Apellidos', 'Programa / Carrera']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 7.2,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 14, right: 14 }
  });

  // Numeración de páginas institucional
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Control de Asistencia - Biblioteca Especializada San Jerónimo | URP', 14, 204);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - 30, 204);
  }

  const safeFilename = periodDescription.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  doc.save(`Reporte_Historico_URP_${safeFilename}.pdf`);
}

/**
 * Exporta el reporte estadístico histórico a Excel con hojas múltiples detalladas
 */
export function exportHistoricoReportExcel(
  periodDescription: string,
  records: AttendanceRecord[],
  temporalData: { day: string; count: number; totalMinutes?: number; formattedTime?: string }[],
  topStudentsData: { fullName: string; visitCount: number; studentCode?: string; personType?: string }[],
  careerData: { name: string; count: number; percentage: number }[],
  personTypeData?: { name: string; count: number; percentage: number }[]
) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Asistencias del Período
  const attendanceRows = records.map((r, i) => {
    const ee = getAttendanceEntryExit(r);
    return {
      'N°': i + 1,
      'Fecha': ee.dateFormatted,
      'Hora Ingreso': ee.entrada,
      'Hora Salida': ee.salida,
      'Permanencia': ee.duracion,
      'Estado': ee.estado,
      'Tipo de Usuario': r.personType || 'Alumno',
      'Código / DNI': r.studentCode,
      'Estudiante / Usuario': r.studentName,
      'Programa / Carrera': (r as any).program || r.career || 'Sin Carrera',
      'Motivo de Visita': r.visitReason,
      'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
    };
  });

  const wsAttendance = XLSX.utils.json_to_sheet(
    attendanceRows.length > 0 ? attendanceRows : [{ 'Mensaje': `No se encontraron asistencias registradas en ${periodDescription}` }]
  );
  wsAttendance['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 32 },
    { wch: 30 },
    { wch: 22 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Asistencias_Periodo');

  // Hoja 2: Concurrencia Temporal
  const temporalRows = (temporalData || []).map(d => ({
    'Período / Día': d.day,
    'Cantidad de Visitas': d.count,
    'Permanencia Total': d.formattedTime || (d.totalMinutes ? `${d.totalMinutes} min` : '0 min'),
    'Minutos Totales': d.totalMinutes || 0
  }));
  const wsTemporal = XLSX.utils.json_to_sheet(temporalRows.length > 0 ? temporalRows : [{ 'Mensaje': 'Sin datos temporales' }]);
  wsTemporal['!cols'] = [{ wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsTemporal, 'Concurrencia_Temporal');

  // Hoja 3: Ranking de Usuarios
  const studentsRows = (topStudentsData || []).map((s, idx) => ({
    'Puesto': idx + 1,
    'Código / DNI': s.studentCode || '—',
    'Usuario': s.fullName,
    'Tipo / Rol': s.personType || 'Alumno',
    'Total Visitas': s.visitCount
  }));
  const wsStudents = XLSX.utils.json_to_sheet(
    studentsRows.length > 0 ? studentsRows : [{ 'Mensaje': 'Sin datos de ranking' }]
  );
  wsStudents['!cols'] = [{ wch: 10 }, { wch: 16 }, { wch: 32 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsStudents, 'Ranking_Usuarios');

  // Hoja 4: Afluencia por Tipo de Usuario
  if (personTypeData && personTypeData.length > 0) {
    const personTypeRows = personTypeData.map(p => ({
      'Tipo de Usuario': p.name,
      'Total Asistencias': p.count,
      'Porcentaje (%)': `${p.percentage}%`
    }));
    const wsPersonType = XLSX.utils.json_to_sheet(personTypeRows);
    wsPersonType['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsPersonType, 'Afluencia_Tipo_Usuario');
  }

  // Hoja 5: Afluencia por Programa / Carrera
  const careerRows = (careerData || []).map(c => ({
    'Programa / Carrera': c.name,
    'Total Asistencias': c.count,
    'Porcentaje (%)': `${c.percentage}%`
  }));
  const wsCareer = XLSX.utils.json_to_sheet(
    careerRows.length > 0 ? careerRows : [{ 'Programa / Carrera': 'Sin registros', 'Total Asistencias': 0, 'Porcentaje (%)': '0%' }]
  );
  wsCareer['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCareer, 'Afluencia_Programas');

  const safeFilename = periodDescription.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  XLSX.writeFile(wb, `Reporte_Historico_URP_${safeFilename}.xlsx`);
}
