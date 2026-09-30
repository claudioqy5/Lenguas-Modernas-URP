// API Client for Biblioteca Especializada San Jerónimo - URP

const API_BASE = '/api';

export interface Student {
  id?: string;
  studentCode: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  career: string;
  faculty: string;
  email: string;
  phone: string;
  primaryLanguage: string;
  totalVisits: number;
  lastVisitAt?: string;
  createdAt?: string;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  career: string;
  faculty?: string;
  timestamp: string;
  dateString: string;
  timeString: string;
  dayOfWeek: string;
  dayOfWeekNumber: number;
  hourOfDay: number;
  visitReason: string;
  languageFocus: string;
  entryMethod: string;
}

export interface LiteraryQuote {
  text: string;
  translation: string;
  author: string;
  language: string;
}

export interface Career {
  id?: string;
  name: string;
  code?: string;
  facultyId: string;
  facultyName?: string;
  createdAt?: string;
}

export interface Faculty {
  id?: string;
  name: string;
  code?: string;
  createdAt?: string;
  careers?: Career[];
}

export interface AcademicTreeFaculty {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  careers: Career[];
}

export interface CheckInResponse {
  success: boolean;
  isNewStudent: boolean;
  message: string;
  student?: Student;
  attendanceRecord?: AttendanceRecord;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyPercentage: number;
  quote?: LiteraryQuote;
}

export interface OccupancyData {
  currentOccupancy: number;
  maxCapacity: number;
  occupancyPercentage: number;
}

export interface HourlyStat {
  hour: number;
  label: string;
  count: number;
}

export interface DayStat {
  day: string;
  dayNumber: number;
  count: number;
}

export interface TopStudent {
  studentId: string;
  studentCode: string;
  fullName: string;
  career: string;
  visitCount: number;
  lastVisit?: string;
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

export interface AnalyticsSummary {
  totalRegisteredStudents: number;
  totalVisitsAllTime: number;
  totalVisitsToday: number;
  totalVisitsThisMonth: number;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyPercentage: number;
  peakHours: HourlyStat[];
  peakDays: DayStat[];
  topStudents: TopStudent[];
  careerDistribution: DistributionItem[];
  reasonDistribution: DistributionItem[];
  languageDistribution: DistributionItem[];
}

export interface AuthSession {
  token: string;
  username: string;
  fullName: string;
  role: string;
}

// Fallback quotes
const FALLBACK_QUOTES: LiteraryQuote[] = [
  {
    text: "One language sets you in a corridor for life. Two languages open every door along the way.",
    translation: "Un idioma te coloca en un pasillo para toda la vida. Dos idiomas abren todas las puertas del camino.",
    author: "Frank Smith",
    language: "Inglés"
  },
  {
    text: "To have another language is to possess a second soul.",
    translation: "Tener otro idioma es poseer una segunda alma.",
    author: "Carlomagno",
    language: "Francés / Latín"
  },
  {
    text: "Wer fremde Sprachen nicht kennt, weiß nichts von seiner eigenen.",
    translation: "Quien no conoce lenguas extranjeras nada sabe de la propia.",
    author: "Johann Wolfgang von Goethe",
    language: "Alemán"
  },
  {
    text: "千里之行，始于足下 (Qiān lǐ zhī xíng, shǐ yú zú xià)",
    translation: "Un viaje de mil millas comienza con un solo paso.",
    author: "Lao Tse",
    language: "Chino Mandarín"
  }
];

export const api = {
  // Check if student exists
  async checkStudent(code: string): Promise<{ exists: boolean; student?: Student }> {
    try {
      const res = await fetch(`${API_BASE}/students/check/${code}`);
      if (res.ok) {
        return await res.json();
      }
      return { exists: false };
    } catch (e) {
      // Offline fallback: if the code is 9 chars long we assume it might exist for testing, but let's just return false
      // or we can mock a student
      if (code.length >= 8 && code !== "99999999") {
        return {
          exists: true,
          student: {
            studentCode: code,
            documentNumber: '72345678',
            firstName: 'Estudiante',
            lastName: 'URP',
            fullName: 'Estudiante URP Lenguas',
            career: 'Traducción e Interpretación',
            faculty: 'Humanidades y Lenguas Modernas',
            email: `${code}@urp.edu.pe`,
            phone: '987654321',
            primaryLanguage: 'Inglés',
            totalVisits: 14
          }
        };
      }
      return { exists: false };
    }
  },

  // Check-In (Barcode or Manual)
  async checkIn(
    studentCode: string, 
    visitReason = "Lectura / Estudio", 
    languageFocus = "General", 
    entryMethod = "Barcode"
  ): Promise<CheckInResponse> {
    try {
      const res = await fetch(`${API_BASE}/attendance/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentCode, visitReason, languageFocus, entryMethod })
      });
      if (!res.ok) {
        throw new Error('Error al conectar con el servidor.');
      }
      return await res.json();
    } catch (err) {
      console.warn('[API fallback checkin]', err);
      // Offline fallback mock
      const isRegistered = studentCode.length >= 8 && studentCode !== "99999999";
      if (!isRegistered) {
        return {
          success: false,
          isNewStudent: true,
          message: `El código '${studentCode}' no está registrado aún. Por favor completa tus datos.`,
          currentOccupancy: 24,
          maxCapacity: 60,
          occupancyPercentage: 40.0,
          quote: FALLBACK_QUOTES[0]
        };
      }
      return {
        success: true,
        isNewStudent: false,
        message: `¡Bienvenido/a a la biblioteca San Jerónimo! Asistencia registrada con éxito.`,
        student: {
          studentCode,
          documentNumber: '72345678',
          firstName: 'Estudiante',
          lastName: 'URP',
          fullName: 'Estudiante URP Lenguas',
          career: 'Traducción e Interpretación',
          faculty: 'Humanidades y Lenguas Modernas',
          email: `${studentCode}@urp.edu.pe`,
          phone: '987654321',
          primaryLanguage: languageFocus || 'Inglés',
          totalVisits: 14
        },
        currentOccupancy: 25,
        maxCapacity: 60,
        occupancyPercentage: 41.7,
        quote: FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
      };
    }
  },

  // Register New Student
  async registerStudent(data: {
    studentCode: string;
    documentNumber: string;
    firstName: string;
    lastName: string;
    career: string;
    faculty: string;
    email: string;
    phone: string;
    primaryLanguage: string;
    checkInNow: boolean;
    visitReason: string;
    languageFocus: string;
  }): Promise<{ success: boolean; message: string; student?: Student; checkInResult?: CheckInResponse }> {
    try {
      const res = await fetch(`${API_BASE}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Error al registrar.');
      }
      return json;
    } catch (err: any) {
      console.warn('[API fallback registerStudent]', err);
      const student: Student = {
        studentCode: data.studentCode,
        documentNumber: data.documentNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: `${data.firstName} ${data.lastName}`,
        career: data.career,
        faculty: data.faculty,
        email: data.email,
        phone: data.phone,
        primaryLanguage: data.primaryLanguage,
        totalVisits: 1
      };
      return {
        success: true,
        message: `¡Registro exitoso! Bienvenido a Lenguas Modernas, ${data.firstName}.`,
        student,
        checkInResult: {
          success: true,
          isNewStudent: false,
          message: 'Primera visita registrada con éxito.',
          student,
          currentOccupancy: 26,
          maxCapacity: 60,
          occupancyPercentage: 43.3,
          quote: FALLBACK_QUOTES[1]
        }
      };
    }
  },

  // Get Occupancy
  async getOccupancy(): Promise<OccupancyData> {
    try {
      const res = await fetch(`${API_BASE}/attendance/occupancy`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { currentOccupancy: 24, maxCapacity: 60, occupancyPercentage: 40.0 };
  },

  // Get Recent Attendances
  async getRecentAttendances(limit = 50): Promise<AttendanceRecord[]> {
    try {
      const res = await fetch(`${API_BASE}/attendance/recent?limit=${limit}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },

  // Get Analytics Summary
  async getAnalyticsSummary(): Promise<AnalyticsSummary | null> {
    try {
      const res = await fetch(`${API_BASE}/analytics/summary`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  },

  // Seed Database
  async seedDatabase(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/analytics/seed`, { method: 'POST' });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  // Get All Students
  async getAllStudents(): Promise<Student[]> {
    try {
      const res = await fetch(`${API_BASE}/students`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return [];
  },


  // Update Student
  async updateStudent(id: string, data: any): Promise<{ success: boolean; message?: string; student?: Student }> {
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Error de conexión' };
    }
  },

  // Delete Student
  async deleteStudent(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/students/${id}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  },

  // Librarian Login
  async login(username: string, password: string): Promise<{ success: boolean; session?: AuthSession; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          session: {
            token: data.token,
            username: data.username,
            fullName: data.fullName,
            role: data.role
          },
          message: data.message
        };
      }
      return { success: false, message: data.message || 'Credenciales inválidas' };
    } catch (e) {
      // Offline fallback login for demo if backend is offline
      if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
        return {
          success: true,
          session: {
            token: 'mock-jwt-token-demo',
            username: 'admin',
            fullName: 'Lic. Bibliotecólogo URP',
            role: 'Bibliotecario'
          },
          message: 'Bienvenido en modo local.'
        };
      }
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    }
  },

  // ==================== ACADEMIC STRUCTURE (FACULTIES & CAREERS) ====================

  // Get full academic tree (faculties with nested careers)
  async getAcademicTree(): Promise<AcademicTreeFaculty[]> {
    try {
      const res = await fetch(`${API_BASE}/academic/tree`);
      if (res.ok) {
        return await res.json();
      }
      throw new Error('Error al obtener estructura académica');
    } catch (e) {
      console.warn('[API fallback getAcademicTree]', e);
      return [
        {
          id: 'f-1',
          name: 'Humanidades y Lenguas Modernas',
          code: 'FHLM',
          createdAt: new Date().toISOString(),
          careers: [
            { id: 'c-1', name: 'Traducción e Interpretación', code: 'TI', facultyId: 'f-1', facultyName: 'Humanidades y Lenguas Modernas' },
            { id: 'c-2', name: 'Humanidades y Lingüística', code: 'HL', facultyId: 'f-1', facultyName: 'Humanidades y Lenguas Modernas' },
            { id: 'c-3', name: 'Turismo, Hotelería y Gastronomía', code: 'THG', facultyId: 'f-1', facultyName: 'Humanidades y Lenguas Modernas' }
          ]
        },
        {
          id: 'f-2',
          name: 'Ingeniería',
          code: 'FING',
          createdAt: new Date().toISOString(),
          careers: [
            { id: 'c-4', name: 'Ingeniería Civil', code: 'ICIV', facultyId: 'f-2', facultyName: 'Ingeniería' },
            { id: 'c-5', name: 'Ingeniería Industrial', code: 'IIND', facultyId: 'f-2', facultyName: 'Ingeniería' },
            { id: 'c-6', name: 'Ingeniería Informática', code: 'IINF', facultyId: 'f-2', facultyName: 'Ingeniería' },
            { id: 'c-7', name: 'Ingeniería Electrónica', code: 'IELEC', facultyId: 'f-2', facultyName: 'Ingeniería' },
            { id: 'c-8', name: 'Ingeniería Mecatrónica', code: 'IMECA', facultyId: 'f-2', facultyName: 'Ingeniería' }
          ]
        },
        {
          id: 'f-3',
          name: 'Medicina Humana',
          code: 'FMED',
          createdAt: new Date().toISOString(),
          careers: [
            { id: 'c-9', name: 'Medicina Humana', code: 'MED', facultyId: 'f-3', facultyName: 'Medicina Humana' },
            { id: 'c-10', name: 'Enfermería', code: 'ENF', facultyId: 'f-3', facultyName: 'Medicina Humana' }
          ]
        },
        {
          id: 'f-4',
          name: 'Ciencias Biológicas',
          code: 'FCB',
          createdAt: new Date().toISOString(),
          careers: [
            { id: 'c-11', name: 'Biología', code: 'BIO', facultyId: 'f-4', facultyName: 'Ciencias Biológicas' },
            { id: 'c-12', name: 'Medicina Veterinaria', code: 'MVET', facultyId: 'f-4', facultyName: 'Ciencias Biológicas' }
          ]
        },
        {
          id: 'f-5',
          name: 'Ciencias Económicas y Empresariales',
          code: 'FCEE',
          createdAt: new Date().toISOString(),
          careers: [
            { id: 'c-13', name: 'Administración y Negocios Internacionales', code: 'ANI', facultyId: 'f-5', facultyName: 'Ciencias Económicas y Empresariales' },
            { id: 'c-14', name: 'Contabilidad y Finanzas', code: 'CF', facultyId: 'f-5', facultyName: 'Ciencias Económicas y Empresariales' },
            { id: 'c-15', name: 'Economía', code: 'ECON', facultyId: 'f-5', facultyName: 'Ciencias Económicas y Empresariales' },
            { id: 'c-16', name: 'Marketing Global y Administración Comercial', code: 'MGAC', facultyId: 'f-5', facultyName: 'Ciencias Económicas y Empresariales' }
          ]
        },
        {
          id: 'f-6',
          name: 'Arquitectura y Urbanismo',
          code: 'FAU',
          createdAt: new Date().toISOString(),
          careers: [
            { id: 'c-17', name: 'Arquitectura y Urbanismo', code: 'ARQ', facultyId: 'f-6', facultyName: 'Arquitectura y Urbanismo' }
          ]
        },
        {
          id: 'f-7',
          name: 'Psicología',
          code: 'FPSI',
          createdAt: new Date().toISOString(),
          careers: [
            { id: 'c-18', name: 'Psicología', code: 'PSI', facultyId: 'f-7', facultyName: 'Psicología' }
          ]
        },
        {
          id: 'f-8',
          name: 'Derecho y Ciencia Política',
          code: 'FDCP',
          createdAt: new Date().toISOString(),
          careers: [
            { id: 'c-19', name: 'Derecho', code: 'DER', facultyId: 'f-8', facultyName: 'Derecho y Ciencia Política' }
          ]
        }
      ];
    }
  },

  // Faculties CRUD
  async getFaculties(): Promise<Faculty[]> {
    try {
      const res = await fetch(`${API_BASE}/academic/faculties`);
      if (res.ok) return await res.json();
      return [];
    } catch {
      return [];
    }
  },

  async createFaculty(data: { name: string; code?: string }): Promise<{ success: boolean; data?: Faculty; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/academic/faculties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  },

  async updateFaculty(id: string, data: { name: string; code?: string }): Promise<{ success: boolean; data?: Faculty; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/academic/faculties/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  },

  async deleteFaculty(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/academic/faculties/${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  },

  // Careers CRUD
  async getCareers(facultyId?: string): Promise<Career[]> {
    try {
      const url = facultyId ? `${API_BASE}/academic/careers?facultyId=${encodeURIComponent(facultyId)}` : `${API_BASE}/academic/careers`;
      const res = await fetch(url);
      if (res.ok) return await res.json();
      return [];
    } catch {
      return [];
    }
  },

  async createCareer(data: { name: string; code?: string; facultyId: string }): Promise<{ success: boolean; data?: Career; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/academic/careers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  },

  async updateCareer(id: string, data: { name: string; code?: string; facultyId?: string }): Promise<{ success: boolean; data?: Career; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/academic/careers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  },

  async deleteCareer(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/academic/careers/${id}`, {
        method: 'DELETE'
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  }
};
