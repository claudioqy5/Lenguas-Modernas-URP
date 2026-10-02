using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.Models;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AcademicController : ControllerBase
    {
        private readonly MongoDbContext _context;

        public AcademicController(MongoDbContext context)
        {
            _context = context;
        }

        // DTOs
        public record FacultyDto(string Name, string? Code);
        public record CareerDto(string Name, string? Code, string FacultyId);

        // GET /api/academic/tree - Hierarchical tree of all faculties and their careers
        [HttpGet("tree")]
        public async Task<IActionResult> GetTree()
        {
            var faculties = await _context.Faculties.Find(_ => true).SortBy(f => f.Name).ToListAsync();
            var careers = await _context.Careers.Find(_ => true).SortBy(c => c.Name).ToListAsync();

            var tree = faculties.Select(f => new
            {
                id = f.Id,
                name = f.Name,
                code = f.Code,
                createdAt = f.CreatedAt,
                careers = careers.Where(c => c.FacultyId == f.Id).Select(c => new
                {
                    id = c.Id,
                    name = c.Name,
                    code = c.Code,
                    facultyId = c.FacultyId,
                    facultyName = c.FacultyName,
                    createdAt = c.CreatedAt
                }).ToList()
            });

            return Ok(tree);
        }

        // ==================== FACULTIES CRUD ====================

        // GET /api/academic/faculties
        [HttpGet("faculties")]
        public async Task<IActionResult> GetFaculties()
        {
            var faculties = await _context.Faculties.Find(_ => true).SortBy(f => f.Name).ToListAsync();
            return Ok(faculties);
        }

        // POST /api/academic/faculties
        [HttpPost("faculties")]
        public async Task<IActionResult> CreateFaculty([FromBody] FacultyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { success = false, message = "El nombre de la facultad es obligatorio." });
            }

            var trimmedName = dto.Name.Trim();
            var exists = await _context.Faculties.Find(f => f.Name.ToLower() == trimmedName.ToLower()).AnyAsync();
            if (exists)
            {
                return BadRequest(new { success = false, message = $"Ya existe una facultad registrada con el nombre '{trimmedName}'." });
            }

            var faculty = new Faculty
            {
                Name = trimmedName,
                Code = (dto.Code ?? string.Empty).Trim().ToUpper(),
                CreatedAt = DateTime.UtcNow
            };

            await _context.Faculties.InsertOneAsync(faculty);
            return Ok(new { success = true, message = "Facultad creada exitosamente.", data = faculty });
        }

        // PUT /api/academic/faculties/{id}
        [HttpPut("faculties/{id}")]
        public async Task<IActionResult> UpdateFaculty(string id, [FromBody] FacultyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { success = false, message = "El nombre de la facultad es obligatorio." });
            }

            var faculty = await _context.Faculties.Find(f => f.Id == id).FirstOrDefaultAsync();
            if (faculty == null)
            {
                return NotFound(new { success = false, message = "Facultad no encontrada." });
            }

            var trimmedName = dto.Name.Trim();
            var duplicate = await _context.Faculties.Find(f => f.Id != id && f.Name.ToLower() == trimmedName.ToLower()).AnyAsync();
            if (duplicate)
            {
                return BadRequest(new { success = false, message = $"Ya existe otra facultad con el nombre '{trimmedName}'." });
            }

            var oldName = faculty.Name;
            faculty.Name = trimmedName;
            faculty.Code = (dto.Code ?? string.Empty).Trim().ToUpper();

            await _context.Faculties.ReplaceOneAsync(f => f.Id == id, faculty);

            // Cascade update facultyName in all associated careers if name changed
            if (oldName != trimmedName)
            {
                var updateDef = Builders<Career>.Update.Set(c => c.FacultyName, trimmedName);
                await _context.Careers.UpdateManyAsync(c => c.FacultyId == id, updateDef);
            }

            return Ok(new { success = true, message = "Facultad actualizada exitosamente.", data = faculty });
        }

        // DELETE /api/academic/faculties/{id}
        [HttpDelete("faculties/{id}")]
        public async Task<IActionResult> DeleteFaculty(string id)
        {
            var faculty = await _context.Faculties.Find(f => f.Id == id).FirstOrDefaultAsync();
            if (faculty == null)
            {
                return NotFound(new { success = false, message = "Facultad no encontrada." });
            }

            // Remove faculty and its associated careers
            await _context.Faculties.DeleteOneAsync(f => f.Id == id);
            await _context.Careers.DeleteManyAsync(c => c.FacultyId == id);

            return Ok(new { success = true, message = $"Facultad '{faculty.Name}' y sus carreras asociadas eliminadas exitosamente." });
        }

        // ==================== CAREERS CRUD ====================

        // GET /api/academic/careers
        [HttpGet("careers")]
        public async Task<IActionResult> GetCareers([FromQuery] string? facultyId)
        {
            var filter = string.IsNullOrEmpty(facultyId) 
                ? Builders<Career>.Filter.Empty 
                : Builders<Career>.Filter.Eq(c => c.FacultyId, facultyId);

            var careers = await _context.Careers.Find(filter).SortBy(c => c.Name).ToListAsync();
            return Ok(careers);
        }

        // POST /api/academic/careers
        [HttpPost("careers")]
        public async Task<IActionResult> CreateCareer([FromBody] CareerDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { success = false, message = "El nombre de la carrera es obligatorio." });
            }

            if (string.IsNullOrWhiteSpace(dto.FacultyId))
            {
                return BadRequest(new { success = false, message = "Debe asociar la carrera a una facultad válida." });
            }

            var faculty = await _context.Faculties.Find(f => f.Id == dto.FacultyId).FirstOrDefaultAsync();
            if (faculty == null)
            {
                return BadRequest(new { success = false, message = "La facultad seleccionada no existe." });
            }

            var trimmedName = dto.Name.Trim();
            var exists = await _context.Careers.Find(c => c.FacultyId == dto.FacultyId && c.Name.ToLower() == trimmedName.ToLower()).AnyAsync();
            if (exists)
            {
                return BadRequest(new { success = false, message = $"La carrera '{trimmedName}' ya existe dentro de {faculty.Name}." });
            }

            var career = new Career
            {
                Name = trimmedName,
                Code = (dto.Code ?? string.Empty).Trim().ToUpper(),
                FacultyId = faculty.Id!,
                FacultyName = faculty.Name,
                CreatedAt = DateTime.UtcNow
            };

            await _context.Careers.InsertOneAsync(career);
            return Ok(new { success = true, message = "Carrera creada exitosamente.", data = career });
        }

        // PUT /api/academic/careers/{id}
        [HttpPut("careers/{id}")]
        public async Task<IActionResult> UpdateCareer(string id, [FromBody] CareerDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { success = false, message = "El nombre de la carrera es obligatorio." });
            }

            var career = await _context.Careers.Find(c => c.Id == id).FirstOrDefaultAsync();
            if (career == null)
            {
                return NotFound(new { success = false, message = "Carrera no encontrada." });
            }

            var targetFacultyId = !string.IsNullOrWhiteSpace(dto.FacultyId) ? dto.FacultyId : career.FacultyId;
            var faculty = await _context.Faculties.Find(f => f.Id == targetFacultyId).FirstOrDefaultAsync();
            if (faculty == null)
            {
                return BadRequest(new { success = false, message = "La facultad asociada no existe." });
            }

            var trimmedName = dto.Name.Trim();
            var duplicate = await _context.Careers.Find(c => c.Id != id && c.FacultyId == targetFacultyId && c.Name.ToLower() == trimmedName.ToLower()).AnyAsync();
            if (duplicate)
            {
                return BadRequest(new { success = false, message = $"Ya existe otra carrera con el nombre '{trimmedName}' en {faculty.Name}." });
            }

            career.Name = trimmedName;
            career.Code = (dto.Code ?? string.Empty).Trim().ToUpper();
            career.FacultyId = faculty.Id!;
            career.FacultyName = faculty.Name;

            await _context.Careers.ReplaceOneAsync(c => c.Id == id, career);
            return Ok(new { success = true, message = "Carrera actualizada exitosamente.", data = career });
        }

        // DELETE /api/academic/careers/{id}
        [HttpDelete("careers/{id}")]
        public async Task<IActionResult> DeleteCareer(string id)
        {
            var career = await _context.Careers.Find(c => c.Id == id).FirstOrDefaultAsync();
            if (career == null)
            {
                return NotFound(new { success = false, message = "Carrera no encontrada." });
            }

            await _context.Careers.DeleteOneAsync(c => c.Id == id);
            return Ok(new { success = true, message = $"Carrera '{career.Name}' eliminada exitosamente." });
        }

        // ==================== POSTGRADUATE PROGRAMS CRUD ====================

        public record PostgraduateProgramDto(string Name, string? Code, string DegreeType);

        // GET /api/academic/programs
        [HttpGet("programs")]
        public async Task<IActionResult> GetPrograms([FromQuery] string? degreeType)
        {
            var filter = string.IsNullOrEmpty(degreeType)
                ? Builders<PostgraduateProgram>.Filter.Empty
                : Builders<PostgraduateProgram>.Filter.Eq(p => p.DegreeType, degreeType);

            var programs = await _context.PostgraduatePrograms.Find(filter).SortBy(p => p.Name).ToListAsync();
            return Ok(programs);
        }

        // POST /api/academic/programs
        [HttpPost("programs")]
        public async Task<IActionResult> CreateProgram([FromBody] PostgraduateProgramDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { success = false, message = "El nombre del programa es obligatorio." });
            }

            var trimmedName = dto.Name.Trim();
            var exists = await _context.PostgraduatePrograms.Find(p => p.Name.ToLower() == trimmedName.ToLower()).AnyAsync();
            if (exists)
            {
                return BadRequest(new { success = false, message = $"Ya existe un programa registrado con el nombre '{trimmedName}'." });
            }

            var degreeType = string.IsNullOrWhiteSpace(dto.DegreeType) ? "Maestría" : dto.DegreeType.Trim();
            if (degreeType != "Maestría" && degreeType != "Doctorado")
            {
                degreeType = "Maestría";
            }

            var program = new PostgraduateProgram
            {
                Name = trimmedName,
                Code = (dto.Code ?? string.Empty).Trim().ToUpper(),
                DegreeType = degreeType,
                CreatedAt = DateTime.UtcNow
            };

            await _context.PostgraduatePrograms.InsertOneAsync(program);
            return Ok(new { success = true, message = "Programa de posgrado creado exitosamente.", data = program });
        }

        // PUT /api/academic/programs/{id}
        [HttpPut("programs/{id}")]
        public async Task<IActionResult> UpdateProgram(string id, [FromBody] PostgraduateProgramDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { success = false, message = "El nombre del programa es obligatorio." });
            }

            var program = await _context.PostgraduatePrograms.Find(p => p.Id == id).FirstOrDefaultAsync();
            if (program == null)
            {
                return NotFound(new { success = false, message = "Programa no encontrado." });
            }

            var trimmedName = dto.Name.Trim();
            var duplicate = await _context.PostgraduatePrograms.Find(p => p.Id != id && p.Name.ToLower() == trimmedName.ToLower()).AnyAsync();
            if (duplicate)
            {
                return BadRequest(new { success = false, message = $"Ya existe otro programa con el nombre '{trimmedName}'." });
            }

            var degreeType = string.IsNullOrWhiteSpace(dto.DegreeType) ? program.DegreeType : dto.DegreeType.Trim();

            program.Name = trimmedName;
            program.Code = (dto.Code ?? string.Empty).Trim().ToUpper();
            program.DegreeType = degreeType;

            await _context.PostgraduatePrograms.ReplaceOneAsync(p => p.Id == id, program);
            return Ok(new { success = true, message = "Programa de posgrado actualizado exitosamente.", data = program });
        }

        // DELETE /api/academic/programs/{id}
        [HttpDelete("programs/{id}")]
        public async Task<IActionResult> DeleteProgram(string id)
        {
            var program = await _context.PostgraduatePrograms.Find(p => p.Id == id).FirstOrDefaultAsync();
            if (program == null)
            {
                return NotFound(new { success = false, message = "Programa no encontrado." });
            }

            await _context.PostgraduatePrograms.DeleteOneAsync(p => p.Id == id);
            return Ok(new { success = true, message = $"Programa '{program.Name}' eliminado exitosamente." });
        }
    }
}
