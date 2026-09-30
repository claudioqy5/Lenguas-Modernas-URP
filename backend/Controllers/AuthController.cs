using AsistenciaLenguas.Api.DTOs;
using AsistenciaLenguas.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace AsistenciaLenguas.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new LoginResponseDto { Success = false, Message = "Debe ingresar usuario y contraseña." });
            }

            var result = await _authService.LoginAsync(dto);
            if (!result.Success)
            {
                return Unauthorized(result);
            }

            return Ok(result);
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateAdminDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _authService.UpdateAdminAsync(userId, dto);
            if (success)
            {
                return Ok(new { success = true, message = "Perfil actualizado exitosamente." });
            }

            return BadRequest(new { success = false, message = "No se pudo actualizar el perfil." });
        }
    }
}
