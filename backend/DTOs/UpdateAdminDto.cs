namespace AsistenciaLenguas.Api.DTOs
{
    public class UpdateAdminDto
    {
        public string CurrentPassword { get; set; } = string.Empty;
        public string? Username { get; set; }
        public string? FullName { get; set; }
        public string? Password { get; set; }
    }
}
