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
 * Exporta listado de asistencias a PDF (general)
 */
export function exportAttendanceToPDF(
  records: AttendanceRecord[], 
  summary?: AnalyticsSummary | null,
  title: string = 'INFORME DE CONTROL DE ASISTENCIA',
  subtitle: string = '',
  personType: string = 'Todos',
  codeToPerson?: Map<string, LibraryPerson>
) {
  const doc = new jsPDF();

  doc.setFillColor(15, 81, 66);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFillColor(180, 83, 9);
  doc.rect(0, 28, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD RICARDO PALMA', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Facultad de Humanidades y Lenguas Modernas | Biblioteca Especializada San Jerónimo', 14, 17);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 14, 23);

  doc.setTextColor(15, 81, 66);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 38);

  if (subtitle) {
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 44);
  }

  let head = [['#', 'Fecha', 'Hora', 'Código', 'Estudiante', 'Facultad', 'Carrera', 'Motivo', 'Método']];
  let tableData: any[][] = [];

  if (personType === 'Todos') {
    head = [['#', 'Fecha', 'Hora', 'Tipo', 'DNI/Cód', 'Usuario', 'Detalles', 'Motivo', 'Método']];
    tableData = records.map((r, i) => {
      const p = codeToPerson?.get(r.studentCode);
      let details = r.career || r.faculty || '—';
      if (p) {
        if (p.personType === 'Alumno') details = `${p.faculty || ''} - ${p.career || ''}`;
        else if (p.personType === 'Docente') details = p.faculty || '—';
        else if (p.personType === 'Maestrando' || p.personType === 'Doctorando') details = p.program || '—';
      }
      return [
        (i + 1).toString(),
        r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
        r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
        p?.personType || r.personType || 'Alumno',
        r.studentCode,
        r.studentName,
        details,
        r.visitReason,
        r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
      ];
    });
  } else if (personType === 'Alumno') {
    head = [['#', 'Fecha', 'Hora', 'Código', 'Estudiante', 'Facultad', 'Carrera', 'Motivo', 'Método']];
    tableData = records.map((r, i) => [
      (i + 1).toString(),
      r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
      r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
      r.studentCode,
      r.studentName,
      r.faculty || '—',
      r.career,
      r.visitReason,
      r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
    ]);
  } else if (personType === 'Docente') {
    head = [['#', 'Fecha', 'Hora', 'DNI/Cód', 'Docente', 'Motivo', 'Método']];
    tableData = records.map((r, i) => {
      return [
        (i + 1).toString(),
        r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
        r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
        r.studentCode,
        r.studentName,
        r.visitReason,
        r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
      ];
    });
  } else if (personType === 'Maestrando' || personType === 'Doctorando') {
    head = [['#', 'Fecha', 'Hora', 'DNI/Cód', personType, 'Programa', 'Motivo', 'Método']];
    tableData = records.map((r, i) => {
      const p = codeToPerson?.get(r.studentCode);
      return [
        (i + 1).toString(),
        r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
        r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
        r.studentCode,
        r.studentName,
        p?.program || r.career || '—',
        r.visitReason,
        r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
      ];
    });
  } else if (personType === 'Visitante') {
    head = [['#', 'Fecha', 'Hora', 'DNI', 'Visitante', 'Motivo', 'Método']];
    tableData = records.map((r, i) => [
      (i + 1).toString(),
      r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
      r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
      r.studentCode,
      r.studentName,
      r.visitReason,
      r.entryMethod === 'Barcode' ? 'Lector' : 'Manual'
    ]);
  }

  autoTable(doc, {
    startY: subtitle ? 48 : 44,
    head: head,
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

  doc.save(`Reporte_Asistencia_URP_${new Date().toISOString().slice(0, 10)}.pdf`);
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

  if (personType === 'Todos') {
    attendanceRows = records.map((r, i) => {
      const p = codeToPerson?.get(r.studentCode);
      let details = r.career || r.faculty || '—';
      if (p) {
        if (p.personType === 'Alumno') details = `${p.faculty || ''} - ${p.career || ''}`;
        else if (p.personType === 'Docente') details = p.faculty || '—';
        else if (p.personType === 'Maestrando' || p.personType === 'Doctorando') details = p.program || '—';
      }
      return {
        'N°': i + 1,
        'Fecha': r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
        'Hora': r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
        'Tipo': p?.personType || r.personType || 'Alumno',
        'DNI/Cód': r.studentCode,
        'Usuario': r.studentName,
        'Detalles': details,
        'Motivo de Visita': r.visitReason,
        'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
      };
    });
    cols = [{wch: 6}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 16}, {wch: 30}, {wch: 30}, {wch: 22}, {wch: 18}];
  } else if (personType === 'Alumno') {
    attendanceRows = records.map((r, i) => ({
      'N°': i + 1,
      'Fecha': r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
      'Hora': r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
      'Código Estudiante': r.studentCode,
      'Estudiante': r.studentName,
      'Facultad': r.faculty || '—',
      'Carrera': r.career,
      'Motivo de Visita': r.visitReason,
      'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
    }));
    cols = [{wch: 6}, {wch: 12}, {wch: 12}, {wch: 16}, {wch: 30}, {wch: 28}, {wch: 28}, {wch: 22}, {wch: 18}];
  } else if (personType === 'Docente') {
    attendanceRows = records.map((r, i) => {
      return {
        'N°': i + 1,
        'Fecha': r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
        'Hora': r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
        'DNI/Cód': r.studentCode,
        'Docente': r.studentName,
        'Motivo de Visita': r.visitReason,
        'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
      };
    });
    cols = [{wch: 6}, {wch: 12}, {wch: 12}, {wch: 16}, {wch: 30}, {wch: 22}, {wch: 18}];
  } else if (personType === 'Maestrando' || personType === 'Doctorando') {
    attendanceRows = records.map((r, i) => {
      const p = codeToPerson?.get(r.studentCode);
      return {
        'N°': i + 1,
        'Fecha': r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
        'Hora': r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
        'DNI/Cód': r.studentCode,
        [personType]: r.studentName,
        'Programa': p?.program || r.career || '—',
        'Motivo de Visita': r.visitReason,
        'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
      };
    });
    cols = [{wch: 6}, {wch: 12}, {wch: 12}, {wch: 16}, {wch: 30}, {wch: 30}, {wch: 22}, {wch: 18}];
  } else if (personType === 'Visitante') {
    attendanceRows = records.map((r, i) => ({
      'N°': i + 1,
      'Fecha': r.dateString || (r.timestamp ? r.timestamp.split('T')[0] : '—'),
      'Hora': r.timeString || (r.timestamp ? r.timestamp.split('T')[1]?.slice(0, 8) : '—'),
      'DNI': r.studentCode,
      'Visitante': r.studentName,
      'Motivo de Visita': r.visitReason,
      'Método de Ingreso': r.entryMethod === 'Barcode' ? 'Lector de Barras' : 'Manual'
    }));
    cols = [{wch: 6}, {wch: 12}, {wch: 12}, {wch: 16}, {wch: 30}, {wch: 22}, {wch: 18}];
  }

  const wsAttendance = XLSX.utils.json_to_sheet(attendanceRows);
  wsAttendance['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Asistencias');

  if (students && students.length > 0) {
    const studentRows = students.map(s => ({
      'Código': s.studentCode,
      'DNI': s.documentNumber,
      'Nombres': s.firstName,
      'Apellidos': s.lastName,
      'Carrera': s.career,
      'Idioma Principal': s.primaryLanguage,
      'Email': s.email,
      'Teléfono': s.phone,
      'Total Visitas': s.totalVisits,
      'Última Visita': s.lastVisitAt ? new Date(s.lastVisitAt).toLocaleDateString('es-PE') : 'Sin visitas'
    }));
    const wsStudents = XLSX.utils.json_to_sheet(studentRows);
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Directorio_Estudiantes');
  }

  const filename = customFilename || `Reporte_Asistencia_URP_${new Date().toISOString().slice(0, 10)}.xlsx`;
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
  const ws = XLSX.utils.json_to_sheet(rows);
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

  const ws = XLSX.utils.json_to_sheet(rows);
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
