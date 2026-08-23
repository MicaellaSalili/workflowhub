using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WorkflowHub.Api.Data;
using WorkflowHub.Api.DTOs;
using WorkflowHub.Api.Models;

namespace WorkflowHub.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Returns demo user profiles to easily toggle between Submitter and Reviewer roles in the UI.
    /// </summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(List<UserProfileResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAvailableUsers()
    {
        var users = await _context.Users
            .Include(u => u.SubmittedDocuments)
            .Include(u => u.Comments)
            .Select(u => new UserProfileResponse(
                u.Id,
                u.FullName,
                u.Email,
                u.Role,
                u.Department,
                u.SubmittedDocuments.Count,
                u.Comments.Count
            ))
            .ToListAsync();

        return Ok(users);
    }

    /// <summary>
    /// Simplified mock token generator for local/demo login
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower());
        if (user == null)
        {
            return Unauthorized(new { message = "Invalid email or credentials." });
        }

        var authResponse = new AuthResponse(
            Token: $"jwt-mock-token-for-{user.Id:N}",
            UserId: user.Id,
            FullName: user.FullName,
            Email: user.Email,
            Role: user.Role,
            Department: user.Department
        );

        return Ok(authResponse);
    }
}
