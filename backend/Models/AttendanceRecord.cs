using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AsistenciaLenguas.Api.Models
{
    public class AttendanceRecord
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("studentId")]
        public string StudentId { get; set; } = string.Empty;

        [BsonElement("studentCode")]
        public string StudentCode { get; set; } = string.Empty;

        [BsonElement("studentName")]
        public string StudentName { get; set; } = string.Empty;

        [BsonElement("career")]
        public string Career { get; set; } = string.Empty;

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        [BsonElement("dateString")]
        public string DateString { get; set; } = string.Empty; // "yyyy-MM-dd"

        [BsonElement("timeString")]
        public string TimeString { get; set; } = string.Empty; // "HH:mm:ss"

        [BsonElement("dayOfWeek")]
        public string DayOfWeek { get; set; } = string.Empty; // "Lunes", "Martes", etc.

        [BsonElement("dayOfWeekNumber")]
        public int DayOfWeekNumber { get; set; } // 1 (Mon) - 7 (Sun)

        [BsonElement("hourOfDay")]
        public int HourOfDay { get; set; } // 0-23

        [BsonElement("visitReason")]
        public string VisitReason { get; set; } = "Lectura / Estudio";

        [BsonElement("languageFocus")]
        public string LanguageFocus { get; set; } = "General";

        [BsonElement("entryMethod")]
        public string EntryMethod { get; set; } = "Barcode"; // Barcode, Manual
    }
}
