using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Data;
using TravelSpotFinder.Api.Dtos.Auth;

namespace TravelSpotFinder.Api.Services;

public sealed class AuthService
{
    private readonly TravelSpotDbContext _db;
    private readonly JwtTokenService _tokenService;

    public AuthService(TravelSpotDbContext db, JwtTokenService tokenService)
    {
        _db = db;
        _tokenService = tokenService;
    }

    public async Task<object> RegisterAsync(register_request request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.email.Trim().ToLowerInvariant();

        var existingUser = await _db.users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.email == normalizedEmail, cancellationToken);

        if (existingUser is not null)
        {
            throw new ApiException("Email already exists", StatusCodes.Status409Conflict);
        }

        var user = new Data.Entities.User
        {
            full_name = request.full_name.Trim(),
            email = normalizedEmail,
            password_hash = BCrypt.Net.BCrypt.HashPassword(request.password, workFactor: 10),
            avatar_url = string.IsNullOrWhiteSpace(request.avatar_url) ? null : request.avatar_url.Trim()
        };

        _db.users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);

        return new
        {
            user = ResponseMapper.MapUser(user),
            token = _tokenService.GenerateToken(user)
        };
    }

    public async Task<object> LoginAsync(login_request request, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = request.email.Trim().ToLowerInvariant();

        var user = await _db.users
            .FirstOrDefaultAsync(item => item.email == normalizedEmail, cancellationToken);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.password, user.password_hash))
        {
            throw new ApiException("Invalid email or password", StatusCodes.Status401Unauthorized);
        }

        return new
        {
            user = ResponseMapper.MapUser(user),
            token = _tokenService.GenerateToken(user)
        };
    }

    public async Task<object> GetMeAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await _db.users
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.id == userId, cancellationToken);

        if (user is null)
        {
            throw new ApiException("User not found", StatusCodes.Status404NotFound);
        }

        return ResponseMapper.MapUser(user);
    }
}
