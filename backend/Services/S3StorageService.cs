using Amazon;
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
    private readonly ILogger<S3StorageService> _logger;
    private readonly IAmazonS3? _s3Client;

    public StorageProviderType ProviderType => StorageProviderType.AwsS3;
    public bool IsAvailable => _awsOptions.IsConfigured;

    public S3StorageService(
        IOptions<AwsOptions> awsOptions,
        IOptions<StorageOptions> storageOptions,
        ILogger<S3StorageService> logger)
    {
        _awsOptions = awsOptions.Value;
        _storageOptions = storageOptions.Value;
        _logger = logger;

        if (_awsOptions.IsConfigured)
        {
            try
            {
                var region = RegionEndpoint.GetBySystemName(_awsOptions.Region);
                _s3Client = new AmazonS3Client(_awsOptions.AccessKey, _awsOptions.SecretKey, region);
                _logger.LogInformation("AWS S3 Storage Client successfully initialized for bucket: {Bucket}", _awsOptions.BucketName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to initialize AWS S3 Client with provided credentials. Falling back to local storage.");
                _s3Client = null;
            }
        }
        else
        {
            _logger.LogInformation("AWS S3 is not configured in appsettings/environment. S3StorageService will report IsAvailable = false.");
        }
    }

    public Task<PresignedUploadResponse> GenerateUploadUrlAsync(PresignedUploadRequest request, string uniqueFileKey)
    {
        if (_s3Client == null || !IsAvailable)
        {
            throw new InvalidOperationException("AWS S3 is not configured. Request cannot be processed by S3StorageService.");
        }

        var expiration = DateTime.UtcNow.AddMinutes(_storageOptions.PresignedUrlExpirationMinutes);

        var presignedRequest = new GetPreSignedUrlRequest
        {
            BucketName = _awsOptions.BucketName,
            Key = uniqueFileKey,
            Verb = HttpVerb.PUT,
            Expires = expiration,
            ContentType = request.ContentType
        };

        // Enforce Server-Side Encryption (AES256) in enterprise metadata
        presignedRequest.Headers["x-amz-server-side-encryption"] = "AES256";

        var url = _s3Client.GetPreSignedURL(presignedRequest);

        var headers = new Dictionary<string, string>
        {
            { "Content-Type", request.ContentType },
            { "x-amz-server-side-encryption", "AES256" }
        };

        return Task.FromResult(new PresignedUploadResponse(
            UploadUrl: url,
            FileKey: uniqueFileKey,
            Provider: StorageProviderType.AwsS3,
            ExpiresInSeconds: _storageOptions.PresignedUrlExpirationMinutes * 60,
            RequiredHeaders: headers,
            Message: "Pre-signed URL generated successfully for direct-to-S3 upload."
        ));
    }

    public Task<DownloadUrlResponse> GenerateDownloadUrlAsync(string fileKey, string originalFileName, string contentType)
    {
        if (_s3Client == null || !IsAvailable)
        {
            throw new InvalidOperationException("AWS S3 is not configured.");
        }

        var expiration = DateTime.UtcNow.AddMinutes(_storageOptions.PresignedUrlExpirationMinutes);

        var presignedRequest = new GetPreSignedUrlRequest
        {
            BucketName = _awsOptions.BucketName,
            Key = fileKey,
            Verb = HttpVerb.GET,
            Expires = expiration,
            ResponseHeaderOverrides = new ResponseHeaderOverrides
            {
                ContentDisposition = $"attachment; filename=\"{originalFileName}\"",
                ContentType = contentType
            }
        };

        var url = _s3Client.GetPreSignedURL(presignedRequest);

        return Task.FromResult(new DownloadUrlResponse(
            DownloadUrl: url,
            FileName: originalFileName,
            ContentType: contentType,
            Provider: StorageProviderType.AwsS3,
            DirectFromCloud: true
        ));
    }

    public async Task<string> SaveFileStreamAsync(string fileKey, Stream fileStream, string contentType)
    {
        if (_s3Client == null || !IsAvailable)
        {
            throw new InvalidOperationException("AWS S3 is not configured.");
        }

        var putRequest = new PutObjectRequest
        {
            BucketName = _awsOptions.BucketName,
            Key = fileKey,
            InputStream = fileStream,
            ContentType = contentType,
            ServerSideEncryptionMethod = ServerSideEncryptionMethod.AES256
        };

        await _s3Client.PutObjectAsync(putRequest);
        return fileKey;
    }

    public async Task<(Stream Stream, string ContentType)?> GetFileStreamAsync(string fileKey)
    {
        if (_s3Client == null || !IsAvailable)
        {
            return null;
        }

        try
        {
            var getRequest = new GetObjectRequest
            {
                BucketName = _awsOptions.BucketName,
                Key = fileKey
            };

            var response = await _s3Client.GetObjectAsync(getRequest);
            return (response.ResponseStream, response.Headers.ContentType);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("File key {Key} was not found in S3 bucket {Bucket}", fileKey, _awsOptions.BucketName);
            return null;
        }
    }

    public async Task<bool> DeleteFileAsync(string fileKey)
    {
        if (_s3Client == null || !IsAvailable)
        {
            return false;
        }

        try
        {
            await _s3Client.DeleteObjectAsync(_awsOptions.BucketName, fileKey);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file key {Key} from S3", fileKey);
            return false;
        }
    }
}
