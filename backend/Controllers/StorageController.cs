using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    /// Returns the active storage provider diagnostics, whether AWS S3 is configured, and limits.
    /// Used for frontend environment awareness and interview demonstrations.
    /// </summary>
    [HttpGet("info")]
    [ProducesResponseType(typeof(StorageInfoResponse), StatusCodes.Status200OK)]
    public IActionResult GetStorageInfo()
    {
        var response = new StorageInfoResponse(
            Provider: _storageService.ProviderType.ToString(),
            IsAwsS3Configured: _awsOptions.IsConfigured,
            S3Bucket: _awsOptions.IsConfigured ? _awsOptions.BucketName : "N/A (Local Fallback Active)",
            S3Region: _awsOptions.IsConfigured ? _awsOptions.Region : "N/A",
            LocalFallbackPath: _storageOptions.FallbackLocalPath,
            MaxFileSizeMb: _storageOptions.MaxFileSizeMb,
            AllowedExtensions: _storageOptions.AllowedExtensions
        );

        return Ok(response);
    }

    /// <summary>
    /// Generates a time-limited Pre-Signed Upload URL for S3 or a direct endpoint for LocalFiles fallback.
    /// This bypasses the API for S3 uploads, eliminating server bandwidth bottlenecks.
    /// </summary>
    [HttpPost("presigned-upload-url")]
    [ProducesResponseType(typeof(PresignedUploadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GeneratePresignedUploadUrl([FromBody] PresignedUploadRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FileName))
        {
            return BadRequest(new { message = "FileName is required." });
        }

        // Validate file extension
        var ext = Path.GetExtension(request.FileName).ToLowerInvariant();
        if (!_storageOptions.AllowedExtensions.Contains(ext))
        {
            return BadRequest(new { 
                message = $"File extension '{ext}' is not supported. Allowed extensions: {string.Join(", ", _storageOptions.AllowedExtensions)}" 
            });
        }

        // Validate size against max limit
        var maxBytes = (long)_storageOptions.MaxFileSizeMb * 1024 * 1024;
        if (request.FileSizeBytes > maxBytes)
        {
            return BadRequest(new { 
                message = $"File size ({request.FileSizeBytes / 1024 / 1024}MB) exceeds maximum permitted limit of {_storageOptions.MaxFileSizeMb}MB." 
            });
        }

        // Generate enterprise deterministic yet unique storage key: documents/{yyyy/MM}/{guid}_{sanitizedFileName}
        var datePrefix = DateTime.UtcNow.ToString("yyyy/MM");
        var sanitizedName = Path.GetFileNameWithoutExtension(request.FileName)
            .Replace(" ", "_")
            .Replace("-", "_");
        var uniqueKey = $"documents/{datePrefix}/{Guid.NewGuid():N}_{sanitizedName}{ext}";

        var result = await _storageService.GenerateUploadUrlAsync(request, uniqueKey);
        
        _logger.LogInformation("Generated upload target for file '{FileName}' via provider {Provider}", 
            request.FileName, result.Provider);

        return Ok(result);
    }

    /// <summary>
    /// Generates download link for document - returns S3 pre-signed GET URL or local streaming download route.
    /// </summary>
    [HttpGet("download-url")]
    [ProducesResponseType(typeof(DownloadUrlResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GenerateDownloadUrl(
        [FromQuery] string fileKey, 
        [FromQuery] string originalFileName, 
        [FromQuery] string contentType = "application/octet-stream")
    {
        if (string.IsNullOrWhiteSpace(fileKey))
        {
            return BadRequest(new { message = "fileKey is required." });
        }

        var result = await _storageService.GenerateDownloadUrlAsync(fileKey, originalFileName, contentType);
        return Ok(result);
    }

    /// <summary>
    /// Local Filesystem fallback upload handler. Invoked when AWS credentials are absent.
    /// Streams raw binary payload directly to local disk without buffering into RAM.
    /// </summary>
    [HttpPut("local-upload/{*fileKey}")]
    [DisableRequestSizeLimit]
    public async Task<IActionResult> HandleLocalUpload([FromRoute] string fileKey)
    {
        if (string.IsNullOrWhiteSpace(fileKey))
        {
            return BadRequest(new { message = "Invalid file key target." });
        }

        if (Request.Body == null || !Request.Body.CanRead)
        {
            return BadRequest(new { message = "Request body stream is empty." });
        }

        var contentType = Request.ContentType ?? "application/octet-stream";
        var savedKey = await _storageService.SaveFileStreamAsync(fileKey, Request.Body, contentType);

        _logger.LogInformation("Local filesystem fallback received and persisted file key: {Key}", savedKey);

        return Ok(new { 
            message = "File uploaded to local fallback storage successfully.", 
            fileKey = savedKey 
        });
    }

    /// <summary>
    /// Streams file directly from the LocalFiles storage directory.
    /// </summary>
    [HttpGet("local-download/{*fileKey}")]
    public async Task<IActionResult> HandleLocalDownload([FromRoute] string fileKey, [FromQuery] string? fileName)
    {
        var fileData = await _storageService.GetFileStreamAsync(fileKey);
        if (fileData == null)
        {
            return NotFound(new { message = "File not found on local storage." });
        }

        var downloadName = !string.IsNullOrWhiteSpace(fileName) ? fileName : Path.GetFileName(fileKey);
        return File(fileData.Value.Stream, fileData.Value.ContentType, downloadName);
    }
}
