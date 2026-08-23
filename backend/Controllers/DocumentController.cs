using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using WorkflowHub.Api.Data;
using WorkflowHub.Api.DTOs;
using WorkflowHub.Api.Hubs;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DocumentController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IHubContext<DocumentHub, IDocumentClient> _hubContext;
    private readonly ILogger<DocumentController> _logger;

    public DocumentController(
        AppDbContext context,
        IHubContext<DocumentHub, IDocumentClient> hubContext,
        ILogger<DocumentController> logger)
    {
        _context = context;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Returns paginated/filtered list of documents with audit metadata and comment counts.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<DocumentResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDocuments(
        [FromQuery] DocumentStatus? status = null,
        [FromQuery] string? category = null,
        [FromQuery] string? search = null,
        [FromQuery] Guid? submitterId = null)
    {
        var query = _context.Documents
            .Include(d => d.Submitter)
            .Include(d => d.AssignedReviewer)
            .Include(d => d.Comments).ThenInclude(c => c.Author)
            .Include(d => d.AuditLogs)
            .Include(d => d.VersionHistory)
            .AsQueryable();

        if (status.HasValue)
        {
            query = query.Where(d => d.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(category) && category != "All")
        {
            query = query.Where(d => d.Category.ToLower() == category.ToLower());
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            query = query.Where(d => 
                d.Title.ToLower().Contains(searchLower) ||
                d.Description.ToLower().Contains(searchLower) ||
                d.OriginalFileName.ToLower().Contains(searchLower));
        }

        if (submitterId.HasValue)
        {
            query = query.Where(d => d.SubmitterId == submitterId.Value);
        }

        try
        {
            var entities = await query
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            var docs = entities.Select(MapToResponse).ToList();
            return Ok(docs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve documents list");
            return StatusCode(500, new { message = "An error occurred while retrieving documents.", error = ex.Message });
        }
    }

    /// <summary>
    /// Gets document summary metrics for the real-time analytics bar.
    /// </summary>
    [HttpGet("dashboard-stats")]
    [ProducesResponseType(typeof(DashboardStatsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDashboardStats()
    {
        var total = await _context.Documents.CountAsync();
        var pending = await _context.Documents.CountAsync(d => d.Status == DocumentStatus.Submitted || d.Status == DocumentStatus.UnderReview);
        var approved = await _context.Documents.CountAsync(d => d.Status == DocumentStatus.Approved);
        var rejected = await _context.Documents.CountAsync(d => d.Status == DocumentStatus.Rejected);
        var changesReq = await _context.Documents.CountAsync(d => d.Status == DocumentStatus.ChangesRequested);
        var totalBytes = await _context.Documents.SumAsync(d => d.FileSizeBytes);

        var stats = new DashboardStatsResponse(
            TotalDocuments: total,
            PendingReview: pending,
            Approved: approved,
            Rejected: rejected,
            ChangesRequested: changesReq,
            TotalStorageBytes: totalBytes,
            ActiveStorageMode: "Hybrid (S3 + LocalFiles Fallback)"
        );

        return Ok(stats);
    }

    /// <summary>
    /// Gets a single document by its GUID with full comment thread and audit logs.
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(DocumentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetDocumentById(Guid id)
    {
        var doc = await _context.Documents
            .Include(d => d.Submitter)
            .Include(d => d.AssignedReviewer)
            .Include(d => d.Comments).ThenInclude(c => c.Author)
            .Include(d => d.AuditLogs)
            .Include(d => d.VersionHistory)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (doc == null)
        {
            return NotFound(new { message = $"Document with ID '{id}' was not found." });
        }

        return Ok(MapToResponse(doc));
    }

    /// <summary>
    /// Registers a newly uploaded document and broadcasts a real-time SignalR alert to reviewers.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(DocumentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateDocument([FromBody] DocumentCreateRequest request, [FromHeader(Name = "X-User-Id")] Guid? headerUserId)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new { message = "Document title is required." });
        }

        // Resolve or default submitter
        var submitterId = headerUserId ?? Guid.Parse("11111111-1111-1111-1111-111111111111");
        var submitter = await _context.Users.FindAsync(submitterId);
        if (submitter == null)
        {
            submitter = await _context.Users.FirstAsync();
        }

        var document = new Document
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim() ?? string.Empty,
            Category = string.IsNullOrWhiteSpace(request.Category) ? "General" : request.Category,
            OriginalFileName = request.OriginalFileName,
            StoredFileKey = request.StoredFileKey,
            ContentType = request.ContentType,
            FileSizeBytes = request.FileSizeBytes,
            StorageProvider = request.StorageProvider,
            Status = DocumentStatus.Submitted,
            VersionNumber = 1,
            SubmitterId = submitter.Id,
            CreatedAt = DateTime.UtcNow
        };

        // Create initial v1 version history entry
        document.VersionHistory.Add(new DocumentVersion
        {
            VersionNumber = 1,
            OriginalFileName = request.OriginalFileName,
            StoredFileKey = request.StoredFileKey,
            ContentType = request.ContentType,
            FileSizeBytes = request.FileSizeBytes,
            StorageProvider = request.StorageProvider,
            Notes = "Initial submission",
            AuthorName = submitter.FullName,
            CreatedAt = DateTime.UtcNow
        });

        // Create initial submission audit log
        document.AuditLogs.Add(new DocumentAuditLog
        {
            Action = "Document Submitted",
            PerformedBy = submitter.FullName,
            Details = $"Uploaded '{request.OriginalFileName}' ({request.FileSizeBytes / 1024} KB) via {request.StorageProvider}.",
            Timestamp = DateTime.UtcNow
        });

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Reload with navigation properties for DTO mapping
        var created = await _context.Documents
            .Include(d => d.Submitter)
            .Include(d => d.Comments)
            .Include(d => d.AuditLogs)
            .Include(d => d.VersionHistory)
            .FirstAsync(d => d.Id == document.Id);

        var responseDto = MapToResponse(created);

        // Broadcast to all connected clients via SignalR WebSocket
        await _hubContext.Clients.All.NewDocumentSubmitted(responseDto);
        await _hubContext.Clients.Group("role_reviewers").NotificationReceived(
            "New Document Submitted", 
            $"'{document.Title}' by {submitter.FullName} is ready for review.", 
            "info"
        );

        _logger.LogInformation("Document {DocId} ('{Title}') submitted by {Submitter}. Real-time broadcast sent.", 
            document.Id, document.Title, submitter.FullName);

        return CreatedAtAction(nameof(GetDocumentById), new { id = document.Id }, responseDto);
    }

    /// <summary>
    /// Updates workflow state (e.g. Under Review, Approved, Changes Requested, Rejected) and notifies submitter.
    /// </summary>
    [HttpPost("{id:guid}/status")]
    [ProducesResponseType(typeof(DocumentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(
        Guid id, 
        [FromBody] DocumentStatusChangeRequest request,
        [FromHeader(Name = "X-User-Id")] string? reviewerUserIdHeader)
    {
        try
        {
            var document = await _context.Documents
                .Include(d => d.Submitter)
                .Include(d => d.AssignedReviewer)
                .Include(d => d.Comments).ThenInclude(c => c.Author)
                .Include(d => d.AuditLogs)
                .Include(d => d.VersionHistory)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (document == null)
            {
                return NotFound(new { message = $"Document with ID '{id}' was not found." });
            }

            // Robust reviewer resolution
            User? reviewer = null;
            if (!string.IsNullOrWhiteSpace(reviewerUserIdHeader) && Guid.TryParse(reviewerUserIdHeader, out var parsedReviewerId))
            {
                reviewer = await _context.Users.FindAsync(parsedReviewerId);
            }

            if (reviewer == null)
            {
                var defaultReviewerId = Guid.Parse("22222222-2222-2222-2222-222222222222");
                reviewer = await _context.Users.FindAsync(defaultReviewerId)
                    ?? await _context.Users.FirstOrDefaultAsync(u => u.Role == UserRole.Reviewer)
                    ?? await _context.Users.FirstOrDefaultAsync();
            }

            if (reviewer == null)
            {
                return BadRequest(new { message = "No valid reviewer user found in the system." });
            }

            var previousStatus = document.Status;
            document.Status = request.NewStatus;
            document.UpdatedAt = DateTime.UtcNow;
            document.AssignedReviewerId = reviewer.Id;

            if (request.NewStatus == DocumentStatus.Approved || request.NewStatus == DocumentStatus.Rejected)
            {
                document.ReviewedAt = DateTime.UtcNow;
            }

            // Add audit trail entry
            var auditEntry = new DocumentAuditLog
            {
                DocumentId = document.Id,
                Action = $"Status Changed: {previousStatus} -> {request.NewStatus}",
                PerformedBy = reviewer.FullName,
                Details = string.IsNullOrWhiteSpace(request.ReasonOrNote) 
                    ? $"Status transitioned to {request.NewStatus}." 
                    : $"Reviewer Note: {request.ReasonOrNote}",
                Timestamp = DateTime.UtcNow
            };
            _context.DocumentAuditLogs.Add(auditEntry);

            // If a reason was provided with the status change, also append a comment
            if (!string.IsNullOrWhiteSpace(request.ReasonOrNote))
            {
                var newComment = new DocumentComment
                {
                    DocumentId = document.Id,
                    AuthorId = reviewer.Id,
                    Content = $"[Status update to {request.NewStatus}] {request.ReasonOrNote}",
                    CreatedAt = DateTime.UtcNow,
                    IsInternalReviewerNote = false
                };
                _context.DocumentComments.Add(newComment);
            }

            await _context.SaveChangesAsync();

            var updatedResponse = MapToResponse(document);

            // Real-time Push via SignalR to document room and global dashboard
            try
            {
                var reasonNote = request.ReasonOrNote ?? string.Empty;
                await _hubContext.Clients.All.DocumentStatusChanged(updatedResponse, reasonNote);
                await _hubContext.Clients.Group($"doc_{id}").DocumentStatusChanged(updatedResponse, reasonNote);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SignalR broadcast failed for document status update");
            }

            _logger.LogInformation("Document {DocId} status changed from {Old} to {New} by {Reviewer}", 
                id, previousStatus, request.NewStatus, reviewer.FullName);

            return Ok(updatedResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update status for document {DocumentId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the document status.", error = ex.Message });
        }
    }

    /// <summary>
    /// Re-uploads and submits a revised version of a document when ChangesRequested.
    /// Increments the version number and resets status to Submitted.
    /// </summary>
    [HttpPost("{id:guid}/revise")]
    [ProducesResponseType(typeof(DocumentResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ReviseDocument(
        Guid id,
        [FromBody] DocumentReviseRequest request,
        [FromHeader(Name = "X-User-Id")] string? submitterUserIdHeader)
    {
        try
        {
            var document = await _context.Documents
                .Include(d => d.Submitter)
                .Include(d => d.AssignedReviewer)
                .Include(d => d.Comments).ThenInclude(c => c.Author)
                .Include(d => d.AuditLogs)
                .Include(d => d.VersionHistory)
                .FirstOrDefaultAsync(d => d.Id == id);

            if (document == null)
            {
                return NotFound(new { message = $"Document with ID '{id}' was not found." });
            }

            User? submitter = null;
            if (!string.IsNullOrWhiteSpace(submitterUserIdHeader) && Guid.TryParse(submitterUserIdHeader, out var parsedSubmitterId))
            {
                submitter = await _context.Users.FindAsync(parsedSubmitterId);
            }

            if (submitter == null)
            {
                submitter = document.Submitter ?? await _context.Users.FirstOrDefaultAsync();
            }

            var previousVersion = document.VersionNumber;
            document.VersionNumber += 1;
            document.OriginalFileName = request.OriginalFileName;
            document.StoredFileKey = request.StoredFileKey;
            document.ContentType = request.ContentType;
            document.FileSizeBytes = request.FileSizeBytes;
            document.StorageProvider = request.StorageProvider;
            document.Status = DocumentStatus.Submitted;
            document.UpdatedAt = DateTime.UtcNow;

            // Add new version entry to version history
            document.VersionHistory.Add(new DocumentVersion
            {
                VersionNumber = document.VersionNumber,
                OriginalFileName = request.OriginalFileName,
                StoredFileKey = request.StoredFileKey,
                ContentType = request.ContentType,
                FileSizeBytes = request.FileSizeBytes,
                StorageProvider = request.StorageProvider,
                Notes = string.IsNullOrWhiteSpace(request.RevisionNotes) ? $"Revision to v{document.VersionNumber}" : request.RevisionNotes,
                AuthorName = submitter?.FullName ?? "Submitter",
                CreatedAt = DateTime.UtcNow
            });

            var auditEntry = new DocumentAuditLog
            {
                DocumentId = document.Id,
                Action = $"Revised: v{previousVersion} -> v{document.VersionNumber}",
                PerformedBy = submitter?.FullName ?? "Submitter",
                Details = string.IsNullOrWhiteSpace(request.RevisionNotes)
                    ? $"Re-uploaded revised file '{request.OriginalFileName}' ({request.FileSizeBytes / 1024} KB)."
                    : $"Re-uploaded '{request.OriginalFileName}'. Note: {request.RevisionNotes}",
                Timestamp = DateTime.UtcNow
            };
            _context.DocumentAuditLogs.Add(auditEntry);

            if (!string.IsNullOrWhiteSpace(request.RevisionNotes) && submitter != null)
            {
                var newComment = new DocumentComment
                {
                    DocumentId = document.Id,
                    AuthorId = submitter.Id,
                    Content = $"[Revision v{document.VersionNumber} Submitted] {request.RevisionNotes}",
                    CreatedAt = DateTime.UtcNow,
                    IsInternalReviewerNote = false
                };
                _context.DocumentComments.Add(newComment);
            }

            await _context.SaveChangesAsync();

            var updatedResponse = MapToResponse(document);

            try
            {
                var noteText = $"Revised to v{document.VersionNumber}. Ready for review.";
                await _hubContext.Clients.All.DocumentStatusChanged(updatedResponse, noteText);
                await _hubContext.Clients.Group($"doc_{id}").DocumentStatusChanged(updatedResponse, noteText);
                await _hubContext.Clients.Group("role_reviewers").NotificationReceived(
                    "Document Revised",
                    $"'{document.Title}' (v{document.VersionNumber}) was re-uploaded and is ready for review.",
                    "info"
                );
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SignalR broadcast failed for document revision");
            }

            _logger.LogInformation("Document {DocId} revised to v{Version} by {Submitter}", 
                id, document.VersionNumber, submitter?.FullName);

            return Ok(updatedResponse);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to revise document {DocumentId}", id);
            return StatusCode(500, new { message = "An error occurred while revising the document.", error = ex.Message });
        }
    }

    /// <summary>
    /// Adds a real-time review comment to the document thread.
    /// </summary>
    [HttpPost("{id:guid}/comments")]
    [ProducesResponseType(typeof(CommentResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddComment(
        Guid id, 
        [FromBody] AddCommentRequest request,
        [FromHeader(Name = "X-User-Id")] string? authorUserIdHeader)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(new { message = "Comment content cannot be empty." });
            }

            var document = await _context.Documents.FindAsync(id);
            if (document == null)
            {
                return NotFound(new { message = $"Document with ID '{id}' was not found." });
            }

            User? author = null;
            if (!string.IsNullOrWhiteSpace(authorUserIdHeader) && Guid.TryParse(authorUserIdHeader, out var parsedAuthorId))
            {
                author = await _context.Users.FindAsync(parsedAuthorId);
            }

            if (author == null)
            {
                var defaultAuthorId = Guid.Parse("22222222-2222-2222-2222-222222222222");
                author = await _context.Users.FindAsync(defaultAuthorId) ?? await _context.Users.FirstOrDefaultAsync();
            }

            if (author == null)
            {
                return BadRequest(new { message = "No valid author user found." });
            }

            var comment = new DocumentComment
            {
                DocumentId = id,
                AuthorId = author.Id,
                Content = request.Content.Trim(),
                IsInternalReviewerNote = request.IsInternalReviewerNote,
                CreatedAt = DateTime.UtcNow
            };

            _context.DocumentComments.Add(comment);
            await _context.SaveChangesAsync();

            var commentDto = new CommentResponse(
                Id: comment.Id,
                AuthorId: author.Id,
                AuthorName: author.FullName,
                AuthorRole: author.Role,
                Content: comment.Content,
                IsInternalReviewerNote: comment.IsInternalReviewerNote,
                CreatedAt: comment.CreatedAt
            );

            // Real-time broadcast to all viewers in document discussion room
            try
            {
                await _hubContext.Clients.Group($"doc_{id}").DocumentCommentAdded(id, commentDto);
                await _hubContext.Clients.All.DocumentCommentAdded(id, commentDto);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SignalR broadcast failed for new comment");
            }

            return CreatedAtAction(nameof(GetDocumentById), new { id }, commentDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add comment to document {DocumentId}", id);
            return StatusCode(500, new { message = "An error occurred while posting comment.", error = ex.Message });
        }
    }

    private static DocumentResponse MapToResponse(Document d)
    {
        return new DocumentResponse(
            Id: d.Id,
            Title: d.Title,
            Description: d.Description,
            Category: d.Category,
            OriginalFileName: d.OriginalFileName,
            StoredFileKey: d.StoredFileKey,
            ContentType: d.ContentType,
            FileSizeBytes: d.FileSizeBytes,
            StorageProvider: d.StorageProvider,
            Status: d.Status,
            VersionNumber: d.VersionNumber,
            SubmitterId: d.SubmitterId,
            SubmitterName: d.Submitter?.FullName ?? "Unknown Submitter",
            AssignedReviewerId: d.AssignedReviewerId,
            AssignedReviewerName: d.AssignedReviewer?.FullName,
            CreatedAt: d.CreatedAt,
            UpdatedAt: d.UpdatedAt,
            ReviewedAt: d.ReviewedAt,
            VersionHistory: (d.VersionHistory ?? new List<DocumentVersion>())
                .OrderByDescending(v => v.VersionNumber)
                .Select(v => new DocumentVersionResponse(
                    v.Id,
                    v.VersionNumber,
                    v.OriginalFileName,
                    v.StoredFileKey,
                    v.ContentType,
                    v.FileSizeBytes,
                    v.StorageProvider,
                    v.Notes,
                    v.AuthorName,
                    v.CreatedAt))
                .ToList(),
            Comments: (d.Comments ?? new List<DocumentComment>())
                .OrderBy(c => c.CreatedAt)
                .Select(c => new CommentResponse(
                    c.Id, 
                    c.AuthorId, 
                    c.Author?.FullName ?? "User", 
                    c.Author?.Role ?? UserRole.Submitter, 
                    c.Content, 
                    c.IsInternalReviewerNote, 
                    c.CreatedAt))
                .ToList(),
            AuditLogs: (d.AuditLogs ?? new List<DocumentAuditLog>())
                .OrderByDescending(a => a.Timestamp)
                .Select(a => new AuditLogResponse(
                    a.Id,
                    a.Action,
                    a.PerformedBy,
                    a.Details,
                    a.Timestamp))
                .ToList()
        );
    }
}
