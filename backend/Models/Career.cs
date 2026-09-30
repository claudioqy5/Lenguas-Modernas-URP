using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AsistenciaLenguas.Api.Models
{
    public class Career
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("name")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("code")]
        public string Code { get; set; } = string.Empty;

        [BsonElement("facultyId")]
        public string FacultyId { get; set; } = string.Empty;

        [BsonElement("facultyName")]
        public string FacultyName { get; set; } = string.Empty;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
