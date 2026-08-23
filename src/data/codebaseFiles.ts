export interface CodeFile {
  path: string;
  category: 'Backend .NET 10' | 'Frontend Angular' | 'DevOps & Docker' | 'Database & EF' | 'Architecture & Config';
  language: 'csharp' | 'typescript' | 'html' | 'scss' | 'dockerfile' | 'yaml' | 'json' | 'markdown';
  description: string;
  content: string;
}

export const CODEBASE_FILES: CodeFile[] = [
  {
    path: 'backend/Controllers/StorageController.cs',
    category: 'Backend .NET 10',
    language: 'csharp',
    description: 'Hybrid environment-aware storage controller generating AWS S3 Pre-Signed URLs and streaming LocalFiles fallback.',
    content: `using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WorkflowHub.Api.DTOs;
using WorkflowHub.Api.Models;
using WorkflowHub.Api.Services;

namespace WorkflowHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StorageController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly StorageOptions _storageOptions;
    private readonly AwsOptions _awsOptions;
    private readonly ILogger<StorageController> _logger;

    public StorageController(
        IStorageService storageService,
        IOptions<StorageOptions> storageOptions,
        IOptions<AwsOptions> awsOptions,
        ILogger<StorageController> logger)
    {
        _storageService = storageService;
        _storageOptions = storageOptions.Value;
        _awsOptions = awsOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// Returns storage provider diagnostics (AWS S3 vs Local fallback).
    /// </summary>
    [HttpGet("info")]
    public IActionResult GetStorageInfo()
    {
        return Ok(new StorageInfoResponse(
            Provider: _storageService.ProviderType.ToString(),
            IsAwsS3Configured: _awsOptions.IsConfigured,
            S3Bucket: _awsOptions.IsConfigured ? _awsOptions.BucketName : "N/A (Local Fallback Active)",
            S3Region: _awsOptions.IsConfigured ? _awsOptions.Region : "N/A",
            LocalFallbackPath: _storageOptions.FallbackLocalPath,
            MaxFileSizeMb: _storageOptions.MaxFileSizeMb,
            AllowedExtensions: _storageOptions.AllowedExtensions
        ));
    }

    /// <summary>
    /// Generates AWS S3 pre-signed upload URL or local upload target.
    /// Bypasses backend Web API when in S3 mode.
    /// </summary>
    [HttpPost("presigned-upload-url")]
    public async Task<IActionResult> GeneratePresignedUploadUrl([FromBody] PresignedUploadRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FileName))
            return BadRequest(new { message = "FileName is required." });

        var ext = Path.GetExtension(request.FileName).ToLowerInvariant();
        if (!_storageOptions.AllowedExtensions.Contains(ext))
            return BadRequest(new { message = $"Extension '{ext}' not allowed." });

        var datePrefix = DateTime.UtcNow.ToString("yyyy/MM");
        var sanitized = Path.GetFileNameWithoutExtension(request.FileName).Replace(" ", "_");
        var uniqueKey = $"documents/{datePrefix}/{Guid.NewGuid():N}_{sanitized}{ext}";

        var result = await _storageService.GenerateUploadUrlAsync(request, uniqueKey);
        return Ok(result);
    }

    /// <summary>
    /// Streams raw binary payload directly to local disk if AWS S3 credentials are absent.
    /// </summary>
    [HttpPut("local-upload/{*fileKey}")]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> HandleLocalUpload([FromRoute] string fileKey)
    {
        var contentType = Request.ContentType ?? "application/octet-stream";
        var savedKey = await _storageService.SaveFileStreamAsync(fileKey, Request.Body, contentType);
        return Ok(new { message = "File persisted locally to disk.", fileKey = savedKey });
    }

    /// <summary>
    /// Streams local file down to client.
    /// </summary>
    [HttpGet("local-download/{*fileKey}")]
    public async Task<IActionResult> HandleLocalDownload([FromRoute] string fileKey, [FromQuery] string? fileName)
    {
        var fileData = await _storageService.GetFileStreamAsync(fileKey);
        if (fileData == null) return NotFound(new { message = "File not found." });
        return File(fileData.Value.Stream, fileData.Value.ContentType, fileName ?? Path.GetFileName(fileKey));
    }
}`
  },
  {
    path: 'backend/Controllers/DocumentController.cs',
    category: 'Backend .NET 10',
    language: 'csharp',
    description: 'Document workflow state machine, comment threads, and SignalR real-time broadcast dispatcher.',
    content: `using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WorkflowHub.Api.Data;
using WorkflowHub.Api.DTOs;
using WorkflowHub.Api.Hubs;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<DocumentHub, IDocumentClient> _hubContext;

    public DocumentController(AppDbContext context, IHubContext<DocumentHub, IDocumentClient> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<IActionResult> GetDocuments([FromQuery] DocumentStatus? status, [FromQuery] string? search)
    {
        var query = _context.Documents
            .Include(d => d.Submitter)
            .Include(d => d.Comments).ThenInclude(c => c.Author)
            .Include(d => d.AuditLogs)
            .OrderByDescending(d => d.CreatedAt)
            .AsQueryable();

        if (status.HasValue) query = query.Where(d => d.Status == status.Value);
        return Ok(await query.ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> CreateDocument([FromBody] DocumentCreateRequest request)
    {
        var submitter = await _context.Users.FirstAsync(u => u.Role == UserRole.Submitter);
        var document = new Document
        {
            Title = request.Title,
            Description = request.Description,
            Category = request.Category,
            OriginalFileName = request.OriginalFileName,
            StoredFileKey = request.StoredFileKey,
            ContentType = request.ContentType,
            FileSizeBytes = request.FileSizeBytes,
            StorageProvider = request.StorageProvider,
            Status = DocumentStatus.Submitted,
            SubmitterId = submitter.Id
        };

        document.AuditLogs.Add(new DocumentAuditLog {
            Action = "Document Submitted",
            PerformedBy = submitter.FullName,
            Details = $"Uploaded '{request.OriginalFileName}' via {request.StorageProvider}."
        });

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // SignalR Push Broadcast
        await _hubContext.Clients.All.NewDocumentSubmitted(MapToResponse(document));
        return CreatedAtAction(nameof(GetDocuments), new { id = document.Id }, document);
    }

    [HttpPost("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] DocumentStatusChangeRequest request)
    {
        var doc = await _context.Documents.Include(d => d.AuditLogs).FirstOrDefaultAsync(d => d.Id == id);
        if (doc == null) return NotFound();

        var reviewer = await _context.Users.FirstAsync(u => u.Role == UserRole.Reviewer);
        doc.Status = request.NewStatus;
        doc.UpdatedAt = DateTime.UtcNow;
        doc.AssignedReviewerId = reviewer.Id;

        doc.AuditLogs.Add(new DocumentAuditLog {
            Action = $"Status Transition: {request.NewStatus}",
            PerformedBy = reviewer.FullName,
            Details = request.ReasonOrNote ?? "Status updated."
        });

        await _context.SaveChangesAsync();

        // Broadcast to SignalR Room
        await _hubContext.Clients.All.DocumentStatusChanged(MapToResponse(doc), request.ReasonOrNote);
        return Ok(doc);
    }
}`
  },
  {
    path: 'backend/Hubs/DocumentHub.cs',
    category: 'Backend .NET 10',
    language: 'csharp',
    description: 'Strongly-typed ASP.NET Core SignalR WebSockets Hub for real-time document synchronization.',
    content: `using Microsoft.AspNetCore.SignalR;
using WorkflowHub.Api.DTOs;

namespace WorkflowHub.Api.Hubs;

public interface IDocumentClient
{
    Task DocumentStatusChanged(DocumentResponse document, string note);
    Task NewDocumentSubmitted(DocumentResponse document);
    Task DocumentCommentAdded(Guid documentId, CommentResponse comment);
    Task ActiveUsersUpdated(int count);
}

public class DocumentHub : Hub<IDocumentClient>
{
    private static int _activeConnections = 0;

    public override async Task OnConnectedAsync()
    {
        Interlocked.Increment(ref _activeConnections);
        await Clients.All.ActiveUsersUpdated(_activeConnections);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Interlocked.Decrement(ref _activeConnections);
        await Clients.All.ActiveUsersUpdated(_activeConnections);
        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinDocumentRoom(string documentId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, $"doc_{documentId}");

    public async Task LeaveDocumentRoom(string documentId) =>
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"doc_{documentId}");
}`
  },
  {
    path: 'backend/Services/S3StorageService.cs',
    category: 'Backend .NET 10',
    language: 'csharp',
    description: 'AWS S3 SDK implementation for generating pre-signed upload URLs and direct binary streaming.',
    content: `using Amazon;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Options;
using WorkflowHub.Api.DTOs;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Services;

public class S3StorageService : IStorageService
{
    private readonly AwsOptions _awsOptions;
    private readonly StorageOptions _storageOptions;
    private readonly IAmazonS3? _s3Client;

    public StorageProviderType ProviderType => StorageProviderType.AwsS3;
    public bool IsAvailable => _awsOptions.IsConfigured;

    public S3StorageService(IOptions<AwsOptions> awsOptions, IOptions<StorageOptions> storageOptions)
    {
        _awsOptions = awsOptions.Value;
        _storageOptions = storageOptions.Value;
        if (_awsOptions.IsConfigured)
        {
            var region = RegionEndpoint.GetBySystemName(_awsOptions.Region);
            _s3Client = new AmazonS3Client(_awsOptions.AccessKey, _awsOptions.SecretKey, region);
        }
    }

    public Task<PresignedUploadResponse> GenerateUploadUrlAsync(PresignedUploadRequest request, string uniqueFileKey)
    {
        var presignedRequest = new GetPreSignedUrlRequest
        {
            BucketName = _awsOptions.BucketName,
            Key = uniqueFileKey,
            Verb = HttpVerb.PUT,
            Expires = DateTime.UtcNow.AddMinutes(_storageOptions.PresignedUrlExpirationMinutes),
            ContentType = request.ContentType
        };
        presignedRequest.Headers["x-amz-server-side-encryption"] = "AES256";

        var url = _s3Client!.GetPreSignedURL(presignedRequest);
        return Task.FromResult(new PresignedUploadResponse(
            UploadUrl: url,
            FileKey: uniqueFileKey,
            Provider: StorageProviderType.AwsS3,
            ExpiresInSeconds: _storageOptions.PresignedUrlExpirationMinutes * 60,
            RequiredHeaders: new Dictionary<string, string> { { "x-amz-server-side-encryption", "AES256" } },
            Message: "Pre-signed URL generated for direct AWS S3 PUT upload."
        ));
    }
}`
  },
  {
    path: 'backend/Services/LocalStorageService.cs',
    category: 'Backend .NET 10',
    language: 'csharp',
    description: 'Polymorphic local filesystem storage fallback activating seamlessly when AWS S3 is absent.',
    content: `using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using WorkflowHub.Api.DTOs;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Services;

public class LocalStorageService : IStorageService
{
    private readonly string _storageRootPath;
    private readonly StorageOptions _storageOptions;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public StorageProviderType ProviderType => StorageProviderType.LocalFilesystem;
    public bool IsAvailable => true;

    public LocalStorageService(IOptions<StorageOptions> storageOptions, IHttpContextAccessor httpContextAccessor, IWebHostEnvironment env)
    {
        _storageOptions = storageOptions.Value;
        _httpContextAccessor = httpContextAccessor;
        _storageRootPath = Path.Combine(env.ContentRootPath, _storageOptions.FallbackLocalPath);
        if (!Directory.Exists(_storageRootPath)) Directory.CreateDirectory(_storageRootPath);
    }

    public Task<PresignedUploadResponse> GenerateUploadUrlAsync(PresignedUploadRequest request, string uniqueFileKey)
    {
        var req = _httpContextAccessor.HttpContext?.Request;
        var baseUrl = req != null ? $"{req.Scheme}://{req.Host}" : "http://localhost:5000";
        var localUploadEndpoint = $"{baseUrl}/api/storage/local-upload/{Uri.EscapeDataString(uniqueFileKey)}";

        return Task.FromResult(new PresignedUploadResponse(
            UploadUrl: localUploadEndpoint,
            FileKey: uniqueFileKey,
            Provider: StorageProviderType.LocalFilesystem,
            ExpiresInSeconds: _storageOptions.PresignedUrlExpirationMinutes * 60,
            RequiredHeaders: new Dictionary<string, string> { { "Content-Type", request.ContentType } },
            Message: "Local Filesystem Fallback active (LocalFiles/ folder stream)."
        ));
    }

    public async Task<string> SaveFileStreamAsync(string fileKey, Stream fileStream, string contentType)
    {
        var sanitizedKey = Path.GetFileName(fileKey);
        var targetFilePath = Path.Combine(_storageRootPath, sanitizedKey);
        await using var dest = new FileStream(targetFilePath, FileMode.Create, FileAccess.Write);
        await fileStream.CopyToAsync(dest);
        return sanitizedKey;
    }
}`
  },
  {
    path: 'backend/Data/AppDbContext.cs',
    category: 'Database & EF',
    language: 'csharp',
    description: 'EF Core DbContext with PostgreSQL configuration, foreign key cascades, and initial user seeding.',
    content: `using Microsoft.EntityFrameworkCore;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<User> Users => Set<User>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentComment> DocumentComments => Set<DocumentComment>();
    public DbSet<DocumentAuditLog> DocumentAuditLogs => Set<DocumentAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Document>().HasOne(d => d.Submitter).WithMany(u => u.SubmittedDocuments).HasForeignKey(d => d.SubmitterId);
        modelBuilder.Entity<DocumentComment>().HasOne(c => c.Document).WithMany(d => d.Comments).HasForeignKey(c => c.DocumentId);
    }
}`
  },
  {
    path: 'frontend/src/app/services/signalr.service.ts',
    category: 'Frontend Angular',
    language: 'typescript',
    description: 'Angular SignalR service with automatic reconnect, active channels, and reactive Signals.',
    content: `import { Injectable, signal } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { DocumentComment, DocumentItem } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection?: signalR.HubConnection;
  public isConnected = signal<boolean>(false);
  public activeUsers = signal<number>(1);

  public documentStatusChanged$ = new Subject<{ document: DocumentItem; note: string }>();
  public newDocumentSubmitted$ = new Subject<DocumentItem>();
  public commentAdded$ = new Subject<{ documentId: string; comment: DocumentComment }>();

  public startConnection(): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/documents')
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .build();

    this.hubConnection.on('DocumentStatusChanged', (document, note) => this.documentStatusChanged$.next({ document, note }));
    this.hubConnection.on('NewDocumentSubmitted', (document) => this.newDocumentSubmitted$.next(document));
    this.hubConnection.on('DocumentCommentAdded', (docId, comment) => this.commentAdded$.next({ documentId: docId, comment }));

    this.hubConnection.start()
      .then(() => this.isConnected.set(true))
      .catch(err => console.error('[SignalR] Connection failed', err));
  }
}`
  },
  {
    path: 'frontend/src/app/services/storage.service.ts',
    category: 'Frontend Angular',
    language: 'typescript',
    description: 'Angular Storage service executing direct binary PUT uploads against S3 pre-signed URLs.',
    content: `import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PresignedUploadResponse, StorageInfo } from '../models/document.model';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private http = inject(HttpClient);

  getStorageInfo(): Observable<StorageInfo> {
    return this.http.get<StorageInfo>('/api/storage/info');
  }

  getPresignedUploadUrl(fileName: string, contentType: string, fileSizeBytes: number): Observable<PresignedUploadResponse> {
    return this.http.post<PresignedUploadResponse>('/api/storage/presigned-upload-url', {
      fileName, contentType, fileSizeBytes
    });
  }

  uploadBinaryDirect(uploadUrl: string, file: File, requiredHeaders?: Record<string, string>): Observable<any> {
    let headers = new HttpHeaders();
    if (requiredHeaders) {
      Object.keys(requiredHeaders).forEach(k => headers = headers.set(k, requiredHeaders[k]));
    }
    return this.http.put(uploadUrl, file, { headers });
  }
}`
  },
  {
    path: 'docker-compose.yml',
    category: 'DevOps & Docker',
    language: 'yaml',
    description: 'Root orchestration file for PostgreSQL, ASP.NET Core API (.NET 10), and Angular Frontend.',
    content: `version: '3.8'

services:
  postgres_db:
    image: postgres:16-alpine
    container_name: workflowhub_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: WorkflowSecret2026!
      POSTGRES_DB: workflowhub_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend_api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: workflowhub_api
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - ConnectionStrings__DefaultConnection=Host=postgres_db;Port=5432;Database=workflowhub_db;Username=postgres;Password=WorkflowSecret2026!
      - Storage__FallbackLocalPath=/app/LocalFiles
    ports:
      - "5000:5000"
    volumes:
      - local_storage_data:/app/LocalFiles
    depends_on:
      postgres_db:
        condition: service_healthy

  frontend_app:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: workflowhub_frontend
    ports:
      - "4200:80"
    depends_on:
      - backend_api

volumes:
  postgres_data:
  local_storage_data:`
  },
  {
    path: 'backend/Dockerfile',
    category: 'DevOps & Docker',
    language: 'dockerfile',
    description: 'Multi-stage Alpine Dockerfile for ASP.NET Core (.NET 10) with non-root execution and healthcheck.',
    content: `FROM mcr.microsoft.com/dotnet/sdk:10.0-preview-alpine AS build
WORKDIR /src
COPY WorkflowHub.Api.csproj ./
RUN dotnet restore WorkflowHub.Api.csproj
COPY . ./
RUN dotnet publish WorkflowHub.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache curl && mkdir -p /app/LocalFiles && chown -R 1000:1000 /app
USER 1000
COPY --from=build --chown=1000:1000 /app/publish .
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s CMD curl -f http://localhost:5000/api/health || exit 1
ENTRYPOINT ["dotnet", "WorkflowHub.Api.dll"]`
  },
  {
    path: 'frontend/Dockerfile',
    category: 'DevOps & Docker',
    language: 'dockerfile',
    description: 'Multi-stage Node 20 build + Nginx 1.27 production runtime for Angular Standalone app.',
    content: `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . ./
RUN npm run build -- --configuration production

FROM nginx:1.27-alpine AS runtime
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/workflowhub-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`
  },
  {
    path: '.github/workflows/ci.yml',
    category: 'DevOps & Docker',
    language: 'yaml',
    description: 'Automated GitHub Actions CI pipeline testing backend .NET 10, Angular 19, and Docker builds.',
    content: `name: WorkflowHub CI/CD Pipeline

on:
  push:
    branches: [ "main", "develop" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '10.0.x'
      - run: dotnet restore ./backend/WorkflowHub.Api.csproj
      - run: dotnet build ./backend/WorkflowHub.Api.csproj --no-restore --configuration Release
      - run: dotnet test ./backend/WorkflowHub.Api.csproj --no-build --configuration Release

  build-and-test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd ./frontend && npm ci && npm run build -- --configuration production`
  }
];
