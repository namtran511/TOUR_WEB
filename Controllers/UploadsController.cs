using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[Authorize]
[Route("api/uploads")]
public sealed class UploadsController : ApiControllerBase
{
    private readonly UploadService _uploadService;

    public UploadsController(UploadService uploadService)
    {
        _uploadService = uploadService;
    }

    [HttpPost("image")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile? file, CancellationToken cancellationToken)
        => Success("Upload image successful", await _uploadService.SaveImageAsync(file, cancellationToken), StatusCodes.Status201Created);
}
