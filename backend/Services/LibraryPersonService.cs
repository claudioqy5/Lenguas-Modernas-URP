using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.DTOs;
using AsistenciaLenguas.Api.Models;
using AsistenciaLenguas.Api.Utils;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Services
{
    public interface ILibraryPersonService
    {
        /// <summary>Look up any person by code OR DNI, across all types.</summary>
        Task<LibraryPerson?> FindByKeyAsync(string key);

        /// <summary>Look up by code (alumnos, maestrandos, doctorandos).</summary>
        Task<LibraryPerson?> FindByCodeAsync(string code);

        /// <summary>Look up by DNI (all types).</summary>
        Task<LibraryPerson?> FindByDocumentAsync(string documentNumber);

        Task<LibraryPerson> RegisterAsync(RegisterLibraryPersonDto dto);
        Task<LibraryPerson?> UpdateAsync(string id, UpdateLibraryPersonDto dto);
        Task<List<LibraryPerson>> GetByTypeAsync(string personType);
        Task<List<LibraryPerson>> GetAllAsync();
        Task<bool> DeleteAsync(string id);
    }

    public class LibraryPersonService : ILibraryPersonService
    {
        private readonly MongoDbContext _db;
        private readonly IAttendanceService _attendance;

        public LibraryPersonService(MongoDbContext db, IAttendanceService attendance)
        {
            _db = db;
            _attendance = attendance;
        }

        // ─── Lookup ───────────────────────────────────────────────────────────

        public async Task<LibraryPerson?> FindByKeyAsync(string key)
        {
            // Try code first, then DNI
            var byCode = await FindByCodeAsync(key);
            if (byCode != null) return byCode;
            return await FindByDocumentAsync(key);
        }

        public async Task<LibraryPerson?> FindByCodeAsync(string code)
        {
            if (string.IsNullOrWhiteSpace(code)) return null;
            return await _db.LibraryPersons
                .Find(p => p.Code == code)
                .FirstOrDefaultAsync();
        }

        public async Task<LibraryPerson?> FindByDocumentAsync(string documentNumber)
        {
            if (string.IsNullOrWhiteSpace(documentNumber)) return null;
            return await _db.LibraryPersons
                .Find(p => p.DocumentNumber == documentNumber)
                .FirstOrDefaultAsync();
        }

        // ─── CRUD ─────────────────────────────────────────────────────────────

        public async Task<LibraryPerson> RegisterAsync(RegisterLibraryPersonDto dto)
        {
            var person = new LibraryPerson
            {
                PersonType     = dto.PersonType,
                Code           = dto.Code.Trim(),
                DocumentNumber = dto.DocumentNumber.Trim(),
                FirstName      = dto.FirstName.Trim(),
                LastName       = dto.LastName.Trim(),
                Faculty        = dto.Faculty.Trim(),
                Career         = dto.Career.Trim(),
                Program        = dto.Program.Trim(),
                Email          = dto.Email.Trim(),
                Phone          = dto.Phone.Trim(),
                TotalVisits    = 0,
                CreatedAt      = DateTime.UtcNow
            };

            await _db.LibraryPersons.InsertOneAsync(person);

            // Auto check-in if requested and within library hours
            if (dto.CheckInNow)
            {
                var lookupKey = string.IsNullOrWhiteSpace(person.Code)
                    ? person.DocumentNumber
                    : person.Code;

                await _attendance.RegisterCheckInAsync(new CheckInRequestDto
                {
                    StudentCode  = lookupKey,
                    VisitReason  = dto.VisitReason,
                    EntryMethod  = dto.EntryMethod
                });
            }

            return person;
        }

        public async Task<LibraryPerson?> UpdateAsync(string id, UpdateLibraryPersonDto dto)
        {
            var update = Builders<LibraryPerson>.Update
                .Set(p => p.DocumentNumber, dto.DocumentNumber.Trim())
                .Set(p => p.FirstName,      dto.FirstName.Trim())
                .Set(p => p.LastName,       dto.LastName.Trim())
                .Set(p => p.Faculty,        dto.Faculty.Trim())
                .Set(p => p.Career,         dto.Career.Trim())
                .Set(p => p.Program,        dto.Program.Trim())
                .Set(p => p.Email,          dto.Email.Trim())
                .Set(p => p.Phone,          dto.Phone.Trim());

            await _db.LibraryPersons.UpdateOneAsync(p => p.Id == id, update);
            return await _db.LibraryPersons.Find(p => p.Id == id).FirstOrDefaultAsync();
        }

        public async Task<List<LibraryPerson>> GetByTypeAsync(string personType)
        {
            return await _db.LibraryPersons
                .Find(p => p.PersonType == personType)
                .SortBy(p => p.LastName)
                .ToListAsync();
        }

        public async Task<List<LibraryPerson>> GetAllAsync()
        {
            return await _db.LibraryPersons
                .Find(_ => true)
                .SortBy(p => p.PersonType)
                .ThenBy(p => p.LastName)
                .ToListAsync();
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var result = await _db.LibraryPersons.DeleteOneAsync(p => p.Id == id);
            return result.DeletedCount > 0;
        }
    }
}
