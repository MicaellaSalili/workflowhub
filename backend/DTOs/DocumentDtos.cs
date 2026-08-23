using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.DTOs;

public record DocumentCreateRequest(
    string Title,
    string Description,
    string Category,
    string OriginalFileName,
    string StoredFileKey,
    string ContentType,
    long FileSizeBytes,
    StorageProviderType StorageProvider
);

public record DocumentUpdateRequest(
    string Title,
    string Description,
    string Category
);

public record DocumentStatusChangeRequest(
    DocumentStatus NewStatus,
    string ReasonOrNote
);

public record DocumentReviseRequest(
    string OriginalFileName,
    string StoredFileKey,
    string ContentType,
    long FileSizeBytes,
    StorageProviderType StorageProvider,
    string? RevisionNotes
);

public record AddCommentRequest(
    string Content,
    bool IsInternalReviewerNote = false
);

public record DocumentResponse(
    Guid Id,
    string Title,
    string Description,
    string Category,
    string OriginalFileName,
    string StoredFileKey,
    string ContentType,
    long FileSizeBytes,
    StorageProviderType StorageProvider,
    DocumentStatus Status,
    int VersionNumber,
    Guid SubmitterId,
    string SubmitterName,
    Guid? AssignedReviewerId,
    string? AssignedReviewerName,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? ReviewedAt,
    List<DocumentVersionResponse> VersionHistory,
    List<CommentResponse> Comments,
    List<AuditLogResponse> AuditLogs
);

public record DocumentVersionResponse(
    Guid Id,
    int VersionNumber,
    string OriginalFileName,
    string StoredFileKey,
    string ContentType,
    long FileSizeBytes,
    StorageProviderType StorageProvider,
    string Notes,
    string AuthorName,
    DateTime CreatedAt
);

public record CommentResponse(
    Guid Id,
    Guid AuthorId,
    string AuthorName,
    UserRole AuthorRole,
    string Content,
    bool IsInternalReviewerNote,
    DateTime CreatedAt
);

public record AuditLogResponse(
    Guid Id,
    string Action,
    string PerformedBy,
    string Details,
    DateTime Timestamp
);

public record DashboardStatsResponse(
    int TotalDocuments,
    int PendingReview,
    int Approved,
    int Rejected,
    int ChangesRequested,
    long TotalStorageBytes,
    string ActiveStorageMode
);
