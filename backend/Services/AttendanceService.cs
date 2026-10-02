using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.DTOs;
using AsistenciaLenguas.Api.Models;
using AsistenciaLenguas.Api.Utils;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Services
{
    public interface IAttendanceService
    {
        Task<CheckInResponseDto> RegisterCheckInAsync(CheckInRequestDto request);
        Task<List<AttendanceRecord>> GetRecentAttendancesAsync(int limit = 50);
        Task<List<AttendanceRecord>> GetAttendancesByDateRangeAsync(DateTime? from, DateTime? to);
        Task<(int currentOccupancy, int maxCapacity, double percentage)> GetOccupancyAsync();
    }

    public class AttendanceService : IAttendanceService
    {
        private readonly MongoDbContext _context;
        private readonly IStudentService _studentService;
        private readonly IQuoteService _quoteService;
        private readonly int _maxCapacity;

        // Minimum seconds between check-in and check-out to prevent accidental double-scans.
        private const int MinSecondsForCheckOut = 30;

        // Library auto-close hour in Peru local time (22 = 10 PM).
        private const int AutoCloseHourPeru = 22;

        // Library operating hours in Peru local time.
        private const int LibraryOpenHour  = 8;   // 08:00 AM
        private const int LibraryCloseHour = 22;  // 10:00 PM (exclusive)

        public AttendanceService(
            MongoDbContext context,
            IStudentService studentService,
            IQuoteService quoteService,
            IConfiguration configuration)
        {
            _context = context;
            _studentService = studentService;
            _quoteService = quoteService;
            _maxCapacity = configuration.GetValue<int>("LibrarySettings:MaxCapacity", 60);
        }

        // Helper: build an attendance record from a LibraryPerson
        private AttendanceRecord BuildRecord(
            string lookupKey, string personId, string personName,
            string career, string faculty, string personType,
            DateTime nowUtc, DateTime peruNow, string todayStr,
            string visitReason, string entryMethod)
        {
            var dayOfWeekSpanish = peruNow.DayOfWeek switch
            {
                DayOfWeek.Monday    => "Lunes",
                DayOfWeek.Tuesday   => "Martes",
                DayOfWeek.Wednesday => "Miércoles",
                DayOfWeek.Thursday  => "Jueves",
                DayOfWeek.Friday    => "Viernes",
                DayOfWeek.Saturday  => "Sábado",
                _                   => "Domingo"
            };
            int dayNumber = peruNow.DayOfWeek switch
            {
                DayOfWeek.Monday    => 1,
                DayOfWeek.Tuesday   => 2,
                DayOfWeek.Wednesday => 3,
                DayOfWeek.Thursday  => 4,
                DayOfWeek.Friday    => 5,
                DayOfWeek.Saturday  => 6,
                _                   => 7
            };
            return new AttendanceRecord
            {
                StudentId       = personId,
                StudentCode     = lookupKey,
                PersonType      = personType,
                StudentName     = personName,
                Career          = career,
                Faculty         = faculty,
                Timestamp       = nowUtc,
                DateString      = todayStr,
                TimeString      = peruNow.ToString("HH:mm:ss"),
                DayOfWeek       = dayOfWeekSpanish,
                DayOfWeekNumber = dayNumber,
                HourOfDay       = peruNow.Hour,
                VisitReason     = string.IsNullOrWhiteSpace(visitReason) ? "Lectura / Estudio" : visitReason,
                EntryMethod     = string.IsNullOrWhiteSpace(entryMethod) ? "Barcode" : entryMethod,
                IsActive        = true
            };
        }

        // ─────────────────────────────────────────────────────────────────────────
        // CORE: Smart toggle (check-in / check-out) with auto-close at 22:00 Peru
        // ─────────────────────────────────────────────────────────────────────────
        public async Task<CheckInResponseDto> RegisterCheckInAsync(CheckInRequestDto request)
        {
            // 1. Auto-close any stale active sessions from before today or past 22:00 Peru.
            await AutoCloseStaleSessionsAsync();

            // 2. Check library operating hours (08:00 – 22:00 Peru).
            var checkHourPeru = DateTimeUtils.NowPeru();
            if (checkHourPeru.Hour < LibraryOpenHour || checkHourPeru.Hour >= LibraryCloseHour)
            {
                string mensaje = checkHourPeru.Hour < LibraryOpenHour
                    ? $"La biblioteca aún no ha abierto. El horario de atención es de 08:00 a 22:00. Vuelve a partir de las 8:00 AM."
                    : $"La biblioteca está cerrada. El horario de atención es de 08:00 a 22:00. ¡Hasta mañana!";

                var (occ, maxCap, pct) = await GetOccupancyAsync();
                return new CheckInResponseDto
                {
                    Success = false,
                    IsNewStudent = false,
                    Message = mensaje,
                    CurrentOccupancy = occ,
                    MaxCapacity = maxCap,
                    OccupancyPercentage = pct,
                    Quote = _quoteService.GetRandomQuote()
                };
            }

            // 3. Resolve the person: first check Students (Alumnos legacy), then LibraryPersons.
            var student = await _studentService.GetByStudentCodeAsync(request.StudentCode);
            var (currentOccupancy, maxCapacity, percentage) = await GetOccupancyAsync();

            // Determine unified person info
            string personId, personCode, firstName, career, faculty, personType;

            if (student != null)
            {
                personId   = student.Id ?? string.Empty;
                personCode = student.StudentCode;
                firstName  = student.FirstName;
                career     = student.Career;
                faculty    = student.Faculty;
                personType = Models.PersonType.Alumno;
            }
            else
            {
                // Try LibraryPersons (Docentes, Visitantes, Maestrandos, Doctorandos)
                var libraryPerson = await _context.LibraryPersons
                    .Find(p => p.Code == request.StudentCode || p.DocumentNumber == request.StudentCode)
                    .FirstOrDefaultAsync();

                if (libraryPerson == null)
                {
                    return new CheckInResponseDto
                    {
                        Success = false,
                        IsNewStudent = true,
                        Message = $"El código/DNI '{request.StudentCode}' no está registrado. Por favor completa tus datos.",
                        CurrentOccupancy = currentOccupancy,
                        MaxCapacity = maxCapacity,
                        OccupancyPercentage = percentage,
                        Quote = _quoteService.GetRandomQuote()
                    };
                }

                personId   = libraryPerson.Id ?? string.Empty;
                personCode = libraryPerson.LookupKey;
                firstName  = libraryPerson.FirstName;
                career     = libraryPerson.Career.Length > 0 ? libraryPerson.Career : libraryPerson.Program;
                faculty    = libraryPerson.Faculty;
                personType = libraryPerson.PersonType;
            }

            var nowUtc = DateTime.UtcNow;
            var peruNow = DateTimeUtils.NowPeru();
            var todayStr = peruNow.ToString("yyyy-MM-dd");

            // Look for an ACTIVE session for this person today.
            var activeSession = await _context.AttendanceRecords
                .Find(a => a.StudentCode == personCode
                           && a.DateString == todayStr
                           && a.IsActive)
                .SortByDescending(a => a.Timestamp)
                .FirstOrDefaultAsync();

            // ── CHECKOUT path ────────────────────────────────────────────────────
            if (activeSession != null)
            {
                var secondsSinceEntry = (nowUtc - activeSession.Timestamp).TotalSeconds;

                // Guard: must wait at least 30 seconds after check-in before checking out.
                if (secondsSinceEntry < MinSecondsForCheckOut)
                {
                    var remaining = (int)(MinSecondsForCheckOut - secondsSinceEntry) + 1;
                    return new CheckInResponseDto
                    {
                        Success = false,
                        IsNewStudent = false,
                        IsCheckOut = false,
                        Message = $"Entrada registrada hace {(int)secondsSinceEntry} segundos. Espera {remaining}s más para poder marcar tu salida.",
                        Student = student,
                        CurrentOccupancy = currentOccupancy,
                        MaxCapacity = maxCapacity,
                        OccupancyPercentage = percentage
                    };
                }

                // Register checkout.
                int durationMinutes = (int)Math.Round(secondsSinceEntry / 60.0);

                var checkOutUpdate = Builders<AttendanceRecord>.Update
                    .Set(a => a.IsActive, false)
                    .Set(a => a.CheckOutTimestamp, nowUtc)
                    .Set(a => a.CheckOutTimeString, peruNow.ToString("HH:mm:ss"))
                    .Set(a => a.DurationMinutes, durationMinutes);

                await _context.AttendanceRecords.UpdateOneAsync(
                    a => a.Id == activeSession.Id, checkOutUpdate);

                activeSession.IsActive = false;
                activeSession.CheckOutTimestamp = nowUtc;
                activeSession.CheckOutTimeString = peruNow.ToString("HH:mm:ss");
                activeSession.DurationMinutes = durationMinutes;

                // Recalculate occupancy after checkout (subtract 1, floor at 0).
                var updatedOccupancy = Math.Max(currentOccupancy - 1, 0);
                var updatedPercentage = maxCapacity > 0
                    ? Math.Round(((double)updatedOccupancy / maxCapacity) * 100, 1)
                    : 0;

                return new CheckInResponseDto
                {
                    Success = true,
                    IsNewStudent = false,
                    IsCheckOut = true,
                    Message = $"¡Hasta pronto, {firstName}! Estuviste {FormatDuration(durationMinutes)} en la biblioteca.",
                    Student = student,
                    AttendanceRecord = activeSession,
                    CurrentOccupancy = updatedOccupancy,
                    MaxCapacity = maxCapacity,
                    OccupancyPercentage = updatedPercentage,
                    DurationMinutes = durationMinutes,
                    Quote = _quoteService.GetRandomQuote()
                };
            }

            // ── CHECK-IN path ─────────────────────────────────────────────────────
            var record = BuildRecord(
                personCode, personId, 
                student != null ? student.FullName : $"{firstName}",
                career, faculty, personType,
                nowUtc, peruNow, todayStr,
                request.VisitReason, request.EntryMethod);

            // Fill languageFocus for students
            if (student != null)
                record.LanguageFocus = string.IsNullOrWhiteSpace(request.LanguageFocus)
                    ? student.PrimaryLanguage
                    : request.LanguageFocus;

            await _context.AttendanceRecords.InsertOneAsync(record);

            // Update visit stats — Students or LibraryPersons
            if (student != null)
            {
                var updateStudent = Builders<Student>.Update
                    .Inc(s => s.TotalVisits, 1)
                    .Set(s => s.LastVisitAt, nowUtc);
                await _context.Students.UpdateOneAsync(s => s.Id == student.Id, updateStudent);
                student.TotalVisits += 1;
                student.LastVisitAt = nowUtc;
            }
            else
            {
                var updatePerson = Builders<LibraryPerson>.Update
                    .Inc(p => p.TotalVisits, 1)
                    .Set(p => p.LastVisitAt, nowUtc);
                await _context.LibraryPersons.UpdateOneAsync(p => p.Id == personId, updatePerson);
            }

            var newOccupancy = Math.Min(currentOccupancy + 1, maxCapacity);
            var newPercentage = maxCapacity > 0
                ? Math.Round(((double)newOccupancy / maxCapacity) * 100, 1)
                : 0;

            return new CheckInResponseDto
            {
                Success = true,
                IsNewStudent = false,
                IsCheckOut = false,
                Message = $"¡Bienvenido/a, {student.FirstName}! Asistencia registrada con éxito.",
                Student = student,
                AttendanceRecord = record,
                CurrentOccupancy = newOccupancy,
                MaxCapacity = maxCapacity,
                OccupancyPercentage = newPercentage,
                Quote = _quoteService.GetRandomQuote()
            };
        }

        // ─────────────────────────────────────────────────────────────────────────
        // AUTO-CLOSE: Closes stale active sessions from previous days OR from today
        // if Peru local time is past 22:00 (10 PM).
        // This runs every time RegisterCheckInAsync is called, keeping the DB clean
        // without needing a separate background service.
        // ─────────────────────────────────────────────────────────────────────────
        private async Task AutoCloseStaleSessionsAsync()
        {
            var peruNow = DateTimeUtils.NowPeru();
            var todayStr = peruNow.ToString("yyyy-MM-dd");

            // Build the auto-close timestamp in Peru time for today (22:00:00 Peru = UTC+5h offset).
            // We compute the UTC equivalent of 22:00 Peru today.
            var peruClosingToday = new DateTime(peruNow.Year, peruNow.Month, peruNow.Day,
                                               AutoCloseHourPeru, 0, 0, DateTimeKind.Unspecified);
            var utcClosing = TimeZoneInfo.ConvertTimeToUtc(peruClosingToday, DateTimeUtils.PeruTimeZone);

            // Find all active sessions that should be auto-closed:
            //   a) Sessions from a date BEFORE today (library was closed, student forgot).
            //   b) Sessions from TODAY but their entry timestamp is before 22:00 Peru
            //      AND Peru current time is already >= 22:00.
            var nowUtc = DateTime.UtcNow;
            var isPastClosing = peruNow.Hour >= AutoCloseHourPeru;

            // Filter: isActive = true AND (dateString < today) OR (dateString = today AND isPastClosing)
            var staleSessions = await _context.AttendanceRecords
                .Find(a => a.IsActive && a.DateString != todayStr)
                .ToListAsync();

            if (isPastClosing)
            {
                var todayStaleSessions = await _context.AttendanceRecords
                    .Find(a => a.IsActive && a.DateString == todayStr && a.Timestamp < utcClosing)
                    .ToListAsync();
                staleSessions.AddRange(todayStaleSessions);
            }

            if (staleSessions.Count == 0) return;

            foreach (var session in staleSessions)
            {
                // Determine the effective close time:
                //   - For previous days: midnight Peru of that day is 22:00 (library close).
                //   - For today: exactly 22:00 Peru today.
                DateTime closeUtc;
                DateTime closePeruLocal;

                if (session.DateString != todayStr)
                {
                    // Parse the session date and set closing at 22:00 of that day Peru time.
                    if (DateTime.TryParse(session.DateString, out var sessionDate))
                    {
                        closePeruLocal = new DateTime(sessionDate.Year, sessionDate.Month, sessionDate.Day,
                                                      AutoCloseHourPeru, 0, 0, DateTimeKind.Unspecified);
                        closeUtc = TimeZoneInfo.ConvertTimeToUtc(closePeruLocal, DateTimeUtils.PeruTimeZone);
                    }
                    else
                    {
                        closeUtc = nowUtc;
                        closePeruLocal = peruNow;
                    }
                }
                else
                {
                    closeUtc = utcClosing;
                    closePeruLocal = peruClosingToday;
                }

                // Ensure close time is not before entry time (edge case safety).
                if (closeUtc < session.Timestamp)
                    closeUtc = session.Timestamp.AddSeconds(1);

                int durationMinutes = (int)Math.Round((closeUtc - session.Timestamp).TotalMinutes);

                var update = Builders<AttendanceRecord>.Update
                    .Set(a => a.IsActive, false)
                    .Set(a => a.CheckOutTimestamp, closeUtc)
                    .Set(a => a.CheckOutTimeString, closePeruLocal.ToString("HH:mm:ss") + " (cierre auto)")
                    .Set(a => a.DurationMinutes, durationMinutes);

                await _context.AttendanceRecords.UpdateOneAsync(
                    a => a.Id == session.Id, update);
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // OCCUPANCY: Count active sessions only (real-time, no time window guess).
        // ─────────────────────────────────────────────────────────────────────────
        public async Task<(int currentOccupancy, int maxCapacity, double percentage)> GetOccupancyAsync()
        {
            var peruNow = DateTimeUtils.NowPeru();
            var todayStr = peruNow.ToString("yyyy-MM-dd");

            var activeCount = (int)await _context.AttendanceRecords
                .CountDocumentsAsync(a => a.IsActive && a.DateString == todayStr);

            int occupancy = Math.Min(activeCount, _maxCapacity);
            double pct = _maxCapacity > 0
                ? Math.Round(((double)occupancy / _maxCapacity) * 100, 1)
                : 0;

            return (occupancy, _maxCapacity, pct);
        }

        // ─────────────────────────────────────────────────────────────────────────
        // RECENT ATTENDANCES
        // ─────────────────────────────────────────────────────────────────────────
        public async Task<List<AttendanceRecord>> GetRecentAttendancesAsync(int limit = 50)
        {
            return await _context.AttendanceRecords.Find(_ => true)
                .SortByDescending(a => a.Timestamp)
                .Limit(limit)
                .ToListAsync();
        }

        // ─────────────────────────────────────────────────────────────────────────
        // HISTORY BY DATE RANGE
        // ─────────────────────────────────────────────────────────────────────────
        public async Task<List<AttendanceRecord>> GetAttendancesByDateRangeAsync(DateTime? from, DateTime? to)
        {
            var filterBuilder = Builders<AttendanceRecord>.Filter;
            var filter = filterBuilder.Empty;

            if (from.HasValue)
                filter &= filterBuilder.Gte(a => a.Timestamp, from.Value);
            if (to.HasValue)
                filter &= filterBuilder.Lte(a => a.Timestamp, to.Value);

            return await _context.AttendanceRecords.Find(filter)
                .SortByDescending(a => a.Timestamp)
                .ToListAsync();
        }

        // ─────────────────────────────────────────────────────────────────────────
        // HELPERS
        // ─────────────────────────────────────────────────────────────────────────
        private static string FormatDuration(int totalMinutes)
        {
            if (totalMinutes < 1) return "menos de 1 minuto";
            if (totalMinutes < 60) return $"{totalMinutes} min";
            int hours = totalMinutes / 60;
            int mins = totalMinutes % 60;
            return mins == 0
                ? $"{hours}h"
                : $"{hours}h {mins}min";
        }
    }
}
