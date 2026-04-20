using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Common;

namespace TravelSpotFinder.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult Success(string message, object? data = null, int statusCode = StatusCodes.Status200OK)
        => StatusCode(statusCode, ApiEnvelope.Success(message, data));
}
