using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Dtos.Spot;
using TravelSpotFinder.Api.Extensions;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[Route("api/spots")]
public sealed class SpotsController : ApiControllerBase
{
    private readonly SpotService _spotService;

    public SpotsController(SpotService spotService)
    {
        _spotService = spotService;
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? page, [FromQuery] int? limit, [FromQuery] string? sort_by, [FromQuery] string? sort_order, CancellationToken cancellationToken)
        => Success("Get spots successful", await _spotService.ListAsync(page, limit, sort_by, sort_order, cancellationToken));

    [AllowAnonymous]
    [HttpGet("nearby")]
    public async Task<IActionResult> Nearby([FromQuery] double lat, [FromQuery] double lng, [FromQuery] double? radius, [FromQuery] int? page, [FromQuery] int? limit, [FromQuery] string? sort_by, [FromQuery] string? sort_order, CancellationToken cancellationToken)
        => Success("Get nearby spots successful", await _spotService.GetNearbyAsync(lat, lng, radius, page, limit, sort_by, sort_order, cancellationToken));

    [AllowAnonymous]
    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string? keyword, [FromQuery] int? category, [FromQuery] string? city, [FromQuery] int? page, [FromQuery] int? limit, [FromQuery] string? sort_by, [FromQuery] string? sort_order, CancellationToken cancellationToken)
        => Success("Search spots successful", await _spotService.SearchAsync(keyword, category, city, page, limit, sort_by, sort_order, User.TryGetUserId(), cancellationToken));

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
        => Success("Get spot successful", await _spotService.GetByIdAsync(id, cancellationToken));

    [Authorize(Roles = "ADMIN")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] create_spot_request request, CancellationToken cancellationToken)
        => Success("Create spot successful", await _spotService.CreateAsync(request, User.GetRequiredUserId(), cancellationToken), StatusCodes.Status201Created);

    [Authorize(Roles = "ADMIN")]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] update_spot_request request, CancellationToken cancellationToken)
        => Success("Update spot successful", await _spotService.UpdateAsync(id, request, cancellationToken));

    [Authorize(Roles = "ADMIN")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _spotService.DeleteAsync(id, cancellationToken);
        return Success("Delete spot successful");
    }
}
