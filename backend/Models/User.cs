namespace WorkflowHub.Api.Models;

public enum UserRole
{
    Submitter = 0,
    Reviewer = 1,
    Admin = 2
}

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.Submitter;
    public string Department { get; set; } = "Engineering";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Document> SubmittedDocuments { get; set; } = new List<Document>();
    public ICollection<DocumentComment> Comments { get; set; } = new List<DocumentComment>();
}
