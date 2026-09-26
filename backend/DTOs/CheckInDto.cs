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
        public string Message { get; set; } = string.Empty;
        public Student? Student { get; set; }
        public AttendanceRecord? AttendanceRecord { get; set; }
        public int CurrentOccupancy { get; set; }
        public int MaxCapacity { get; set; }
        public double OccupancyPercentage { get; set; }
        public LiteraryQuoteDto? Quote { get; set; }
    }
}
