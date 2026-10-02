// API Client for Biblioteca Especializada San Jerónimo - URP

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
  personType?: string;
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
  // Checkout fields
  isActive: boolean;
  checkOutTimestamp?: string;
  checkOutTimeString?: string;
  durationMinutes: number;
}

export const PERSON_TYPES = ['Alumno', 'Docente', 'Visitante', 'Maestrando', 'Doctorando'] as const;
export type PersonTypeValue = typeof PERSON_TYPES[number];

export interface LibraryPerson {
  id?: string;
  personType: PersonTypeValue;
  code: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  faculty: string;
  career: string;
  program: string;
  email: string;
  phone: string;
  totalVisits: number;
  createdAt?: string;
  lastVisitAt?: string;
}

export interface RegisterLibraryPersonDto {
  personType: PersonTypeValue;
  code?: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  faculty?: string;
  career?: string;
  program?: string;
  email: string;
  phone: string;
  checkInNow?: boolean;
  visitReason?: string;
  entryMethod?: string;
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
  /** true = this scan was a CHECK-OUT, false = CHECK-IN */
  isCheckOut: boolean;
  message: string;
  student?: Student;
  attendanceRecord?: AttendanceRecord;
  currentOccupancy: number;
  maxCapacity: number;
  occupancyPercentage: number;
  quote?: LiteraryQuote;
  durationMinutes: number;
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

// Helper to get auth token from either 'token' or 'authSession' in localStorage
export const getAuthToken = (): string | null => {
  const directToken = localStorage.getItem('token');
  if (directToken) return directToken;
  try {
    const sessionStr = localStorage.getItem('authSession');
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      return parsed.token || null;
    }
  } catch {
    // Ignore JSON parse errors
  }
  return null;
};

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
      throw new Error('Error al conectar con el servidor.');
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
      console.warn('[API error registerStudent]', err);
      return { success: false, message: err.message || 'Error al conectar con el servidor.' };
    }
  },

  // Get Occupancy
  async getOccupancy(): Promise<OccupancyData> {
    try {
      const res = await fetch(`${API_BASE}/attendance/occupancy`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { currentOccupancy: 0, maxCapacity: 60, occupancyPercentage: 0 };
  },

  // Get Server Time (Peru UTC-5 from VPS)
  async getServerTime(): Promise<{ timestamp: number; timeString: string; dateString: string } | null> {
    try {
      const res = await fetch(`${API_BASE}/attendance/server-time`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
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

  // Clear Attendance Database
  async clearAttendance(token: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/analytics/clear-attendance`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        return await res.json();
      }
      return { success: false, message: 'Error al limpiar la base de datos de asistencia.' };
    } catch (e) {
      return { success: false, message: 'Error al conectar con el servidor.' };
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
      return { success: false, message: 'Error al conectar con el servidor.' };
    }
  },

  // Update Admin Profile
  async updateProfile(token: string, data: { currentPassword: string; username?: string; fullName?: string; password?: string }): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: 'Error al conectar con el servidor.' };
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
      console.warn('[API error getAcademicTree]', e);
      return [];
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
  },

  // ── Library Persons (Docentes, Visitantes, Maestrandos, Doctorandos) ──────

  async getPersons(type?: string, tokenOverride?: string): Promise<LibraryPerson[]> {
    try {
      const url = type ? `${API_BASE}/persons?type=${type}` : `${API_BASE}/persons`;
      const token = tokenOverride || getAuthToken();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async registerPerson(data: RegisterLibraryPersonDto): Promise<{ success: boolean; message?: string; person?: LibraryPerson }> {
    try {
      const res = await fetch(`${API_BASE}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) return { success: false, message: json.message || 'Error al registrar.' };
      return { success: true, person: json };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error de conexión' };
    }
  },

  async updatePerson(id: string, data: Partial<LibraryPerson>, tokenOverride?: string): Promise<{ success: boolean; person?: LibraryPerson; message?: string }> {
    try {
      const token = tokenOverride || getAuthToken();
      const res = await fetch(`${API_BASE}/persons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if (!res.ok) return { success: false, message: json.message };
      return { success: true, person: json };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  async deletePerson(id: string, tokenOverride?: string): Promise<{ success: boolean; message?: string }> {
    try {
      const token = tokenOverride || getAuthToken();
      const res = await fetch(`${API_BASE}/persons/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.status === 204) return { success: true };
      const json = await res.json();
      return { success: false, message: json.message };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }
};

