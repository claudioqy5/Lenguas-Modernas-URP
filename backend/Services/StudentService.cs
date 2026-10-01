using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.DTOs;
using AsistenciaLenguas.Api.Models;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Services
{
    public interface IStudentService
    {
        Task<List<Student>> GetAllStudentsAsync();
        Task<Student?> GetByStudentCodeAsync(string studentCode);
        Task<Student?> GetByIdAsync(string id);
        Task<Student> RegisterStudentAsync(RegisterStudentDto dto);
        Task<bool> UpdateStudentAsync(string id, UpdateStudentDto dto);
        Task<bool> DeleteStudentAsync(string id);
    }

    public class StudentService : IStudentService
    {
        private readonly MongoDbContext _context;

        public StudentService(MongoDbContext context)
        {
            _context = context;
        }

        public async Task<List<Student>> GetAllStudentsAsync()
        {
            return await _context.Students.Find(_ => true)
                .SortByDescending(s => s.LastVisitAt)
                .ToListAsync();
        }

        public async Task<Student?> GetByStudentCodeAsync(string studentCode)
        {
            var cleanCode = studentCode.Trim();
            return await _context.Students.Find(s => s.StudentCode == cleanCode || s.DocumentNumber == cleanCode).FirstOrDefaultAsync();
        }

        public async Task<Student?> GetByIdAsync(string id)
        {
            return await _context.Students.Find(s => s.Id == id).FirstOrDefaultAsync();
        }

        public async Task<Student> RegisterStudentAsync(RegisterStudentDto dto)
        {
            var cleanCode = dto.StudentCode.Trim();
            var existing = await GetByStudentCodeAsync(cleanCode);
            if (existing != null)
            {
                throw new InvalidOperationException($"El estudiante con código '{cleanCode}' ya se encuentra registrado.");
            }

            var student = new Student
            {
                StudentCode = cleanCode,
                DocumentNumber = dto.DocumentNumber.Trim(),
                FirstName = dto.FirstName.Trim(),
                LastName = dto.LastName.Trim(),
                Career = string.IsNullOrWhiteSpace(dto.Career) ? "Traducción e Interpretación" : dto.Career.Trim(),
                Faculty = string.IsNullOrWhiteSpace(dto.Faculty) ? "Humanidades y Lenguas Modernas" : dto.Faculty.Trim(),
                Email = dto.Email.Trim(),
                Phone = dto.Phone.Trim(),
                PrimaryLanguage = string.IsNullOrWhiteSpace(dto.PrimaryLanguage) ? "Inglés" : dto.PrimaryLanguage.Trim(),
                TotalVisits = 0,
                CreatedAt = DateTime.UtcNow,
                LastVisitAt = null
            };

            await _context.Students.InsertOneAsync(student);
            return student;
        }

        public async Task<bool> UpdateStudentAsync(string id, UpdateStudentDto dto)
        {
            var update = Builders<Student>.Update
                .Set(s => s.DocumentNumber, dto.DocumentNumber.Trim())
                .Set(s => s.FirstName, dto.FirstName.Trim())
                .Set(s => s.LastName, dto.LastName.Trim())
                .Set(s => s.Career, dto.Career.Trim())
                .Set(s => s.Faculty, dto.Faculty.Trim())
                .Set(s => s.Email, dto.Email.Trim())
                .Set(s => s.Phone, dto.Phone.Trim())
                .Set(s => s.PrimaryLanguage, dto.PrimaryLanguage.Trim());

            var result = await _context.Students.UpdateOneAsync(s => s.Id == id, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteStudentAsync(string id)
        {
            var result = await _context.Students.DeleteOneAsync(s => s.Id == id);
            return result.DeletedCount > 0;
        }
    }
}
