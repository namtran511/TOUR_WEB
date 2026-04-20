using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Dtos.Review;
using TravelSpotFinder.Api.Extensions;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[Route("api/reviews")]
public sealed class ReviewsController : ApiControllerBase
{
    private readonly ReviewService _reviewService;

    public ReviewsController(ReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    [AllowAnonymous]
    [HttpGet("spot/{spotId:int}")]
    public async Task<IActionResult> ListBySpot(int spotId, CancellationToken cancellationToken)
        => Success("Get reviews successful", await _reviewService.GetBySpotAsync(spotId, cancellationToken));

    [Authorize]
    [HttpPost("spot/{spotId:int}")]
    public async Task<IActionResult> Create(int spotId, [FromBody] create_review_request request, CancellationToken cancellationToken)
        => Success("Create review successful", await _reviewService.CreateAsync(spotId, User.GetRequiredUserId(), request, cancellationToken), StatusCodes.Status201Created);

    [Authorize]
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] update_review_request request, CancellationToken cancellationToken)
        => Success("Update review successful", await _reviewService.UpdateAsync(id, User.GetRequiredUserId(), User.GetRole() ?? string.Empty, request, cancellationToken));

    [Authorize]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await _reviewService.DeleteAsync(id, User.GetRequiredUserId(), User.GetRole() ?? string.Empty, cancellationToken);
        return Success("Delete review successful");
    }
}
