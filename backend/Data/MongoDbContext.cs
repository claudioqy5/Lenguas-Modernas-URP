using AsistenciaLenguas.Api.Models;
using MongoDB.Driver;

namespace AsistenciaLenguas.Api.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var connectionString = configuration.GetSection("MongoDbSettings:ConnectionString").Value 
                                   ?? "mongodb://localhost:27017";
            var databaseName = configuration.GetSection("MongoDbSettings:DatabaseName").Value 
                               ?? "BibliotecaLenguasModernas";

            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);

            InitIndexesAndSeed();
        }

        public IMongoCollection<Student> Students => _database.GetCollection<Student>("Students");
        public IMongoCollection<AttendanceRecord> AttendanceRecords => _database.GetCollection<AttendanceRecord>("AttendanceRecords");
        public IMongoCollection<AdminUser> AdminUsers => _database.GetCollection<AdminUser>("AdminUsers");
        public IMongoCollection<Faculty> Faculties => _database.GetCollection<Faculty>("Faculties");
        public IMongoCollection<Career> Careers => _database.GetCollection<Career>("Careers");
        public IMongoCollection<LibraryPerson> LibraryPersons => _database.GetCollection<LibraryPerson>("LibraryPersons");

        private void InitIndexesAndSeed()
        {
            try
            {
                // Unique index on Student.StudentCode
                var studentIndexKeys = Builders<Student>.IndexKeys.Ascending(s => s.StudentCode);
                var studentIndexOptions = new CreateIndexOptions { Unique = true };
                Students.Indexes.CreateOne(new CreateIndexModel<Student>(studentIndexKeys, studentIndexOptions));

                // Index on Attendance.DateString
                var attendanceDateKeys = Builders<AttendanceRecord>.IndexKeys.Ascending(a => a.DateString);
                AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(attendanceDateKeys));

                // Index on Attendance.StudentCode
                var attendanceStudentKeys = Builders<AttendanceRecord>.IndexKeys.Ascending(a => a.StudentCode);
                AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(attendanceStudentKeys));

                // Index on Attendance.IsActive (for occupancy count queries)
                var attendanceIsActiveKeys = Builders<AttendanceRecord>.IndexKeys.Ascending(a => a.IsActive);
                AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(attendanceIsActiveKeys));

                // Compound index: (StudentCode + DateString + IsActive) for fast active-session lookup
                var activeSessionKeys = Builders<AttendanceRecord>.IndexKeys
                    .Ascending(a => a.StudentCode)
                    .Ascending(a => a.DateString)
                    .Ascending(a => a.IsActive);
                AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(activeSessionKeys));

                // Index on Faculty and Career
                var facultyIndexKeys = Builders<Faculty>.IndexKeys.Ascending(f => f.Name);
                Faculties.Indexes.CreateOne(new CreateIndexModel<Faculty>(facultyIndexKeys));

                var careerFacultyIndexKeys = Builders<Career>.IndexKeys.Ascending(c => c.FacultyId);
                Careers.Indexes.CreateOne(new CreateIndexModel<Career>(careerFacultyIndexKeys));

                // LibraryPersons: index on personType + documentNumber for fast lookup
                var personTypeIdx = Builders<LibraryPerson>.IndexKeys.Ascending(p => p.PersonType);
                LibraryPersons.Indexes.CreateOne(new CreateIndexModel<LibraryPerson>(personTypeIdx));

                var personDocIdx = Builders<LibraryPerson>.IndexKeys.Ascending(p => p.DocumentNumber);
                LibraryPersons.Indexes.CreateOne(new CreateIndexModel<LibraryPerson>(personDocIdx));

                var personCodeIdx = Builders<LibraryPerson>.IndexKeys
                    .Ascending(p => p.PersonType)
                    .Ascending(p => p.Code);
                LibraryPersons.Indexes.CreateOne(new CreateIndexModel<LibraryPerson>(personCodeIdx));

                // Seed or update SuperUser 201712043
                var superUser = AdminUsers.Find(u => u.Username.ToLower() == "201712043").FirstOrDefault();
                if (superUser == null)
                {
                    var defaultAdmin = new AdminUser
                    {
                        Username = "201712043",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("72493906"),
                        FullName = "Lic. Claudio Quello - Super Administrador",
                        Role = "SuperAdmin",
                        CreatedAt = DateTime.UtcNow
                    };
                    AdminUsers.InsertOne(defaultAdmin);
                }
                else
                {
                    var updatedHash = BCrypt.Net.BCrypt.HashPassword("72493906");
                    AdminUsers.UpdateOne(
                        u => u.Id == superUser.Id,
                        Builders<AdminUser>.Update
                            .Set(u => u.PasswordHash, updatedHash)
                            .Set(u => u.Role, "SuperAdmin")
                    );
                }

                // Seed Faculties and Careers if empty
                if (Faculties.CountDocuments(FilterDefinition<Faculty>.Empty) == 0)
                {
                    SeedFacultiesAndCareers();
                }

            }
            catch (Exception ex)
            {
                Console.WriteLine($"[MongoDbContext] Init/Seed warning: {ex.Message}");
            }
        }

        public void ReSeedData()
        {
            _database.DropCollection("Students");
            _database.DropCollection("AttendanceRecords");
            InitIndexesAndSeed();
        }

        public void ClearAttendanceRecords()
        {
            _database.DropCollection("AttendanceRecords");
            
            // Re-create indexes for AttendanceRecords immediately
            var attendanceDateKeys = Builders<AttendanceRecord>.IndexKeys.Ascending(a => a.DateString);
            AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(attendanceDateKeys));

            var attendanceStudentKeys = Builders<AttendanceRecord>.IndexKeys.Ascending(a => a.StudentCode);
            AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(attendanceStudentKeys));
        }



        private void SeedFacultiesAndCareers()
        {
            var facultiesSeed = new List<(string Name, string Code, List<(string Name, string Code)> Careers)>
            {
                ("Humanidades y Lenguas Modernas", "FHLM", new List<(string, string)>
                {
                    ("Traducción e Interpretación", "TI"),
                    ("Humanidades y Lingüística", "HL"),
                    ("Turismo, Hotelería y Gastronomía", "THG")
                }),
                ("Ingeniería", "FING", new List<(string, string)>
                {
                    ("Ingeniería Civil", "ICIV"),
                    ("Ingeniería Industrial", "IIND"),
                    ("Ingeniería Informática", "IINF"),
                    ("Ingeniería Electrónica", "IELEC"),
                    ("Ingeniería Mecatrónica", "IMECA")
                }),
                ("Medicina Humana", "FMED", new List<(string, string)>
                {
                    ("Medicina Humana", "MED"),
                    ("Enfermería", "ENF")
                }),
                ("Ciencias Biológicas", "FCB", new List<(string, string)>
                {
                    ("Biología", "BIO"),
                    ("Medicina Veterinaria", "MVET")
                }),
                ("Ciencias Económicas y Empresariales", "FCEE", new List<(string, string)>
                {
                    ("Administración y Negocios Internacionales", "ANI"),
                    ("Contabilidad y Finanzas", "CF"),
                    ("Economía", "ECON"),
                    ("Marketing Global y Administración Comercial", "MGAC")
                }),
                ("Arquitectura y Urbanismo", "FAU", new List<(string, string)>
                {
                    ("Arquitectura y Urbanismo", "ARQ")
                }),
                ("Psicología", "FPSI", new List<(string, string)>
                {
                    ("Psicología", "PSI")
                }),
                ("Derecho y Ciencia Política", "FDCP", new List<(string, string)>
                {
                    ("Derecho", "DER")
                })
            };

            foreach (var fSeed in facultiesSeed)
            {
                var faculty = new Faculty
                {
                    Name = fSeed.Name,
                    Code = fSeed.Code,
                    CreatedAt = DateTime.UtcNow
                };
                Faculties.InsertOne(faculty);

                var careersToInsert = fSeed.Careers.Select(c => new Career
                {
                    Name = c.Item1,
                    Code = c.Item2,
                    FacultyId = faculty.Id!,
                    FacultyName = faculty.Name,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                if (careersToInsert.Count > 0)
                {
                    Careers.InsertMany(careersToInsert);
                }
            }
        }
    }
}
