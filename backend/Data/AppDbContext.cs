using Microsoft.EntityFrameworkCore;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentComment> DocumentComments => Set<DocumentComment>();
    public DbSet<DocumentAuditLog> DocumentAuditLogs => Set<DocumentAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User Configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
            entity.Property(u => u.FullName).IsRequired().HasMaxLength(120);
            entity.Property(u => u.Role).HasConversion<string>();
        });

        // Document Configuration
        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(d => d.Id);
            entity.Property(d => d.Title).IsRequired().HasMaxLength(200);
            entity.Property(d => d.Description).HasMaxLength(1000);
            entity.Property(d => d.OriginalFileName).IsRequired().HasMaxLength(255);
            entity.Property(d => d.StoredFileKey).IsRequired().HasMaxLength(300);
            entity.Property(d => d.Status).HasConversion<string>();
            entity.Property(d => d.StorageProvider).HasConversion<string>();

            // Relationships
            entity.HasOne(d => d.Submitter)
                .WithMany(u => u.SubmittedDocuments)
                .HasForeignKey(d => d.SubmitterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.AssignedReviewer)
                .WithMany()
                .HasForeignKey(d => d.AssignedReviewerId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Document Comment Configuration
        modelBuilder.Entity<DocumentComment>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.Content).IsRequired().HasMaxLength(2000);

            entity.HasOne(c => c.Document)
                .WithMany(d => d.Comments)
                .HasForeignKey(c => c.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(c => c.Author)
                .WithMany(u => u.Comments)
                .HasForeignKey(c => c.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Document Audit Log Configuration
        modelBuilder.Entity<DocumentAuditLog>(entity =>
        {
            entity.HasKey(a => a.Id);
            entity.Property(a => a.Action).IsRequired().HasMaxLength(100);
            entity.Property(a => a.PerformedBy).IsRequired().HasMaxLength(120);
            
            entity.HasOne(a => a.Document)
                .WithMany(d => d.AuditLogs)
                .HasForeignKey(a => a.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Seed initial demo users for immediate testing
        SeedInitialUsers(modelBuilder);
    }

    private static void SeedInitialUsers(ModelBuilder modelBuilder)
    {
        var submitterId = Guid.Parse("11111111-1111-1111-1111-111111111111");
        var reviewerId = Guid.Parse("22222222-2222-2222-2222-222222222222");
        var adminId = Guid.Parse("33333333-3333-3333-3333-333333333333");

        // Simple hashed dummy password for demo seeds ("Password123!")
        var passwordHash = "$2a$11$e87.89nN08N8eKz1d1m1XeE9.uY6G9Mps6mS0LzRkmE4iQe2i6u62";

        modelBuilder.Entity<User>().HasData(
            new User
            {
                Id = submitterId,
                Email = "sarah.submitter@workflowhub.dev",
                FullName = "Sarah Jenkins (Senior Eng)",
                PasswordHash = passwordHash,
                Role = UserRole.Submitter,
                Department = "Product Engineering",
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = reviewerId,
                Email = "alex.reviewer@workflowhub.dev",
                FullName = "Alex Rivera (Lead Architect)",
                PasswordHash = passwordHash,
                Role = UserRole.Reviewer,
                Department = "Architecture & Security",
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                Id = adminId,
                Email = "admin@workflowhub.dev",
                FullName = "System Admin",
                PasswordHash = passwordHash,
                Role = UserRole.Admin,
                Department = "DevOps",
                CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
