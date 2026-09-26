import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AttendanceRecord, Student, AnalyticsSummary } from '../services/api';

export function exportAttendanceToPDF(
  records: AttendanceRecord[], 
  summary: AnalyticsSummary | null
) {
  const doc = new jsPDF();

  // Header - Institutional Ricardo Palma
  doc.setFillColor(15, 81, 66); // Emerald URP
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('UNIVERSIDAD RICARDO PALMA', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Facultad de Humanidades y Lenguas Modernas - Biblioteca Especializada', 14, 18);
  doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}`, 14, 24);

  // Subtitle
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORME EJECUTIVO DE CONTROL DE ASISTENCIA', 14, 38);

  // KPI boxes
  if (summary) {
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total Alumnos Registrados: ${summary.totalRegisteredStudents}`, 14, 46);
    doc.text(`Asistencias del Mes: ${summary.totalVisitsThisMonth}`, 80, 46);
    doc.text(`Aforo Actual: ${summary.currentOccupancy} / ${summary.maxCapacity} (${summary.occupancyPercentage}%)`, 140, 46);
  }

  // Table
  const tableData = records.map((r, i) => [
    (i + 1).toString(),
    r.dateString,
    r.timeString,
    r.studentCode,
    r.studentName,
    r.career,
    r.visitReason,
    r.entryMethod
  ]);

  autoTable(doc, {
    startY: 52,
    head: [['#', 'Fecha', 'Hora', 'Código', 'Estudiante', 'Carrera', 'Motivo', 'Método']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 81, 66],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250]
    },
    margin: { left: 14, right: 14 }
  });

  doc.save(`Reporte_Asistencia_URP_Lenguas_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportAttendanceToExcel(
  records: AttendanceRecord[], 
  students: Student[]
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Attendances
  const attendanceRows = records.map(r => ({
    'Fecha': r.dateString,
    'Hora': r.timeString,
    'Día': r.dayOfWeek,
    'Código Estudiante': r.studentCode,
    'Nombre Completo': r.studentName,
    'Carrera': r.career,
    'Motivo de Visita': r.visitReason,
    'Especialidad Lingüística': r.languageFocus,
    'Método de Ingreso': r.entryMethod
  }));
  const wsAttendance = XLSX.utils.json_to_sheet(attendanceRows);
  XLSX.utils.book_append_sheet(wb, wsAttendance, 'Asistencias');

  // Sheet 2: Student Directory
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

  XLSX.writeFile(wb, `Base_Datos_Biblioteca_URP_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
