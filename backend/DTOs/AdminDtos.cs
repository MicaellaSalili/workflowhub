using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.DTOs;

public record CreateUserRequest(
    string Email,
    string FullName,
    UserRole Role,
    string Department,
    string Password,
    long StorageQuotaMb = 1024
);

public record UpdateUserRequest(
    string FullName,
    string Department,
    UserRole Role,
    string Status,
    long StorageQuotaMb
);

public record AssignRoleRequest(
    UserRole NewRole,
    string? Reason
);

public record UserAdminResponse(
    Guid Id,
    string Email,
    string FullName,
    UserRole Role,
    string Department,
    string Status,
    DateTime CreatedAt,
    DateTime? LastActiveAt,
    int DocumentsCount,
    long StorageQuotaMb
);

public record SystemStatsResponse(
    int TotalUsers,
    int ActiveWsConnections,
    int TotalDocuments,
    long S3StorageBytes,
    long LocalStorageBytes,
    double CpuUsagePercent,
    double MemoryUsageMb,
    long UptimeSeconds,
    double ApiRequestsPerSec,
    double AvgLatencyMs,
    int PendingReviews,
    int ApprovedCount
);

public record SystemLogResponse(
    string Id,
    string Level,
    string Source,
    string Message,
    string? Details,
    DateTime Timestamp,
    string? IpAddress,
    string? Actor
);

public record BroadcastMessageRequest(
    string Title,
    string Message,
    string Level = "info"
);

public record SyncStorageResponse(
    int OrphanedFilesPruned,
    int SynchronizedEntries,
    long ReclaimedBytes,
    string Status,
    DateTime CompletedAt
);
