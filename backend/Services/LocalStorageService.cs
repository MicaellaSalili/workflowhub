using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using WorkflowHub.Api.DTOs;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Services;

public class LocalStorageService : IStorageService
{
    private readonly StorageOptions _storageOptions;
    private readonly ILogger<LocalStorageService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly string _storageRootPath;

    public StorageProviderType ProviderType => StorageProviderType.LocalFilesystem;
    public bool IsAvailable => true; // Local storage is always resiliently available

    public LocalStorageService(
        IOptions<StorageOptions> storageOptions,
        IHttpContextAccessor httpContextAccessor,
        IWebHostEnvironment environment,
        ILogger<LocalStorageService> logger)
    {
        _storageOptions = storageOptions.Value;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;

        // Resolve absolute directory for LocalFiles
        _storageRootPath = Path.IsPathRooted(_storageOptions.FallbackLocalPath)
            ? _storageOptions.FallbackLocalPath
            : Path.Combine(environment.ContentRootPath, _storageOptions.FallbackLocalPath);

        if (!Directory.Exists(_storageRootPath))
        {
            Directory.CreateDirectory(_storageRootPath);
            _logger.LogInformation("Created Local Storage Fallback directory at: {Path}", _storageRootPath);
        }
    }

    public Task<PresignedUploadResponse> GenerateUploadUrlAsync(PresignedUploadRequest request, string uniqueFileKey)
    {
        // In Local Fallback mode, generate relative endpoint so it routes seamlessly via current origin / reverse proxy
        var localUploadEndpoint = $"/api/storage/local-upload/{Uri.EscapeDataString(uniqueFileKey)}";

        return Task.FromResult(new PresignedUploadResponse(
            UploadUrl: localUploadEndpoint,
            FileKey: uniqueFileKey,
            Provider: StorageProviderType.LocalFilesystem,
            ExpiresInSeconds: _storageOptions.PresignedUrlExpirationMinutes * 60,
            RequiredHeaders: new Dictionary<string, string>
            {
                { "Content-Type", request.ContentType }
            },
            Message: "Local Filesystem Fallback active (AWS S3 not configured). Direct streaming to local disk enabled."
        ));
    }

    public Task<DownloadUrlResponse> GenerateDownloadUrlAsync(string fileKey, string originalFileName, string contentType)
    {
        var downloadUrl = $"/api/storage/local-download/{Uri.EscapeDataString(fileKey)}?fileName={Uri.EscapeDataString(originalFileName)}";

        return Task.FromResult(new DownloadUrlResponse(
            DownloadUrl: downloadUrl,
            FileName: originalFileName,
            ContentType: contentType,
            Provider: StorageProviderType.LocalFilesystem,
            DirectFromCloud: false
        ));
    }

    public async Task<string> SaveFileStreamAsync(string fileKey, Stream fileStream, string contentType)
    {
        var sanitizedKey = Path.GetFileName(fileKey);
        var targetFilePath = Path.Combine(_storageRootPath, sanitizedKey);

        await using var destination = new FileStream(targetFilePath, FileMode.Create, FileAccess.Write, FileShare.None);
        await fileStream.CopyToAsync(destination);

        _logger.LogInformation("Successfully saved file locally to disk: {Path}", targetFilePath);
        return sanitizedKey;
    }

    public Task<(Stream Stream, string ContentType)?> GetFileStreamAsync(string fileKey)
    {
        var sanitizedKey = Path.GetFileName(fileKey);
        var targetFilePath = Path.Combine(_storageRootPath, sanitizedKey);

        if (!File.Exists(targetFilePath))
        {
            _logger.LogWarning("Local fallback file not found on disk: {Path}", targetFilePath);
            return Task.FromResult<(Stream Stream, string ContentType)?>(null);
        }

        Stream stream = new FileStream(targetFilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<(Stream Stream, string ContentType)?>((stream, "application/octet-stream"));
    }

    public Task<bool> DeleteFileAsync(string fileKey)
    {
        var sanitizedKey = Path.GetFileName(fileKey);
        var targetFilePath = Path.Combine(_storageRootPath, sanitizedKey);

        if (File.Exists(targetFilePath))
        {
            File.Delete(targetFilePath);
            _logger.LogInformation("Deleted file from local storage: {Path}", targetFilePath);
            return Task.FromResult(true);
        }

        return Task.FromResult(false);
    }
}
