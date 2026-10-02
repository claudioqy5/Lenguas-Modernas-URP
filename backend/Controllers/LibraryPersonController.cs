using AsistenciaLenguas.Api.DTOs;
using AsistenciaLenguas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AsistenciaLenguas.Api.Controllers
{
    [ApiController]
    [Route("api/persons")]
    public class LibraryPersonController : ControllerBase
    {
        private readonly ILibraryPersonService _service;

        public LibraryPersonController(ILibraryPersonService service)
        {
            _service = service;
        }

        // GET /api/persons — all persons (admin only)
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll([FromQuery] string? type)
        {
            var list = string.IsNullOrWhiteSpace(type)
                ? await _service.GetAllAsync()
                : await _service.GetByTypeAsync(type);

            return Ok(list);
        }

        // GET /api/persons/lookup/{key} — find by code or DNI
        [HttpGet("lookup/{key}")]
        public async Task<IActionResult> Lookup(string key)
        {
            var person = await _service.FindByKeyAsync(key);
            if (person == null) return NotFound(new { message = $"No se encontró persona con código/DNI '{key}'." });
            return Ok(person);
        }

        // POST /api/persons — register new person
        [HttpPost]
        public async Task<IActionResult> Register([FromBody] RegisterLibraryPersonDto dto)
        {
            try
            {
                var person = await _service.RegisterAsync(dto);
                return CreatedAtAction(nameof(Lookup), new { key = person.LookupKey }, person);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // PUT /api/persons/{id} — update person data
        [HttpPut("{id}")]
        [Authorize]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateLibraryPersonDto dto)
        {
            var updated = await _service.UpdateAsync(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        // DELETE /api/persons/{id}
        [HttpDelete("{id}")]
        [Authorize]
        public async Task<IActionResult> Delete(string id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }
    }
}
