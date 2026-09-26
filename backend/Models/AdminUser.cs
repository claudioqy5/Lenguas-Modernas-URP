using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AsistenciaLenguas.Api.Models
{
    public class AdminUser
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("username")]
        public string Username { get; set; } = string.Empty;

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; } = string.Empty;

        [BsonElement("fullName")]
        public string FullName { get; set; } = "Bibliotecólogo Principal";

        [BsonElement("role")]
        public string Role { get; set; } = "Bibliotecario";

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("lastLoginAt")]
        public DateTime? LastLoginAt { get; set; }
    }
}
