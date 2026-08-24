using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using WorkflowHub.Api.Data;
using WorkflowHub.Api.Hubs;
using WorkflowHub.Api.Models;
using WorkflowHub.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// -------------------------------------------------------------
// 1. Configuration & Options Binding
// -------------------------------------------------------------
builder.Services.Configure<AwsOptions>(builder.Configuration.GetSection("AWS"));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));

// -------------------------------------------------------------
// 2. Database Context (PostgreSQL via EF Core)
// -------------------------------------------------------------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? "Host=localhost;Port=5432;Database=workflowhub_db;Username=postgres;Password=WorkflowSecret2026!";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
    });
});

// -------------------------------------------------------------
// 3. Environment-Aware Hybrid Storage Provider Registration
// -------------------------------------------------------------
builder.Services.AddHttpContextAccessor();

// Register concrete implementations
builder.Services.AddSingleton<S3StorageService>();
builder.Services.AddScoped<LocalStorageService>();

// Dynamic Factory: Resolves S3 if AWS credentials exist; otherwise gracefully defaults to LocalFiles
builder.Services.AddScoped<IStorageService>(sp =>
{
    var awsOptions = builder.Configuration.GetSection("AWS").Get<AwsOptions>();
    var logger = sp.GetRequiredService<ILogger<Program>>();

    if (awsOptions != null && awsOptions.IsConfigured)
    {
        logger.LogInformation("DI Container: Active Storage Provider is AWS S3 (Bucket: {Bucket})", awsOptions.BucketName);
        return sp.GetRequiredService<S3StorageService>();
    }

    logger.LogInformation("DI Container: AWS Credentials absent. Fallback to Local Filesystem Storage (LocalFiles/)");
    return sp.GetRequiredService<LocalStorageService>();
});

// -------------------------------------------------------------
// 4. Real-time Communication (SignalR)
// -------------------------------------------------------------
builder.Services.AddSignalR(hubOptions =>
{
    hubOptions.EnableDetailedErrors = builder.Environment.IsDevelopment();
    hubOptions.KeepAliveInterval = TimeSpan.FromSeconds(15);
    hubOptions.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
}).AddJsonProtocol(options =>
{
    options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// -------------------------------------------------------------
// 5. Cross-Origin Resource Sharing (CORS)
// -------------------------------------------------------------
var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]?.Split(',', StringSplitOptions.RemoveEmptyEntries)
    ?? new[] { "http://localhost:4200", "http://localhost:3000", "http://127.0.0.1:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("WorkflowHubCorsPolicy", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// -------------------------------------------------------------
// 6. Controllers, Swagger, and Health Checks
// -------------------------------------------------------------
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "WorkflowHub Enterprise Web API",
        Version = "v1",
        Description = "Production-grade workflow orchestration API with hybrid AWS S3 / LocalFiles pre-signed storage and SignalR real-time synchronization.",
        Contact = new OpenApiContact
        {
            Name = "WorkflowHub Engineering",
            Email = "architecture@workflowhub.dev"
        }
    });
});

builder.Services.AddHealthChecks();

var app = builder.Build();

// -------------------------------------------------------------
// 7. Auto-Migration & Database Seeding on Startup
// -------------------------------------------------------------
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        logger.LogInformation("Ensuring PostgreSQL database schema is migrated...");
        
        // --- FIX IS HERE: Change EnsureCreated to Migrate ---
        context.Database.Migrate(); 
        
        logger.LogInformation("PostgreSQL schema successfully verified.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while initializing the database.");
    }
}

// -------------------------------------------------------------
// 8. HTTP Pipeline Configuration
// -------------------------------------------------------------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "WorkflowHub API v1"));
}

app.UseCors("WorkflowHubCorsPolicy");

app.UseRouting();

app.UseAuthorization();

// Healthcheck endpoint
app.MapHealthChecks("/api/health");

// API Controller endpoints
app.MapControllers();

// SignalR WebSocket Hub endpoint
app.MapHub<DocumentHub>("/hubs/documents");

app.Run();
