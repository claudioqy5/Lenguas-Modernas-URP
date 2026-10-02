namespace AsistenciaLenguas.Api.DTOs
{
    /// <summary>
    /// DTO for registering any type of library person.
    /// Required fields vary by PersonType — frontend sends only the relevant ones.
    /// </summary>
    public class RegisterLibraryPersonDto
    {
        /// <summary>Alumno | Docente | Visitante | Maestrando | Doctorando</summary>
        public string PersonType { get; set; } = "Alumno";

        // ── Identificación ────────────────────────────────────────────────────
        /// <summary>Código (Alumnos, Maestrandos, Doctorandos). Empty for Docentes/Visitantes.</summary>
        public string Code { get; set; } = string.Empty;

        /// <summary>DNI (todos los tipos)</summary>
        public string DocumentNumber { get; set; } = string.Empty;

        // ── Datos personales ──────────────────────────────────────────────────
        public string FirstName { get; set; } = string.Empty;
        public string LastName  { get; set; } = string.Empty;

        // ── Académicos (Alumnos) ──────────────────────────────────────────────
        public string Faculty { get; set; } = string.Empty;
        public string Career  { get; set; } = string.Empty;

        // ── Posgrado (Maestrandos / Doctorandos) ─────────────────────────────
        public string Program { get; set; } = string.Empty;

        // ── Contacto ─────────────────────────────────────────────────────────
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;

        // ── Auto check-in ─────────────────────────────────────────────────────
        public bool   CheckInNow   { get; set; } = true;
        public string VisitReason  { get; set; } = "Lectura / Estudio";
        public string EntryMethod  { get; set; } = "Manual";
    }

    public class UpdateLibraryPersonDto
    {
        public string DocumentNumber { get; set; } = string.Empty;
        public string FirstName      { get; set; } = string.Empty;
        public string LastName       { get; set; } = string.Empty;
        public string Faculty        { get; set; } = string.Empty;
        public string Career         { get; set; } = string.Empty;
        public string Program        { get; set; } = string.Empty;
        public string Email          { get; set; } = string.Empty;
        public string Phone          { get; set; } = string.Empty;
    }

    public class LibraryPersonResponseDto
    {
        public string? Id          { get; set; }
        public string PersonType   { get; set; } = string.Empty;
        public string Code         { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public string FirstName    { get; set; } = string.Empty;
        public string LastName     { get; set; } = string.Empty;
        public string FullName     { get; set; } = string.Empty;
        public string Faculty      { get; set; } = string.Empty;
        public string Career       { get; set; } = string.Empty;
        public string Program      { get; set; } = string.Empty;
        public string Email        { get; set; } = string.Empty;
        public string Phone        { get; set; } = string.Empty;
        public int    TotalVisits  { get; set; }
        public DateTime CreatedAt  { get; set; }
        public DateTime? LastVisitAt { get; set; }
    }
}
