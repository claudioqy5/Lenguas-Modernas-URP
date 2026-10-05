using AsistenciaLenguas.Api.DTOs;
using AsistenciaLenguas.Api.Models;
using AsistenciaLenguas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AsistenciaLenguas.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _studentService;
        private readonly IAttendanceService _attendanceService;
        private readonly ILibraryPersonService _personService;

        public StudentsController(
            IStudentService studentService,
            IAttendanceService attendanceService,
            ILibraryPersonService personService)
        {
            _studentService = studentService;
            _attendanceService = attendanceService;
            _personService = personService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var students = await _studentService.GetAllStudentsAsync();
            return Ok(students);
        }

        [HttpGet("check/{code}")]
        public async Task<IActionResult> CheckCode(string code)
        {
            var cleanKey = (code ?? string.Empty).Trim();
            var student = await _studentService.GetByStudentCodeAsync(cleanKey);
            if (student != null)
            {
                return Ok(new { exists = true, student });
            }

            var person = await _personService.FindByKeyAsync(cleanKey);
            if (person != null)
            {
                var unifiedStudent = new Student
                {
                    Id = person.Id,
                    StudentCode = person.LookupKey,
                    DocumentNumber = person.DocumentNumber ?? string.Empty,
                    FirstName = person.FirstName ?? string.Empty,
                    LastName = person.LastName ?? string.Empty,
                    Career = !string.IsNullOrWhiteSpace(person.Career) ? person.Career : (person.Program ?? string.Empty),
                    Faculty = person.Faculty ?? string.Empty,
                    Email = person.Email ?? string.Empty,
                    Phone = person.Phone ?? string.Empty,
                    TotalVisits = person.TotalVisits,
                    LastVisitAt = person.LastVisitAt,
                    CreatedAt = person.CreatedAt
                };
                return Ok(new { exists = true, student = unifiedStudent });
            }

            return NotFound(new { exists = false, message = "Estudiante o persona no registrada." });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            var student = await _studentService.GetByIdAsync(id);
            if (student == null) return NotFound(new { message = "Estudiante no encontrado." });
            return Ok(student);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterStudentDto dto)
        {
            try
            {
                var student = await _studentService.RegisterStudentAsync(dto);

                // If CheckInNow is true, automatically mark first attendance!
                CheckInResponseDto? checkInResult = null;
                if (dto.CheckInNow)
                {
                    checkInResult = await _attendanceService.RegisterCheckInAsync(new CheckInRequestDto
                    {
                        StudentCode = student.StudentCode,
                        VisitReason = dto.VisitReason,
                        LanguageFocus = dto.LanguageFocus,
                        EntryMethod = "Manual"
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = $"¡Bienvenido/a a la biblioteca, {student.FirstName}!",
                    student,
                    checkInResult
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Error al registrar estudiante: " + ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateStudentDto dto)
        {
            var success = await _studentService.UpdateStudentAsync(id, dto);
            if (!success) return NotFound(new { success = false, message = "No se pudo actualizar el estudiante." });
            return Ok(new { success = true, message = "Estudiante actualizado exitosamente." });
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var success = await _studentService.DeleteStudentAsync(id);
            if (!success) return NotFound(new { success = false, message = "No se pudo eliminar el estudiante." });
            return Ok(new { success = true, message = "Estudiante eliminado exitosamente." });
        }
    }
}
