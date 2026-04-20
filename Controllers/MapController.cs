using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Dtos.Map;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[AllowAnonymous]
[Route("api/map")]
public sealed class MapController : ApiControllerBase
{
    private readonly MapService _mapService;

    public MapController(MapService mapService)
    {
        _mapService = mapService;
    }

    [HttpGet("directions")]
    public async Task<IActionResult> Directions([FromQuery] directions_query query, CancellationToken cancellationToken)
        => Success("Get directions successful", await _mapService.GetDirectionsAsync(query, cancellationToken));
}
