using WorkflowHub.Api.DTOs;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Services;

public interface IStorageService
{
    StorageProviderType ProviderType { get; }
    bool IsAvailable { get; }
    
    /// <summary>
    /// Generates a direct pre-signed upload URL for S3 or a local fallback upload route.
    /// </summary>
    Task<PresignedUploadResponse> GenerateUploadUrlAsync(PresignedUploadRequest request, string uniqueFileKey);

    /// <summary>
    /// Generates a pre-signed download URL or local download route.
    /// </summary>
    Task<DownloadUrlResponse> GenerateDownloadUrlAsync(string fileKey, string originalFileName, string contentType);

    /// <summary>
    /// Handles physical file upload stream directly (used primarily for LocalFiles fallback).
    /// </summary>
    Task<string> SaveFileStreamAsync(string fileKey, Stream fileStream, string contentType);

    /// <summary>
    /// Retrieves file stream (for LocalFiles download proxy or verification).
    /// </summary>
    Task<(Stream Stream, string ContentType)?> GetFileStreamAsync(string fileKey);

    /// <summary>
    /// Deletes the file asset from the underlying storage.
    /// </summary>
    Task<bool> DeleteFileAsync(string fileKey);
}
