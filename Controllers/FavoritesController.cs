using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Extensions;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[Authorize]
[Route("api/favorites")]
public sealed class FavoritesController : ApiControllerBase
{
    private readonly FavoriteService _favoriteService;

    public FavoritesController(FavoriteService favoriteService)
    {
        _favoriteService = favoriteService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? page, [FromQuery] int? limit, CancellationToken cancellationToken)
        => Success("Get favorites successful", await _favoriteService.ListAsync(User.GetRequiredUserId(), page, limit, cancellationToken));

    [HttpPost("{spotId:int}")]
    public async Task<IActionResult> Add(int spotId, CancellationToken cancellationToken)
        => Success("Add favorite successful", await _favoriteService.AddAsync(User.GetRequiredUserId(), spotId, cancellationToken), StatusCodes.Status201Created);

    [HttpDelete("{spotId:int}")]
    public async Task<IActionResult> Remove(int spotId, CancellationToken cancellationToken)
    {
        await _favoriteService.RemoveAsync(User.GetRequiredUserId(), spotId, cancellationToken);
        return Success("Remove favorite successful");
    }
}
