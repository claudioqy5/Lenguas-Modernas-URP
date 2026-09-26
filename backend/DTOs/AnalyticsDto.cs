namespace AsistenciaLenguas.Api.DTOs
{
    public class HourlyStatDto
    {
        public int Hour { get; set; }
        public string Label { get; set; } = string.Empty; // e.g. "08:00 - 09:00"
        public int Count { get; set; }
    }

    public class DayStatDto
    {
        public string Day { get; set; } = string.Empty; // "Lunes", "Martes", etc.
        public int DayNumber { get; set; }
        public int Count { get; set; }
    }

    public class TopStudentDto
    {
        public string StudentId { get; set; } = string.Empty;
        public string StudentCode { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Career { get; set; } = string.Empty;
        public int VisitCount { get; set; }
        public DateTime? LastVisit { get; set; }
    }

    public class DistributionItemDto
    {
        public string Name { get; set; } = string.Empty;
        public int Count { get; set; }
        public double Percentage { get; set; }
    }

    public class AnalyticsSummaryDto
    {
        public int TotalRegisteredStudents { get; set; }
        public int TotalVisitsAllTime { get; set; }
        public int TotalVisitsToday { get; set; }
        public int TotalVisitsThisMonth { get; set; }
        public int CurrentOccupancy { get; set; }
        public int MaxCapacity { get; set; }
        public double OccupancyPercentage { get; set; }

        public List<HourlyStatDto> PeakHours { get; set; } = new();
        public List<DayStatDto> PeakDays { get; set; } = new();
        public List<TopStudentDto> TopStudents { get; set; } = new();
        public List<DistributionItemDto> CareerDistribution { get; set; } = new();
        public List<DistributionItemDto> ReasonDistribution { get; set; } = new();
        public List<DistributionItemDto> LanguageDistribution { get; set; } = new();
    }
}
