using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.Models;
using AsistenciaLenguas.Api.Utils;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Services
{
    /// <summary>
    /// Background service that automatically closes all active library sessions at 22:00 Peru time.
    /// Runs independently of any HTTP request — fires every minute to check if it's time to close.
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
            _logger.LogInformation("[AutoClose] Servicio de cierre automático iniciado. Cerrará sesiones activas a las {hour}:00 hora Perú.", CloseHour);

            // Track whether we've already run the close for today to avoid running it multiple times
            DateOnly? lastClosedDate = null;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var peruNow = DateTimeUtils.NowPeru();
                    var today = DateOnly.FromDateTime(peruNow);

                    // Check if it's time to close: hour >= 22 AND we haven't closed today yet
                    bool isCloseTime = peruNow.Hour >= CloseHour;
                    bool alreadyClosedToday = lastClosedDate.HasValue && lastClosedDate.Value == today;

                    if (isCloseTime && !alreadyClosedToday)
                    {
                        _logger.LogInformation("[AutoClose] Son las {time} hora Perú — ejecutando cierre automático de sesiones activas.", peruNow.ToString("HH:mm:ss"));
                        int closed = await CloseAllActiveSessionsAsync(peruNow);
                        lastClosedDate = today;
                        _logger.LogInformation("[AutoClose] Cierre completado: {count} sesión(es) cerrada(s) automáticamente.", closed);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[AutoClose] Error al ejecutar cierre automático de sesiones.");
                }

                // Check every 30 seconds for responsiveness
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        private async Task<int> CloseAllActiveSessionsAsync(DateTime peruNow)
        {
            // Create a scope to get the scoped MongoDbContext
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MongoDbContext>();

            var todayStr = peruNow.ToString("yyyy-MM-dd");

            // Compute the UTC equivalent of 22:00:00 Peru today
            var peruClosingToday = new DateTime(
                peruNow.Year, peruNow.Month, peruNow.Day,
                CloseHour, CloseMinute, 0,
                DateTimeKind.Unspecified);

            var utcClosing = TimeZoneInfo.ConvertTimeToUtc(peruClosingToday, DateTimeUtils.PeruTimeZone);
            var nowUtc = DateTime.UtcNow;

            // Find ALL active sessions (today and any forgotten previous days)
            // Includes records where IsActive == true OR where the isActive field doesn't exist (legacy records)
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
                // Determine auto-close time:
                // - Today's sessions → close at 22:00 Peru
                // - Previous day sessions → close at 22:00 of that day
                DateTime closeUtc;
                string closeTimeStr;

                if (session.DateString == todayStr)
                {
                    closeUtc = utcClosing;
                    closeTimeStr = $"{CloseHour:D2}:{CloseMinute:D2}:00 (cierre auto)";
                }
                else
                {
                    // For previous days: close at 22:00 of the session's own date
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

                // Safety: never close before entry
                if (closeUtc < session.Timestamp)
                    closeUtc = session.Timestamp.AddSeconds(1);

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
