using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using TravelSpotFinder.Api.Configuration;
using TravelSpotFinder.Api.Data.Entities;

namespace TravelSpotFinder.Api.Services;

public sealed class JwtTokenService
{
    private readonly ApplicationSettings _settings;

    public JwtTokenService(ApplicationSettings settings)
    {
        _settings = settings;
    }

    public string GenerateToken(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.id.ToString()),
            new(ClaimTypes.Role, user.role.ToString()),
            new("userId", user.id.ToString()),
            new("role", user.role.ToString())
        };

        var credentials = new SigningCredentials(JwtKeyFactory.Create(_settings.jwt_secret), SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
