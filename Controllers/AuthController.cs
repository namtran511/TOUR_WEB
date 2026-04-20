using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Dtos.Auth;
using TravelSpotFinder.Api.Extensions;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController : ApiControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] register_request request, CancellationToken cancellationToken)
        => Success("Register successful", await _authService.RegisterAsync(request, cancellationToken), StatusCodes.Status201Created);

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] login_request request, CancellationToken cancellationToken)
        => Success("Login successful", await _authService.LoginAsync(request, cancellationToken));

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
        => Success("Get profile successful", await _authService.GetMeAsync(User.GetRequiredUserId(), cancellationToken));
}
