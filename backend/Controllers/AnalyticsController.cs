using AsistenciaLenguas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace AsistenciaLenguas.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var summary = await _analyticsService.GetSummaryAsync();
            return Ok(summary);
        }

        [HttpPost("seed")]
        public IActionResult Seed([FromServices] AsistenciaLenguas.Api.Data.MongoDbContext dbContext)
        {
            dbContext.ReSeedData();
            return Ok(new { success = true, message = "Database seeded." });
        }
    }
}
