using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Dtos.Booking;
using TravelSpotFinder.Api.Extensions;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[Authorize]
[Route("api/bookings")]
public sealed class BookingsController : ApiControllerBase
{
    private readonly BookingService _bookingService;

    public BookingsController(BookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [Authorize(Roles = "USER")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] create_booking_request request, CancellationToken cancellationToken)
        => Success("Booking created successfully", await _bookingService.CreateAsync(User.GetRequiredUserId(), request, cancellationToken), StatusCodes.Status201Created);

    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
        => Success("Get user bookings successful", await _bookingService.GetUserBookingsAsync(User.GetRequiredUserId(), cancellationToken));

    [Authorize(Roles = "ADMIN")]
    [HttpGet("admin")]
    public async Task<IActionResult> Admin(CancellationToken cancellationToken)
        => Success("Get all bookings successful", await _bookingService.GetAdminBookingsAsync(cancellationToken));

    [Authorize(Roles = "USER")]
    [HttpPost("{id:int}/pay")]
    public async Task<IActionResult> Pay(int id, [FromBody] pay_booking_request request, CancellationToken cancellationToken)
        => Success("Booking payment updated successfully", await _bookingService.PayBookingAsync(id, User.GetRequiredUserId(), request, cancellationToken));

    [Authorize(Roles = "USER")]
    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id, [FromBody] cancel_booking_request request, CancellationToken cancellationToken)
        => Success("Booking cancelled successfully", await _bookingService.CancelAsync(id, User.GetRequiredUserId(), request.reason, cancellationToken));

    [HttpGet("{id:int}/ticket")]
    public async Task<IActionResult> Ticket(int id, CancellationToken cancellationToken)
        => Success("Get booking ticket successful", await _bookingService.GetTicketAsync(id, User.GetRequiredUserId(), User.GetRole() ?? string.Empty, cancellationToken));

    [Authorize(Roles = "ADMIN")]
    [HttpPatch("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromBody] update_booking_status_request request, CancellationToken cancellationToken)
        => Success("Booking status updated successfully", await _bookingService.UpdateStatusAsync(id, request.status!.Value, cancellationToken));
}
