using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AsistenciaLenguas.Api.Models
{
    public class Student
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("studentCode")]
        public string StudentCode { get; set; } = string.Empty;

        [BsonElement("documentNumber")]
        public string DocumentNumber { get; set; } = string.Empty; // DNI o carné

        [BsonElement("firstName")]
        public string FirstName { get; set; } = string.Empty;

        [BsonElement("lastName")]
        public string LastName { get; set; } = string.Empty;

        [BsonElement("career")]
        public string Career { get; set; } = "Traducción e Interpretación";

        [BsonElement("faculty")]
        public string Faculty { get; set; } = "Humanidades y Lenguas Modernas";

        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("phone")]
        public string Phone { get; set; } = string.Empty;

        [BsonElement("primaryLanguage")]
        public string PrimaryLanguage { get; set; } = "Inglés"; // Idioma de especialidad

        [BsonElement("totalVisits")]
        public int TotalVisits { get; set; } = 0;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("lastVisitAt")]
        public DateTime? LastVisitAt { get; set; }

        public string FullName => $"{FirstName} {LastName}".Trim();
    }
}
