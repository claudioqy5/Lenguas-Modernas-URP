using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace AsistenciaLenguas.Api.Models
{
    /// <summary>
    /// Tipo de persona que puede registrar asistencia en la biblioteca.
    /// </summary>
    public static class PersonType
    {
        public const string Alumno      = "Alumno";
        public const string Docente     = "Docente";
        public const string Visitante   = "Visitante";
        public const string Maestrando  = "Maestrando";
        public const string Doctorando  = "Doctorando";
    }

    /// <summary>
    /// Modelo unificado para todos los tipos de personas que pueden
    /// registrar asistencia en la biblioteca San Jerónimo.
    /// Reemplaza a Student para los tipos nuevos; Student permanece
    /// para retrocompatibilidad con registros existentes.
    /// </summary>
    [BsonIgnoreExtraElements]
    public class LibraryPerson
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        /// <summary>Alumno / Docente / Visitante / Maestrando / Doctorando</summary>
        [BsonElement("personType")]
        public string PersonType { get; set; } = Models.PersonType.Alumno;

        // ── Código / identificador primario ───────────────────────────────────
        /// <summary>
        /// Código de alumno / maestrando / doctorando.
        /// Vacío para Docentes y Visitantes (se identifican por DNI).
        /// </summary>
        [BsonElement("code")]
        public string Code { get; set; } = string.Empty;

        /// <summary>DNI o carné de extranjería. Presente en todos los tipos.</summary>
        [BsonElement("documentNumber")]
        public string DocumentNumber { get; set; } = string.Empty;

        // ── Datos personales ──────────────────────────────────────────────────
        [BsonElement("firstName")]
        public string FirstName { get; set; } = string.Empty;

        [BsonElement("lastName")]
        public string LastName { get; set; } = string.Empty;

        // ── Datos académicos (Alumnos) ────────────────────────────────────────
        [BsonElement("faculty")]
        public string Faculty { get; set; } = string.Empty;

        [BsonElement("career")]
        public string Career { get; set; } = string.Empty;

        // ── Programa de posgrado (Maestrandos / Doctorandos) ──────────────────
        [BsonElement("program")]
        public string Program { get; set; } = string.Empty;

        // ── Contacto (todos los tipos) ────────────────────────────────────────
        [BsonElement("email")]
        public string Email { get; set; } = string.Empty;

        [BsonElement("phone")]
        public string Phone { get; set; } = string.Empty;

        // ── Estadísticas ──────────────────────────────────────────────────────
        [BsonElement("totalVisits")]
        public int TotalVisits { get; set; } = 0;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("lastVisitAt")]
        public DateTime? LastVisitAt { get; set; }

        // ── Helpers ───────────────────────────────────────────────────────────
        public string FullName => $"{FirstName} {LastName}".Trim();

        /// <summary>
        /// Clave de lookup: el código si existe, o el DNI para docentes/visitantes.
        /// </summary>
        public string LookupKey => string.IsNullOrWhiteSpace(Code) ? DocumentNumber : Code;
    }
}
