using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.Models;
using AsistenciaLenguas.Api.Utils;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Services
{
    /// <summary>
    /// Background service that automatically closes all active library sessions at 22:00 Peru time.
    /// This covers students who forgot to scan their exit.
    /// New check-ins are already blocked after 22:00 at the service layer, so this only
    /// needs to handle sessions that were opened during the day and never closed.
    /// Runs every 30 seconds and fires once per day when the clock reaches 22:00.
    /// </summary>
    public class AutoCloseHostedService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<AutoCloseHostedService> _logger;

        private const int CloseHour   = 22;
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
                "[AutoClose] Servicio iniciado. Cerrará sesiones abiertas a las {hour}:00 hora Perú.",
                CloseHour);

            // Track the last date we ran the close so we only run once per day.
            DateOnly? lastClosedDate = null;

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    var peruNow = DateTimeUtils.NowPeru();
                    var today   = DateOnly.FromDateTime(peruNow);

                    bool isCloseTime       = peruNow.Hour >= CloseHour;
                    bool alreadyRanToday   = lastClosedDate.HasValue && lastClosedDate.Value == today;

                    if (isCloseTime && !alreadyRanToday)
                    {
                        _logger.LogInformation(
                            "[AutoClose] Son las {time} hora Perú — ejecutando cierre de sesiones olvidadas.",
                            peruNow.ToString("HH:mm:ss"));

                        int closed = await CloseAllActiveSessionsAsync(peruNow);
                        lastClosedDate = today;

                        _logger.LogInformation(
                            "[AutoClose] Cierre completado: {count} sesión(es) cerrada(s).", closed);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[AutoClose] Error al ejecutar cierre automático.");
                }

                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        private async Task<int> CloseAllActiveSessionsAsync(DateTime peruNow)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MongoDbContext>();

            var todayStr = peruNow.ToString("yyyy-MM-dd");

            // Official close time in UTC for today
            var peruClosingToday = new DateTime(
                peruNow.Year, peruNow.Month, peruNow.Day,
                CloseHour, CloseMinute, 0, DateTimeKind.Unspecified);
            var utcClosing = TimeZoneInfo.ConvertTimeToUtc(peruClosingToday, DateTimeUtils.PeruTimeZone);

            // Find ALL sessions that are still IsActive=true
            // (new check-ins after 22:00 are already blocked, so all active sessions
            //  here are legitimate "forgotten" ones from during the day)
            var filter = Builders<AttendanceRecord>.Filter.Or(
                Builders<AttendanceRecord>.Filter.Eq(a => a.IsActive, true),
                Builders<AttendanceRecord>.Filter.Exists("isActive", false)
            );

            var activeSessions = await db.AttendanceRecords.Find(filter).ToListAsync();
            if (activeSessions.Count == 0) return 0;

            int count = 0;
            foreach (var session in activeSessions)
            {
                // Determine the 22:00 close time for the session's own date
                DateTime closeUtc;
                string closeTimeStr;

                if (session.DateString == todayStr)
                {
                    closeUtc     = utcClosing;
                    closeTimeStr = $"{CloseHour:D2}:{CloseMinute:D2}:00 (cierre auto)";
                }
                else
                {
                    // Previous days: close at 22:00 of that day
                    if (DateTime.TryParse(session.DateString, out var sessionDate))
                    {
                        var prevClosing = new DateTime(
                            sessionDate.Year, sessionDate.Month, sessionDate.Day,
                            CloseHour, CloseMinute, 0, DateTimeKind.Unspecified);
                        closeUtc     = TimeZoneInfo.ConvertTimeToUtc(prevClosing, DateTimeUtils.PeruTimeZone);
                        closeTimeStr = $"{CloseHour:D2}:{CloseMinute:D2}:00 (cierre auto)";
                    }
                    else
                    {
                        closeUtc     = DateTime.UtcNow;
                        closeTimeStr = peruNow.ToString("HH:mm:ss") + " (cierre auto)";
                    }
                }

                // Safety: session must have a positive duration
                if (closeUtc <= session.Timestamp)
                    closeUtc = session.Timestamp.AddSeconds(60);

                int durationMinutes = (int)Math.Round((closeUtc - session.Timestamp).TotalMinutes);

                var update = Builders<AttendanceRecord>.Update
                    .Set(a => a.IsActive,          false)
                    .Set(a => a.CheckOutTimestamp,  closeUtc)
                    .Set(a => a.CheckOutTimeString, closeTimeStr)
                    .Set(a => a.DurationMinutes,    durationMinutes);

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
