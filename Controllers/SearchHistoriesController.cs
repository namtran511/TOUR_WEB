using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Dtos.Search;
using TravelSpotFinder.Api.Extensions;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[Authorize]
[Route("api/search-histories")]
public sealed class SearchHistoriesController : ApiControllerBase
{
    private readonly SearchHistoryService _searchHistoryService;

    public SearchHistoriesController(SearchHistoryService searchHistoryService)
    {
        _searchHistoryService = searchHistoryService;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? page, [FromQuery] int? limit, CancellationToken cancellationToken)
        => Success("Get search histories successful", await _searchHistoryService.ListAsync(User.GetRequiredUserId(), page, limit, cancellationToken));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] create_search_history_request request, CancellationToken cancellationToken)
        => Success("Create search history successful", await _searchHistoryService.CreateAsync(User.GetRequiredUserId(), request.keyword, request.latitude, request.longitude, cancellationToken), StatusCodes.Status201Created);

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _searchHistoryService.DeleteAsync(User.GetRequiredUserId(), id, cancellationToken);
        return Success("Delete search history successful");
    }

    [HttpDelete]
    public async Task<IActionResult> Clear(CancellationToken cancellationToken)
    {
        await _searchHistoryService.ClearAsync(User.GetRequiredUserId(), cancellationToken);
        return Success("Clear search histories successful");
    }
}
