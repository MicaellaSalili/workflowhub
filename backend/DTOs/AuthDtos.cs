using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.DTOs;

public record LoginRequest(
    string Email,
    string Password
);

public record AuthResponse(
    string Token,
    Guid UserId,
    string FullName,
    string Email,
    UserRole Role,
    string Department
);

public record UserProfileResponse(
    Guid Id,
    string FullName,
    string Email,
    UserRole Role,
    string Department,
    int SubmittedCount,
    int ReviewedCount
);
