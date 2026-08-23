using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.DTOs;

public record PresignedUploadRequest(
    string FileName,
    string ContentType,
    long FileSizeBytes
);

public record PresignedUploadResponse(
    string UploadUrl,
    string FileKey,
    StorageProviderType Provider,
    int ExpiresInSeconds,
    Dictionary<string, string>? RequiredHeaders,
    string Message
);

public record StorageInfoResponse(
    string Provider,
    bool IsAwsS3Configured,
    string S3Bucket,
    string S3Region,
    string LocalFallbackPath,
    int MaxFileSizeMb,
    string[] AllowedExtensions
);

public record DownloadUrlResponse(
    string DownloadUrl,
    string FileName,
    string ContentType,
    StorageProviderType Provider,
    bool DirectFromCloud
);
