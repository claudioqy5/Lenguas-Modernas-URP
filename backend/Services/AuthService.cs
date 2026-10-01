using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.DTOs;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Services
{
    public interface IAuthService
    {
        Task<LoginResponseDto> LoginAsync(LoginDto dto);
        Task<(bool Success, string Message)> UpdateAdminAsync(string adminId, UpdateAdminDto dto);
    }

    public class AuthService : IAuthService
    {
        private readonly MongoDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(MongoDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<LoginResponseDto> LoginAsync(LoginDto dto)
        {
            var user = await _context.AdminUsers
                .Find(u => u.Username.ToLower() == dto.Username.Trim().ToLower())
                .FirstOrDefaultAsync();

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            {
                return new LoginResponseDto
                {
                    Success = false,
                    Message = "Usuario o contraseña incorrectos."
                };
            }

            // Update last login
            await _context.AdminUsers.UpdateOneAsync(
                u => u.Id == user.Id,
                Builders<Models.AdminUser>.Update.Set(u => u.LastLoginAt, DateTime.UtcNow)
            );

            // Generate JWT Token
            var secretKey = _configuration.GetValue<string>("JwtSettings:SecretKey") 
                            ?? "URP_FacultadLenguasModernas_SuperSecretKey_2026_Key!";
            var issuer = _configuration.GetValue<string>("JwtSettings:Issuer") ?? "AsistenciaLenguasApi";
            var audience = _configuration.GetValue<string>("JwtSettings:Audience") ?? "AsistenciaLenguasClient";
            var expiryHours = _configuration.GetValue<int>("JwtSettings:ExpiryHours", 12);

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id ?? string.Empty),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("FullName", user.FullName)
            };

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(expiryHours),
                signingCredentials: creds
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

            return new LoginResponseDto
            {
                Success = true,
                Token = tokenString,
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                Message = $"Bienvenido al panel, {user.FullName}."
            };
        }

        public async Task<(bool Success, string Message)> UpdateAdminAsync(string adminId, UpdateAdminDto dto)
        {
            var user = await _context.AdminUsers.Find(u => u.Id == adminId).FirstOrDefaultAsync();
            if (user == null) return (false, "Usuario no encontrado.");

            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || !BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            {
                return (false, "La contraseña actual es incorrecta.");
            }

            var updateDefinition = Builders<Models.AdminUser>.Update;
            var updates = new List<UpdateDefinition<Models.AdminUser>>();

            if (!string.IsNullOrWhiteSpace(dto.Username))
            {
                updates.Add(updateDefinition.Set(u => u.Username, dto.Username.Trim()));
            }

            if (!string.IsNullOrWhiteSpace(dto.FullName))
            {
                updates.Add(updateDefinition.Set(u => u.FullName, dto.FullName.Trim()));
            }

            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                var hash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
                updates.Add(updateDefinition.Set(u => u.PasswordHash, hash));
            }

            if (updates.Count == 0) return (true, "No hay cambios para actualizar."); // Nothing to update

            var combinedUpdate = updateDefinition.Combine(updates);
            var result = await _context.AdminUsers.UpdateOneAsync(u => u.Id == adminId, combinedUpdate);

            if (result.ModifiedCount > 0)
                return (true, "Perfil actualizado exitosamente.");
            
            return (false, "No se pudo actualizar el perfil.");
        }
    }
}
