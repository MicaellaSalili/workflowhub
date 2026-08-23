namespace WorkflowHub.Api.Models;

public enum DocumentStatus
{
    Draft = 0,
    Submitted = 1,
    UnderReview = 2,
    ChangesRequested = 3,
    Approved = 4,
    Rejected = 5
}

public enum StorageProviderType
{
    AwsS3 = 0,
    LocalFilesystem = 1
}

public class Document
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    
    // File metadata
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileKey { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long FileSizeBytes { get; set; }
    public StorageProviderType StorageProvider { get; set; } = StorageProviderType.LocalFilesystem;
    
    // Workflow State
    public DocumentStatus Status { get; set; } = DocumentStatus.Submitted;
    public int VersionNumber { get; set; } = 1;
    
    // Audit & Relations
    public Guid SubmitterId { get; set; }
    public User? Submitter { get; set; }

    public Guid? AssignedReviewerId { get; set; }
    public User? AssignedReviewer { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }

    public ICollection<DocumentComment> Comments { get; set; } = new List<DocumentComment>();
    public ICollection<DocumentAuditLog> AuditLogs { get; set; } = new List<DocumentAuditLog>();
    public ICollection<DocumentVersion> VersionHistory { get; set; } = new List<DocumentVersion>();
}

public class DocumentVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }
    public int VersionNumber { get; set; }
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileKey { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public long FileSizeBytes { get; set; }
    public StorageProviderType StorageProvider { get; set; } = StorageProviderType.LocalFilesystem;
    public string Notes { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class DocumentAuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }
    public string Action { get; set; } = string.Empty;
    public string PerformedBy { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
