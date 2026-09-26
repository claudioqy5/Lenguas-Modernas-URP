namespace AsistenciaLenguas.Api.DTOs
{
    public class RegisterStudentDto
    {
        public string StudentCode { get; set; } = string.Empty;
        public string DocumentNumber { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Career { get; set; } = "Traducción e Interpretación";
        public string Faculty { get; set; } = "Humanidades y Lenguas Modernas";
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string PrimaryLanguage { get; set; } = "Inglés";
        
        // Auto-check in upon registration
        public bool CheckInNow { get; set; } = true;
        public string VisitReason { get; set; } = "Lectura / Estudio";
        public string LanguageFocus { get; set; } = "General";
    }

    public class UpdateStudentDto
    {
        public string DocumentNumber { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Career { get; set; } = string.Empty;
        public string Faculty { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string PrimaryLanguage { get; set; } = string.Empty;
    }
}
