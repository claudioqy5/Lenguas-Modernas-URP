using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.DTOs;
using AsistenciaLenguas.Api.Models;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Services
{
    public interface IAnalyticsService
    {
        Task<AnalyticsSummaryDto> GetSummaryAsync();
    }

    public class AnalyticsService : IAnalyticsService
    {
        private readonly MongoDbContext _context;
        private readonly IAttendanceService _attendanceService;

        public AnalyticsService(MongoDbContext context, IAttendanceService attendanceService)
        {
            _context = context;
            _attendanceService = attendanceService;
        }

        public async Task<AnalyticsSummaryDto> GetSummaryAsync()
        {
            var totalStudents = (int)await _context.Students.CountDocumentsAsync(_ => true);
            var totalVisits = (int)await _context.AttendanceRecords.CountDocumentsAsync(_ => true);

            var now = DateTime.UtcNow;
            var peruTime = TimeZoneInfo.ConvertTimeFromUtc(now, 
                TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time"));
            var todayStr = peruTime.ToString("yyyy-MM-dd");
            var monthPrefix = peruTime.ToString("yyyy-MM");

            var todayFilter = Builders<AttendanceRecord>.Filter.Eq(a => a.DateString, todayStr);
            var totalToday = (int)await _context.AttendanceRecords.CountDocumentsAsync(todayFilter);

            var monthFilter = Builders<AttendanceRecord>.Filter.Regex(a => a.DateString, $"^{monthPrefix}");
            var totalMonth = (int)await _context.AttendanceRecords.CountDocumentsAsync(monthFilter);

            var (currentOccupancy, maxCapacity, percentage) = await _attendanceService.GetOccupancyAsync();

            // Fetch records for analytics (last 90 days or all)
            var allRecords = await _context.AttendanceRecords.Find(_ => true).ToListAsync();

            // 1. Peak Hours (08:00 - 20:00)
            var hourCounts = new Dictionary<int, int>();
            for (int h = 8; h <= 19; h++) hourCounts[h] = 0;

            foreach (var rec in allRecords)
            {
                if (rec.HourOfDay >= 8 && rec.HourOfDay <= 19)
                {
                    hourCounts[rec.HourOfDay]++;
                }
            }

            var peakHours = hourCounts.OrderBy(k => k.Key).Select(k => new HourlyStatDto
            {
                Hour = k.Key,
                Label = $"{k.Key:D2}:00",
                Count = k.Value
            }).ToList();

            // 2. Peak Days (Lunes a Sábado)
            var daysList = new[] { "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado" };
            var dayCounts = daysList.ToDictionary(d => d, d => 0);

            foreach (var rec in allRecords)
            {
                if (dayCounts.ContainsKey(rec.DayOfWeek))
                {
                    dayCounts[rec.DayOfWeek]++;
                }
            }

            var peakDays = daysList.Select((d, idx) => new DayStatDto
            {
                Day = d,
                DayNumber = idx + 1,
                Count = dayCounts[d]
            }).ToList();

            // 3. Top Students (ranking)
            var topStudentsFromDb = await _context.Students.Find(_ => true)
                .SortByDescending(s => s.TotalVisits)
                .Limit(10)
                .ToListAsync();

            var topStudents = topStudentsFromDb.Select(s => new TopStudentDto
            {
                StudentId = s.Id ?? string.Empty,
                StudentCode = s.StudentCode,
                FullName = s.FullName,
                Career = s.Career,
                VisitCount = s.TotalVisits,
                LastVisit = s.LastVisitAt
            }).ToList();

            // 4. Career Distribution
            var careerCounts = allRecords.GroupBy(r => string.IsNullOrWhiteSpace(r.Career) ? "Traducción e Interpretación" : r.Career)
                .ToDictionary(g => g.Key, g => g.Count());

            var careerDistribution = careerCounts.Select(c => new DistributionItemDto
            {
                Name = c.Key,
                Count = c.Value,
                Percentage = totalVisits > 0 ? Math.Round(((double)c.Value / totalVisits) * 100, 1) : 0
            }).OrderByDescending(c => c.Count).ToList();

            // 5. Reason Distribution
            var reasonCounts = allRecords.GroupBy(r => string.IsNullOrWhiteSpace(r.VisitReason) ? "Lectura / Estudio" : r.VisitReason)
                .ToDictionary(g => g.Key, g => g.Count());

            var reasonDistribution = reasonCounts.Select(r => new DistributionItemDto
            {
                Name = r.Key,
                Count = r.Value,
                Percentage = totalVisits > 0 ? Math.Round(((double)r.Value / totalVisits) * 100, 1) : 0
            }).OrderByDescending(r => r.Count).ToList();

            // 6. Language Distribution
            var langCounts = allRecords.GroupBy(r => string.IsNullOrWhiteSpace(r.LanguageFocus) ? "General" : r.LanguageFocus)
                .ToDictionary(g => g.Key, g => g.Count());

            var langDistribution = langCounts.Select(l => new DistributionItemDto
            {
                Name = l.Key,
                Count = l.Value,
                Percentage = totalVisits > 0 ? Math.Round(((double)l.Value / totalVisits) * 100, 1) : 0
            }).OrderByDescending(l => l.Count).ToList();

            return new AnalyticsSummaryDto
            {
                TotalRegisteredStudents = totalStudents,
                TotalVisitsAllTime = totalVisits,
                TotalVisitsToday = totalToday,
                TotalVisitsThisMonth = totalMonth,
                CurrentOccupancy = currentOccupancy,
                MaxCapacity = maxCapacity,
                OccupancyPercentage = percentage,
                PeakHours = peakHours,
                PeakDays = peakDays,
                TopStudents = topStudents,
                CareerDistribution = careerDistribution,
                ReasonDistribution = reasonDistribution,
                LanguageDistribution = langDistribution
            };
        }
    }
}
