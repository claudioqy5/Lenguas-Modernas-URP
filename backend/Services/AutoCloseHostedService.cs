using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.Models;
using AsistenciaLenguas.Api.Utils;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Services
{
    /// <summary>
    /// Background service that automatically closes all active library sessions at 22:00 Peru time.
    /// Runs every 30 seconds. Once it's 22:00+, it continuously closes ANY active session
    /// (whether it started before or after 22:00) until the next day resets.
    /// </summary>
    public class AutoCloseHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AutoCloseHostedService> _logger;

        // Library closing hour in Peru local time (22 = 10 PM)
        private const int CloseHour = 22;
        private const int CloseMinute = 0;

        public AutoCloseHostedService(
            IServiceProvider serviceProvider,
            ILogger<AutoCloseHostedService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation(
                "[AutoClose] Servicio de cierre automático iniciado. Cerrará sesiones activas a las {hour}:00 hora Perú.",
                CloseHour);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var peruNow = DateTimeUtils.NowPeru();

                    // If it's past closing time, close ALL active sessions every cycle.
                    // This handles students who enter AFTER 22:00 (librarians, tests, etc.)
                    if (peruNow.Hour >= CloseHour)
                    {
                        int closed = await CloseAllActiveSessionsAsync(peruNow);
                        if (closed > 0)
                        {
                            _logger.LogInformation(
                                "[AutoClose] {time} hora Perú — {count} sesión(es) cerrada(s) automáticamente.",
                                peruNow.ToString("HH:mm:ss"), closed);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[AutoClose] Error al ejecutar cierre automático de sesiones.");
                }

                // Check every 30 seconds
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        private async Task<int> CloseAllActiveSessionsAsync(DateTime peruNow)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MongoDbContext>();

            var todayStr = peruNow.ToString("yyyy-MM-dd");

            // UTC equivalent of 22:00:00 Peru today (the official close time to record)
            var peruClosingToday = new DateTime(
                peruNow.Year, peruNow.Month, peruNow.Day,
                CloseHour, CloseMinute, 0,
                DateTimeKind.Unspecified);
            var utcClosing = TimeZoneInfo.ConvertTimeToUtc(peruClosingToday, DateTimeUtils.PeruTimeZone);
            var nowUtc = DateTime.UtcNow;

            // Find ALL active sessions: IsActive=true OR legacy records without the field
            var filter = Builders<AttendanceRecord>.Filter.Or(
                Builders<AttendanceRecord>.Filter.Eq(a => a.IsActive, true),
                Builders<AttendanceRecord>.Filter.Exists("isActive", false)
            );

            var activeSessions = await db.AttendanceRecords
                .Find(filter)
                .ToListAsync();

            if (activeSessions.Count == 0) return 0;

            int count = 0;
            foreach (var session in activeSessions)
            {
                // Determine the official close time for this session's date
                DateTime closeUtc;
                string closeTimeStr;

                if (session.DateString == todayStr)
                {
                    // Today: close at 22:00 Peru (even if the student entered after 22:00)
                    closeUtc = utcClosing;
                    closeTimeStr = $"{CloseHour:D2}:{CloseMinute:D2}:00 (cierre auto)";
                }
                else
                {
                    // Previous day: close at 22:00 of that day
                    if (DateTime.TryParse(session.DateString, out var sessionDate))
                    {
                        var prevClosing = new DateTime(
                            sessionDate.Year, sessionDate.Month, sessionDate.Day,
                            CloseHour, CloseMinute, 0, DateTimeKind.Unspecified);
                        closeUtc = TimeZoneInfo.ConvertTimeToUtc(prevClosing, DateTimeUtils.PeruTimeZone);
                        closeTimeStr = $"{CloseHour:D2}:{CloseMinute:D2}:00 (cierre auto)";
                    }
                    else
                    {
                        closeUtc = nowUtc;
                        closeTimeStr = peruNow.ToString("HH:mm:ss") + " (cierre auto)";
                    }
                }

                // Safety: if the session started AFTER the official close time (e.g. entered at 23:12)
                // then just close it with the current time + 1 minute minimum.
                if (closeUtc <= session.Timestamp)
                {
                    closeUtc = nowUtc;
                    closeTimeStr = peruNow.ToString("HH:mm:ss") + " (cierre auto)";
                    
                    // If even nowUtc is before or exactly at entry, force 1 minute
                    if (closeUtc <= session.Timestamp) {
                        closeUtc = session.Timestamp.AddMinutes(1);
                        closeTimeStr = DateTimeUtils.ToPeruTime(closeUtc).ToString("HH:mm:ss") + " (cierre auto)";
                    }
                }

                int durationMinutes = (int)Math.Round((closeUtc - session.Timestamp).TotalMinutes);

                var update = Builders<AttendanceRecord>.Update
                    .Set(a => a.IsActive, false)
                    .Set(a => a.CheckOutTimestamp, closeUtc)
                    .Set(a => a.CheckOutTimeString, closeTimeStr)
                    .Set(a => a.DurationMinutes, durationMinutes);

                await db.AttendanceRecords.UpdateOneAsync(a => a.Id == session.Id, update);
                count++;

                _logger.LogInformation(
                    "[AutoClose] Sesión cerrada: {code} | Entrada: {entry} | Duración: {dur} min",
                    session.StudentCode, session.TimeString, durationMinutes);
            }

            return count;
        }
    }
}
