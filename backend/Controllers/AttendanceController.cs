using AsistenciaLenguas.Api.DTOs;
using AsistenciaLenguas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AsistenciaLenguas.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AttendanceController : ControllerBase
    {
        private readonly IAttendanceService _attendanceService;

        public AttendanceController(IAttendanceService attendanceService)
        {
            _attendanceService = attendanceService;
        }

        [HttpPost("checkin")]
        public async Task<IActionResult> CheckIn([FromBody] CheckInRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.StudentCode))
            {
                return BadRequest(new { success = false, message = "El código de estudiante es obligatorio." });
            }

            var result = await _attendanceService.RegisterCheckInAsync(request);
            return Ok(result);
        }

        [HttpGet("recent")]
        public async Task<IActionResult> GetRecent([FromQuery] int limit = 50)
        {
            var records = await _attendanceService.GetRecentAttendancesAsync(limit);
            return Ok(records);
        }

        [HttpGet("occupancy")]
        public async Task<IActionResult> GetOccupancy()
        {
            var (current, max, percentage) = await _attendanceService.GetOccupancyAsync();
            return Ok(new
            {
                currentOccupancy = current,
                maxCapacity = max,
                occupancyPercentage = percentage
            });
        }

        [HttpGet("history")]
        public async Task<IActionResult> GetHistory([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var records = await _attendanceService.GetAttendancesByDateRangeAsync(from, to);
            return Ok(records);
        }

        [HttpGet("server-time")]
        public IActionResult GetServerTime()
        {
            var nowUtc = DateTime.UtcNow;
            var peruTime = AsistenciaLenguas.Api.Utils.DateTimeUtils.NowPeru();
            return Ok(new
            {
                utc = nowUtc,
                peruTime = peruTime,
                timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                timeString = peruTime.ToString("HH:mm:ss"),
                dateString = peruTime.ToString("yyyy-MM-dd")
            });
        }
    }
}
