using System;

namespace AsistenciaLenguas.Api.Utils
{
    public static class DateTimeUtils
    {
        private static readonly Lazy<TimeZoneInfo> _peruTimeZone = new(() =>
        {
            string[] timeZoneIds = { "America/Lima", "SA Pacific Standard Time" };
            foreach (var id in timeZoneIds)
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(id);
                }
                catch
                {
                    // Ignore and try next identifier
                }
            }

            // Fallback infalible: Perú es UTC - 5 permanente sin horario de verano
            return TimeZoneInfo.CreateCustomTimeZone(
                "Peru_Standard_Time",
                TimeSpan.FromHours(-5),
                "Hora Estándar de Perú (PET)",
                "Hora de Perú"
            );
        });

        public static TimeZoneInfo PeruTimeZone => _peruTimeZone.Value;

        /// <summary>
        /// Obtiene la hora actual oficial de Perú (UTC-5) calculada desde el VPS
        /// </summary>
        public static DateTime NowPeru()
        {
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, PeruTimeZone);
        }

        /// <summary>
        /// Convierte una fecha UTC a hora oficial de Perú
        /// </summary>
        public static DateTime ToPeruTime(DateTime utcDateTime)
        {
            var utc = utcDateTime.Kind == DateTimeKind.Utc 
                ? utcDateTime 
                : DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc);
            return TimeZoneInfo.ConvertTimeFromUtc(utc, PeruTimeZone);
        }
    }
}
