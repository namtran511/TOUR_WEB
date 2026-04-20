using System.Security.Claims;
using TravelSpotFinder.Api.Common;

namespace TravelSpotFinder.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    public static int GetRequiredUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("userId");
        if (!int.TryParse(value, out var userId))
        {
            throw new ApiException("Unauthorized", StatusCodes.Status401Unauthorized);
        }

        return userId;
    }

    public static int? TryGetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal.FindFirstValue("userId");
        return int.TryParse(value, out var userId) ? userId : null;
    }

    public static string? GetRole(this ClaimsPrincipal principal)
        => principal.FindFirstValue(ClaimTypes.Role) ?? principal.FindFirstValue("role");
}
