using Microsoft.AspNetCore.SignalR;
using WorkflowHub.Api.DTOs;

namespace WorkflowHub.Api.Hubs;

public interface IDocumentClient
{
    Task DocumentStatusChanged(DocumentResponse document, string note);
    Task NewDocumentSubmitted(DocumentResponse document);
    Task DocumentCommentAdded(Guid documentId, CommentResponse comment);
    Task DocumentAssigned(Guid documentId, string reviewerName);
    Task ActiveUsersUpdated(int count);
    Task NotificationReceived(string title, string message, string type);
    Task UserCreated(UserAdminResponse user);
    Task UserUpdated(UserAdminResponse user);
    Task UserDeleted(Guid userId);
    Task UserRoleChanged(Guid userId, string newRole, string updatedBy);
    Task SystemStatsUpdated(SystemStatsResponse stats);
    Task SystemBroadcastReceived(string title, string message, string level, string sender);
}

public class DocumentHub : Hub<IDocumentClient>
{
    private static int _activeConnections = 0;
    private readonly ILogger<DocumentHub> _logger;

    public DocumentHub(ILogger<DocumentHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        Interlocked.Increment(ref _activeConnections);
        _logger.LogInformation("Client connected: {ConnectionId}. Total active connections: {Count}", Context.ConnectionId, _activeConnections);
        
        await Clients.All.ActiveUsersUpdated(_activeConnections);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        Interlocked.Decrement(ref _activeConnections);
        _logger.LogInformation("Client disconnected: {ConnectionId}. Total active connections: {Count}", Context.ConnectionId, _activeConnections);
        
        await Clients.All.ActiveUsersUpdated(_activeConnections);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Joins a specific document's real-time discussion and update room.
    /// </summary>
    public async Task JoinDocumentRoom(string documentId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, $"doc_{documentId}");
        _logger.LogInformation("Connection {ConnectionId} joined room doc_{DocumentId}", Context.ConnectionId, documentId);
    }

    /// <summary>
    /// Leaves a document's real-time discussion room.
    /// </summary>
    public async Task LeaveDocumentRoom(string documentId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"doc_{documentId}");
        _logger.LogInformation("Connection {ConnectionId} left room doc_{DocumentId}", Context.ConnectionId, documentId);
    }

    /// <summary>
    /// Subscribes to reviewer-specific workflow notifications.
    /// </summary>
    public async Task JoinReviewerQueue()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, "role_reviewers");
    }
}
