using System.Text;
using AsistenciaLenguas.Api.Data;
using AsistenciaLenguas.Api.Hubs;
using AsistenciaLenguas.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add Controllers with camelCase JSON serializer
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// SignalR for real-time attendance dashboard updates
builder.Services.AddSignalR();

// MongoDB Context Singleton
builder.Services.AddSingleton<MongoDbContext>();

// Application Services
builder.Services.AddScoped<IStudentService, StudentService>();
builder.Services.AddScoped<IQuoteService, QuoteService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<IAnalyticsService, AnalyticsService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// CORS Configuration - Allow Vite dev server and production clients
// Note: SignalR requires AllowCredentials, so we can't use AllowAnyOrigin together.
// We allow specific origins plus a wildcard fallback policy.
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "http://localhost:3000",
                "https://lenguas-modernas-urp.vercel.app"
              )
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials(); // Required for SignalR WebSockets
    });

    // Fallback open policy for any other non-SignalR API calls
    options.AddPolicy("OpenApi", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

// JWT Authentication
var secretKey = builder.Configuration.GetValue<string>("JwtSettings:SecretKey") 
                ?? "URP_FacultadLenguasModernas_SuperSecretKey_2026_Key!";
var issuer = builder.Configuration.GetValue<string>("JwtSettings:Issuer") ?? "AsistenciaLenguasApi";
var audience = builder.Configuration.GetValue<string>("JwtSettings:Audience") ?? "AsistenciaLenguasClient";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = issuer,
        ValidAudience = audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Ensure MongoDbContext is instantiated on startup to initialize indexes & seed
using (var scope = app.Services.CreateScope())
{
    var mongoContext = scope.ServiceProvider.GetRequiredService<MongoDbContext>();
}

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Map SignalR hub endpoint
app.MapHub<AttendanceHub>("/hubs/attendance");

// Health check endpoint
app.MapGet("/", () => new
{
    status = "Online",
    faculty = "Facultad de Humanidades y Lenguas Modernas - Universidad Ricardo Palma",
    system = "Sistema de Control de Asistencia y Biblioteca",
    version = "1.0.0"
});

app.Run();
