using AsistenciaLenguas.Api.Models;

namespace AsistenciaLenguas.Api.DTOs
{
    public class CheckInRequestDto
    {
        public string StudentCode { get; set; } = string.Empty;
        public string VisitReason { get; set; } = "Lectura / Estudio";
        public string LanguageFocus { get; set; } = "General";
        public string EntryMethod { get; set; } = "Barcode"; // "Barcode" o "Manual"
    }

    public class LiteraryQuoteDto
    {
        public string Text { get; set; } = string.Empty;
        public string Translation { get; set; } = string.Empty;
        public string Author { get; set; } = string.Empty;
        public string Language { get; set; } = string.Empty;
    }

    public class CheckInResponseDto
    {
        public bool Success { get; set; }
        public bool IsNewStudent { get; set; }

        /// <summary>
        /// true = this scan registered a CHECK-OUT (student was already inside).
        /// false = this scan registered a CHECK-IN (new session opened).
        /// </summary>
        public bool IsCheckOut { get; set; } = false;

        public string Message { get; set; } = string.Empty;
        public Student? Student { get; set; }
        public AttendanceRecord? AttendanceRecord { get; set; }
        public int CurrentOccupancy { get; set; }
        public int MaxCapacity { get; set; }
        public double OccupancyPercentage { get; set; }
        public LiteraryQuoteDto? Quote { get; set; }

        /// <summary>Minutes spent in library (only meaningful when IsCheckOut = true).</summary>
        public int DurationMinutes { get; set; } = 0;
    }
}
