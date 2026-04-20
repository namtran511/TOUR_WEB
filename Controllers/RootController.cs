using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TravelSpotFinder.Api.Controllers;

[AllowAnonymous]
[Route("api")]
public sealed class RootController : ApiControllerBase
{
    [HttpGet]
    public IActionResult GetRoot()
        => Success("Travel Spot Finder API");

    [HttpGet("health")]
    public IActionResult GetHealth()
        => Success("Server is running");
}
