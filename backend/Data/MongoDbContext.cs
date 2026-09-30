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

        private void InitIndexesAndSeed()
        {
            try
            {
                // Unique index on Student.StudentCode
                var studentIndexKeys = Builders<Student>.IndexKeys.Ascending(s => s.StudentCode);
                var studentIndexOptions = new CreateIndexOptions { Unique = true };
                Students.Indexes.CreateOne(new CreateIndexModel<Student>(studentIndexKeys, studentIndexOptions));

                // Index on Attendance.Timestamp and DateString
                var attendanceDateKeys = Builders<AttendanceRecord>.IndexKeys.Ascending(a => a.DateString);
                AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(attendanceDateKeys));

                var attendanceStudentKeys = Builders<AttendanceRecord>.IndexKeys.Ascending(a => a.StudentCode);
                AttendanceRecords.Indexes.CreateOne(new CreateIndexModel<AttendanceRecord>(attendanceStudentKeys));

                // Index on Faculty and Career
                var facultyIndexKeys = Builders<Faculty>.IndexKeys.Ascending(f => f.Name);
                Faculties.Indexes.CreateOne(new CreateIndexModel<Faculty>(facultyIndexKeys));

                var careerFacultyIndexKeys = Builders<Career>.IndexKeys.Ascending(c => c.FacultyId);
                Careers.Indexes.CreateOne(new CreateIndexModel<Career>(careerFacultyIndexKeys));

                // Seed Admin if not exists
                var adminExists = AdminUsers.Find(u => u.Username == "admin").Any();
                if (!adminExists)
                {
                    var defaultAdmin = new AdminUser
                    {
                        Username = "admin",
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                        FullName = "Lic. Bibliotecólogo URP",
                        Role = "Bibliotecario",
                        CreatedAt = DateTime.UtcNow
                    };
                    AdminUsers.InsertOne(defaultAdmin);
                }

                // Seed Faculties and Careers if empty
                if (Faculties.CountDocuments(FilterDefinition<Faculty>.Empty) == 0)
                {
                    SeedFacultiesAndCareers();
                }

                // Seed Initial Students and Attendance history if empty
                if (Students.CountDocuments(FilterDefinition<Student>.Empty) == 0)
                {
                    SeedInitialData();
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

        private void SeedInitialData()
        {
            var sampleStudents = new List<Student>
            {
                new() { StudentCode = "202310452", DocumentNumber = "74125896", FirstName = "Valeria", LastName = "Mendoza Rojas", Career = "Traducción e Interpretación", Faculty = "Humanidades y Lenguas Modernas", Email = "valeria.mendoza@urp.edu.pe", PrimaryLanguage = "Inglés - Francés", TotalVisits = 14, CreatedAt = DateTime.UtcNow.AddMonths(-3) },
                new() { StudentCode = "202220184", DocumentNumber = "71234567", FirstName = "Mateo", LastName = "Villanueva Castro", Career = "Ingeniería Civil", Faculty = "Ingeniería", Email = "mateo.villanueva@urp.edu.pe", PrimaryLanguage = "Alemán - Inglés", TotalVisits = 22, CreatedAt = DateTime.UtcNow.AddMonths(-4) },
                new() { StudentCode = "202410889", DocumentNumber = "78965412", FirstName = "Camila", LastName = "Flores Paredes", Career = "Biología", Faculty = "Ciencias Biológicas", Email = "camila.flores@urp.edu.pe", PrimaryLanguage = "Italiano", TotalVisits = 9, CreatedAt = DateTime.UtcNow.AddMonths(-1) },
                new() { StudentCode = "202110567", DocumentNumber = "70891234", FirstName = "Sebastián", LastName = "Gómez Alarcón", Career = "Medicina Humana", Faculty = "Medicina Humana", Email = "sebastian.gomez@urp.edu.pe", PrimaryLanguage = "Chino Mandarín", TotalVisits = 31, CreatedAt = DateTime.UtcNow.AddMonths(-5) },
                new() { StudentCode = "202320711", DocumentNumber = "75641239", FirstName = "Luciana", LastName = "Herrera Silva", Career = "Administración y Negocios Internacionales", Faculty = "Ciencias Económicas y Empresariales", Email = "luciana.herrera@urp.edu.pe", PrimaryLanguage = "Portugués", TotalVisits = 18, CreatedAt = DateTime.UtcNow.AddMonths(-2) },
                new() { StudentCode = "202420319", DocumentNumber = "73456789", FirstName = "Joaquín", LastName = "Ríos Chávez", Career = "Arquitectura", Faculty = "Arquitectura y Urbanismo", Email = "joaquin.rios@urp.edu.pe", PrimaryLanguage = "Inglés", TotalVisits = 12, CreatedAt = DateTime.UtcNow.AddMonths(-1) },
                new() { StudentCode = "202210940", DocumentNumber = "76543210", FirstName = "Andrea", LastName = "Salazar Quiroz", Career = "Psicología", Faculty = "Psicología", Email = "andrea.salazar@urp.edu.pe", PrimaryLanguage = "Francés", TotalVisits = 25, CreatedAt = DateTime.UtcNow.AddMonths(-4) }
            };

            Students.InsertMany(sampleStudents);

            // Generate realistic attendance history for rich statistical charts
            var random = new Random(42);
            var reasons = new[] { "Lectura / Estudio", "Computadoras", "Préstamo de Libros", "Tándem / Idiomas", "Trabajo Grupal" };
            var records = new List<AttendanceRecord>();
            var today = DateTime.UtcNow;

            for (int dayOffset = 30; dayOffset >= 0; dayOffset--)
            {
                var targetDate = today.AddDays(-dayOffset);
                if (targetDate.DayOfWeek == DayOfWeek.Sunday) continue; // Sunday library closed

                int visitsCount = random.Next(10, 26);
                for (int i = 0; i < visitsCount; i++)
                {
                    var student = sampleStudents[random.Next(sampleStudents.Count)];
                    
                    // Realistic hours (8 to 19 hrs) with peak around 10-12 and 15-17
                    int hour;
                    int dice = random.Next(100);
                    if (dice < 35) hour = random.Next(10, 13); // Peak 1
                    else if (dice < 70) hour = random.Next(15, 18); // Peak 2
                    else if (dice < 85) hour = random.Next(8, 10);
                    else hour = random.Next(13, 15);

                    var minute = random.Next(0, 60);
                    var second = random.Next(0, 60);
                    var recordTime = new DateTime(targetDate.Year, targetDate.Month, targetDate.Day, hour, minute, second, DateTimeKind.Utc);

                    var dayOfWeekSpanish = recordTime.DayOfWeek switch
                    {
                        DayOfWeek.Monday => "Lunes",
                        DayOfWeek.Tuesday => "Martes",
                        DayOfWeek.Wednesday => "Miércoles",
                        DayOfWeek.Thursday => "Jueves",
                        DayOfWeek.Friday => "Viernes",
                        DayOfWeek.Saturday => "Sábado",
                        _ => "Domingo"
                    };

                    int dayNumber = recordTime.DayOfWeek switch
                    {
                        DayOfWeek.Monday => 1,
                        DayOfWeek.Tuesday => 2,
                        DayOfWeek.Wednesday => 3,
                        DayOfWeek.Thursday => 4,
                        DayOfWeek.Friday => 5,
                        DayOfWeek.Saturday => 6,
                        _ => 7
                    };

                    records.Add(new AttendanceRecord
                    {
                        StudentId = student.Id ?? string.Empty,
                        StudentCode = student.StudentCode,
                        StudentName = student.FullName,
                        Career = student.Career,
                        Timestamp = recordTime,
                        DateString = recordTime.ToString("yyyy-MM-dd"),
                        TimeString = recordTime.ToString("HH:mm:ss"),
                        DayOfWeek = dayOfWeekSpanish,
                        DayOfWeekNumber = dayNumber,
                        HourOfDay = hour,
                        VisitReason = reasons[random.Next(reasons.Length)],
                        LanguageFocus = student.PrimaryLanguage,
                        EntryMethod = (i % 3 == 0) ? "Manual" : "Barcode"
                    });
                }
            }

            if (records.Count > 0)
            {
                AttendanceRecords.InsertMany(records);
            }
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
