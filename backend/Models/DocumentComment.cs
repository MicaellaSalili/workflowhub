namespace WorkflowHub.Api.Models;

public class DocumentComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }

    public Guid AuthorId { get; set; }
    public User? Author { get; set; }

    public string Content { get; set; } = string.Empty;
    public bool IsInternalReviewerNote { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class StorageOptions
{
    public string FallbackLocalPath { get; set; } = "LocalFiles";
    public int MaxFileSizeMb { get; set; } = 25;
    public string[] AllowedExtensions { get; set; } = new[] { ".pdf", ".docx", ".xlsx", ".png", ".jpg", ".zip" };
    public int PresignedUrlExpirationMinutes { get; set; } = 15;
}

public class AwsOptions
{
    public string BucketName { get; set; } = string.Empty;
    public string Region { get; set; } = "us-east-1";
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;

    public bool IsConfigured => 
        !string.IsNullOrWhiteSpace(BucketName) &&
        !string.IsNullOrWhiteSpace(AccessKey) &&
        !string.IsNullOrWhiteSpace(SecretKey);
}
