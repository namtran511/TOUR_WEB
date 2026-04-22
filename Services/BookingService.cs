using System.Data;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Data;
using TravelSpotFinder.Api.Data.Entities;
using TravelSpotFinder.Api.Dtos.Booking;

namespace TravelSpotFinder.Api.Services;

public sealed class BookingService
{
    private static readonly BookingStatus[] ActiveBookingStatuses =
    [
        BookingStatus.PENDING,
        BookingStatus.ACCEPTED
    ];

    private static readonly BookingStatus[] RoomBlockingStatuses =
    [
        BookingStatus.PENDING,
        BookingStatus.ACCEPTED,
        BookingStatus.COMPLETED
    ];

    private static readonly PaymentStatus[] AwaitingPaymentStatuses =
    [
        PaymentStatus.PENDING,
        PaymentStatus.UNPAID,
        PaymentStatus.FAILED
    ];

    private readonly TravelSpotDbContext _db;

    public BookingService(TravelSpotDbContext db)
    {
        _db = db;
    }

    public async Task<object> CreateAsync(int userId, create_booking_request request, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var spot = await _db.spots
            .Include(item => item.packages)
            .Include(item => item.rooms)
            .Include(item => item.departures)
            .FirstOrDefaultAsync(item => item.id == request.spot_id!.Value, cancellationToken);

        if (spot is null)
        {
            throw new ApiException("Spot not found", StatusCodes.Status404NotFound);
        }

        var departure = spot.departures.FirstOrDefault(item => item.id == request.departure_id && item.is_active);
        if (departure is null)
        {
            throw new ApiException("Departure not found or inactive", StatusCodes.Status404NotFound);
        }

        var startDate = DateTimeHelpers.EnsureUtc(departure.start_time);
        if (startDate <= DateTimeHelpers.UtcNow())
        {
            throw new ApiException("Departure must be in the future");
        }

        var packageItem = request.package_id.HasValue
            ? spot.packages.FirstOrDefault(item => item.id == request.package_id.Value)
            : null;

        var roomItem = request.room_id.HasValue
            ? spot.rooms.FirstOrDefault(item => item.id == request.room_id.Value)
            : null;

        if (request.package_id.HasValue && packageItem is null)
        {
            throw new ApiException("Package not found for this spot", StatusCodes.Status404NotFound);
        }

        if (request.room_id.HasValue && roomItem is null)
        {
            throw new ApiException("Room not found for this spot", StatusCodes.Status404NotFound);
        }

        if (request.pickup_requested == true && (packageItem is null || !packageItem.pickup_included))
        {
            throw new ApiException("Pickup is not available for the selected package");
        }

        var departureEndDate = DateTimeHelpers.EnsureUtc(departure.end_time);
        var tourDays = packageItem is not null ? Math.Max(request.tour_days ?? 1, 1) : 1;
        var tourEndDate = departureEndDate.AddDays(Math.Max(tourDays - 1, 0));

        var endDate = roomItem is not null
            ? request.end_date.HasValue
                ? DateTimeHelpers.EnsureUtc(request.end_date.Value)
                : throw new ApiException("End date is required for room bookings")
            : tourEndDate;

        if (roomItem is not null && packageItem is not null && endDate < tourEndDate)
        {
            throw new ApiException("Room checkout must not be earlier than the selected tour duration");
        }

        if (endDate <= startDate)
        {
            throw new ApiException("End date must be later than the departure time");
        }

        var guests = request.guests ?? 1;
        var roomCount = request.room_count ?? 1;
        var availableSeats = departure.capacity - departure.booked_count;

        if (guests > availableSeats)
        {
            throw new ApiException($"Only {availableSeats} seats left for this departure");
        }

        decimal roomTotal = 0m;
        if (roomItem is not null)
        {
            var nights = (int)Math.Ceiling((endDate - startDate).TotalDays);
            if (nights <= 0)
            {
                throw new ApiException("End date is required for room bookings");
            }

            var reservedRooms = await _db.bookings
                .Where(item =>
                    item.room_id == roomItem.id &&
                    RoomBlockingStatuses.Contains(item.status) &&
                    !(item.end_date <= startDate || item.date >= endDate))
                .SumAsync(item => (int?)item.room_count, cancellationToken) ?? 0;

            if (reservedRooms + roomCount > roomItem.quantity)
            {
                throw new ApiException($"Only {Math.Max(roomItem.quantity - reservedRooms, 0)} rooms left for the selected dates");
            }

            roomTotal = roomItem.price * roomCount * nights;
        }

        var packageTotal = packageItem is not null ? packageItem.price * guests * tourDays : 0m;
        var subtotal = RoundPrice(packageTotal + roomTotal);
        var totalPrice = subtotal;
        var confirmationType = departure.confirmation_type;
        var bookingStatus = confirmationType == ConfirmationType.INSTANT ? BookingStatus.ACCEPTED : BookingStatus.PENDING;
        var bookingCode = GenerateCode("BK");
        var paymentMethod = request.payment_method ?? PaymentMethod.PAY_NOW;
        var paymentDueAt = BuildPaymentDueAt(paymentMethod, startDate);

        departure.booked_count += guests;

        var booking = new Booking
        {
            user_id = userId,
            spot_id = spot.id,
            package_id = packageItem?.id,
            room_id = roomItem?.id,
            departure_id = departure.id,
            date = startDate,
            end_date = endDate,
            guests = guests,
            tour_days = tourDays,
            room_count = roomItem is not null ? roomCount : 1,
            subtotal_price = subtotal,
            discount_amount = 0m,
            total_price = totalPrice,
            status = bookingStatus,
            payment_method = paymentMethod,
            confirmation_type = confirmationType,
            expires_at = bookingStatus == BookingStatus.PENDING ? BuildConfirmationExpiry(startDate) : null,
            confirmed_at = bookingStatus == BookingStatus.ACCEPTED ? DateTimeHelpers.UtcNow() : null,
            notes = string.IsNullOrWhiteSpace(request.notes) ? null : request.notes.Trim(),
            booking_code = bookingCode,
            pickup_requested = request.pickup_requested ?? false,
            pickup_address = request.pickup_requested == true && !string.IsNullOrWhiteSpace(request.pickup_address)
                ? request.pickup_address.Trim()
                : null,
            meeting_point_snapshot = packageItem?.meeting_point ?? spot.address
        };

        var payment = new Payment
        {
            amount = totalPrice,
            method = paymentMethod,
            status = paymentMethod == PaymentMethod.PAY_AT_DESTINATION ? PaymentStatus.UNPAID : PaymentStatus.PENDING,
            due_at = paymentDueAt
        };

        booking.payment = payment;
        _db.bookings.Add(booking);

        await _db.SaveChangesAsync(cancellationToken);
        await IssueTicketIfEligibleAsync(booking.id, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var result = await LoadBookingAsync(booking.id, includeUser: false, tracking: false, cancellationToken);
        return ResponseMapper.MapBooking(result!, includeUser: false);
    }

    public async Task<object> GetUserBookingsAsync(int userId, CancellationToken cancellationToken = default)
    {
        await SyncBookingLifecycleAsync(cancellationToken);

        var items = await BuildBookingQuery(includeUser: false, tracking: false)
            .Where(item => item.user_id == userId)
            .OrderByDescending(item => item.created_at)
            .ToListAsync(cancellationToken);

        return items.Select(item => ResponseMapper.MapBooking(item)).ToList();
    }

    public async Task<object> GetAdminBookingsAsync(CancellationToken cancellationToken = default)
    {
        await SyncBookingLifecycleAsync(cancellationToken);

        var items = await BuildBookingQuery(includeUser: true, tracking: false)
            .OrderByDescending(item => item.created_at)
            .ToListAsync(cancellationToken);

        return items.Select(item => ResponseMapper.MapBooking(item, includeUser: true)).ToList();
    }

    public async Task<object> UpdateStatusAsync(int bookingId, BookingStatus status, CancellationToken cancellationToken = default)
    {
        await SyncBookingLifecycleAsync(cancellationToken);

        var booking = await LoadBookingAsync(bookingId, includeUser: false, tracking: true, cancellationToken);
        if (booking is null)
        {
            throw new ApiException("Booking not found", StatusCodes.Status404NotFound);
        }

        switch (status)
        {
            case BookingStatus.ACCEPTED:
                if (booking.status != BookingStatus.PENDING)
                {
                    throw new ApiException("Only pending bookings can be accepted");
                }

                booking.status = BookingStatus.ACCEPTED;
                booking.confirmed_at = DateTimeHelpers.UtcNow();
                booking.rejection_reason = null;
                await IssueTicketIfEligibleAsync(booking.id, cancellationToken);
                break;

            case BookingStatus.REJECTED:
                if (booking.status != BookingStatus.PENDING)
                {
                    throw new ApiException("Only pending bookings can be rejected");
                }

                booking.status = BookingStatus.REJECTED;
                booking.rejection_reason = "Rejected by admin";
                await ReleaseDepartureCapacityAsync(booking, cancellationToken);

                if (booking.payment?.status == PaymentStatus.PAID)
                {
                    booking.payment.status = PaymentStatus.REFUNDED;
                    booking.payment.refunded_at = DateTimeHelpers.UtcNow();
                }
                break;

            case BookingStatus.COMPLETED:
                if (booking.status != BookingStatus.ACCEPTED)
                {
                    throw new ApiException("Only accepted bookings can be completed");
                }

                booking.status = BookingStatus.COMPLETED;
                break;

            case BookingStatus.NO_SHOW:
                if (booking.status != BookingStatus.ACCEPTED)
                {
                    throw new ApiException("Only accepted bookings can be marked as no-show");
                }

                booking.status = BookingStatus.NO_SHOW;
                break;

            default:
                throw new ApiException("Unsupported booking status");
        }

        await _db.SaveChangesAsync(cancellationToken);

        var result = await LoadBookingAsync(booking.id, includeUser: false, tracking: false, cancellationToken);
        return ResponseMapper.MapBooking(result!);
    }

    public async Task<object> PayBookingAsync(int bookingId, int userId, pay_booking_request request, CancellationToken cancellationToken = default)
    {
        await SyncBookingLifecycleAsync(cancellationToken);

        var booking = await LoadBookingAsync(bookingId, includeUser: false, tracking: true, cancellationToken);
        if (booking is null || booking.user_id != userId)
        {
            throw new ApiException("Booking not found", StatusCodes.Status404NotFound);
        }

        if (!ActiveBookingStatuses.Contains(booking.status))
        {
            throw new ApiException("Only active bookings can be paid");
        }

        if (booking.payment is null)
        {
            throw new ApiException("Payment record not found", StatusCodes.Status404NotFound);
        }

        if (booking.payment.status == PaymentStatus.PAID)
        {
            throw new ApiException("Booking is already paid");
        }

        if (!AwaitingPaymentStatuses.Contains(booking.payment.status))
        {
            throw new ApiException("Payment cannot be restarted for this booking");
        }

        if (booking.payment_method != PaymentMethod.PAY_NOW && booking.payment_method != PaymentMethod.PAY_LATER)
        {
            throw new ApiException("Online payment is only available for PAY_NOW or PAY_LATER bookings");
        }

        var transactionCode = string.IsNullOrWhiteSpace(request.transaction_code)
            ? GenerateCode("PAY")
            : request.transaction_code.Trim();

        booking.payment.status = PaymentStatus.PAID;
        booking.payment.paid_at = DateTimeHelpers.UtcNow();
        booking.payment.transaction_code = transactionCode;

        await IssueTicketIfEligibleAsync(booking.id, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        var result = await LoadBookingAsync(booking.id, includeUser: false, tracking: false, cancellationToken);
        return ResponseMapper.MapBooking(result!);
    }

    public async Task<object> CancelAsync(int bookingId, int userId, string? reason, CancellationToken cancellationToken = default)
    {
        await SyncBookingLifecycleAsync(cancellationToken);

        var booking = await LoadBookingAsync(bookingId, includeUser: false, tracking: true, cancellationToken);
        if (booking is null || booking.user_id != userId)
        {
            throw new ApiException("Booking not found", StatusCodes.Status404NotFound);
        }

        if (!ActiveBookingStatuses.Contains(booking.status))
        {
            throw new ApiException("Only pending or accepted bookings can be cancelled");
        }

        if (DateTimeHelpers.EnsureUtc(booking.date) <= DateTimeHelpers.UtcNow())
        {
            throw new ApiException("Bookings that have already started can no longer be cancelled");
        }

        var refundAmount = CalculateRefundAmount(booking);
        booking.status = BookingStatus.CANCELLED;
        booking.cancelled_at = DateTimeHelpers.UtcNow();
        booking.cancellation_reason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        booking.refund_amount = refundAmount;

        await ReleaseDepartureCapacityAsync(booking, cancellationToken);

        if (booking.payment?.status == PaymentStatus.PAID)
        {
            booking.payment.status = refundAmount >= booking.payment.amount
                ? PaymentStatus.REFUNDED
                : refundAmount > 0
                    ? PaymentStatus.PARTIALLY_REFUNDED
                    : PaymentStatus.PAID;

            if (refundAmount > 0)
            {
                booking.payment.refunded_at = DateTimeHelpers.UtcNow();
            }
        }

        await _db.SaveChangesAsync(cancellationToken);

        var result = await LoadBookingAsync(booking.id, includeUser: false, tracking: false, cancellationToken);
        return ResponseMapper.MapBooking(result!);
    }

    public async Task<object> GetTicketAsync(int bookingId, int userId, string role, CancellationToken cancellationToken = default)
    {
        await SyncBookingLifecycleAsync(cancellationToken);

        var booking = await LoadBookingAsync(bookingId, includeUser: true, tracking: true, cancellationToken);
        if (booking is null)
        {
            throw new ApiException("Booking not found", StatusCodes.Status404NotFound);
        }

        if (!string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase) && booking.user_id != userId)
        {
            throw new ApiException("Forbidden", StatusCodes.Status403Forbidden);
        }

        if (booking.status != BookingStatus.ACCEPTED && booking.status != BookingStatus.COMPLETED)
        {
            throw new ApiException("Ticket is only available after booking confirmation");
        }

        if (booking.payment_method != PaymentMethod.PAY_AT_DESTINATION && booking.payment?.status != PaymentStatus.PAID)
        {
            throw new ApiException("Ticket is only available after payment");
        }

        await IssueTicketIfEligibleAsync(booking.id, cancellationToken);
        await _db.SaveChangesAsync(cancellationToken);

        var result = await LoadBookingAsync(booking.id, includeUser: true, tracking: false, cancellationToken);
        return ResponseMapper.MapTicket(result!);
    }

    public async Task SyncBookingLifecycleAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeHelpers.UtcNow();

        var pendingConfirmations = await BuildBookingQuery(includeUser: false, tracking: true)
            .Where(item => item.status == BookingStatus.PENDING && item.expires_at.HasValue && item.expires_at.Value < now)
            .ToListAsync(cancellationToken);

        foreach (var booking in pendingConfirmations)
        {
            if (booking.status != BookingStatus.PENDING)
            {
                continue;
            }

            booking.status = BookingStatus.REJECTED;
            booking.rejection_reason = "Confirmation window expired";

            if (booking.payment?.status == PaymentStatus.PAID)
            {
                booking.payment.status = PaymentStatus.REFUNDED;
                booking.payment.refunded_at = now;
            }

            await ReleaseDepartureCapacityAsync(booking, cancellationToken);
        }

        var paymentExpiredBookings = await BuildBookingQuery(includeUser: false, tracking: true)
            .Where(item =>
                ActiveBookingStatuses.Contains(item.status) &&
                item.payment != null &&
                AwaitingPaymentStatuses.Contains(item.payment.status) &&
                item.payment.due_at.HasValue &&
                item.payment.due_at.Value < now)
            .ToListAsync(cancellationToken);

        foreach (var booking in paymentExpiredBookings)
        {
            if (booking.payment_method == PaymentMethod.PAY_AT_DESTINATION)
            {
                continue;
            }

            if (!ActiveBookingStatuses.Contains(booking.status) || booking.payment is null || !AwaitingPaymentStatuses.Contains(booking.payment.status))
            {
                continue;
            }

            booking.status = BookingStatus.CANCELLED;
            booking.cancelled_at = now;
            booking.cancellation_reason = "Payment due date passed";
            booking.payment.status = PaymentStatus.FAILED;

            await ReleaseDepartureCapacityAsync(booking, cancellationToken);
        }

        await _db.bookings
            .Where(item => item.status == BookingStatus.ACCEPTED && item.end_date < now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.status, BookingStatus.COMPLETED)
                .SetProperty(item => item.updated_at, now), cancellationToken);

        if (pendingConfirmations.Count > 0 || paymentExpiredBookings.Count > 0)
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
    }

    private IQueryable<Booking> BuildBookingQuery(bool includeUser, bool tracking)
    {
        IQueryable<Booking> query = tracking ? _db.bookings : _db.bookings.AsNoTracking();

        query = query
            .Include(item => item.spot)
            .Include(item => item.package)
            .Include(item => item.room)
            .Include(item => item.departure)
            .Include(item => item.payment)
            .AsSplitQuery();

        if (includeUser)
        {
            query = query.Include(item => item.user);
        }

        return query;
    }

    private Task<Booking?> LoadBookingAsync(int bookingId, bool includeUser, bool tracking, CancellationToken cancellationToken)
        => BuildBookingQuery(includeUser, tracking)
            .FirstOrDefaultAsync(item => item.id == bookingId, cancellationToken);

    private async Task ReleaseDepartureCapacityAsync(Booking booking, CancellationToken cancellationToken)
    {
        if (!booking.departure_id.HasValue)
        {
            return;
        }

        var departure = booking.departure ?? await _db.spot_departures.FirstOrDefaultAsync(item => item.id == booking.departure_id.Value, cancellationToken);
        if (departure is null)
        {
            return;
        }

        departure.booked_count = Math.Max(0, departure.booked_count - booking.guests);
    }

    private async Task IssueTicketIfEligibleAsync(int bookingId, CancellationToken cancellationToken)
    {
        var booking = await LoadBookingAsync(bookingId, includeUser: false, tracking: true, cancellationToken);
        if (booking is null || !string.IsNullOrWhiteSpace(booking.ticket_code) || !CanIssueTicket(booking))
        {
            return;
        }

        var ticketCode = GenerateCode("TKT");
        booking.ticket_code = ticketCode;
        booking.qr_value = $"ticket:{ticketCode}";
    }

    private static bool CanIssueTicket(Booking booking)
    {
        if (booking.status != BookingStatus.ACCEPTED && booking.status != BookingStatus.COMPLETED)
        {
            return false;
        }

        if (booking.payment_method == PaymentMethod.PAY_AT_DESTINATION)
        {
            return true;
        }

        return booking.payment?.status == PaymentStatus.PAID;
    }

    private static DateTime? BuildPaymentDueAt(PaymentMethod paymentMethod, DateTime departureStart)
    {
        var now = DateTimeHelpers.UtcNow();

        return paymentMethod switch
        {
            PaymentMethod.PAY_NOW => now.AddMinutes(30),
            PaymentMethod.PAY_LATER => MinDate(now.AddHours(24), departureStart.AddHours(-2)) > now
                ? MinDate(now.AddHours(24), departureStart.AddHours(-2))
                : now.AddMinutes(30),
            _ => null
        };
    }

    private static DateTime BuildConfirmationExpiry(DateTime departureStart)
    {
        var now = DateTimeHelpers.UtcNow();
        var candidate = MinDate(now.AddHours(6), departureStart.AddMinutes(-30));
        if (candidate <= now)
        {
            throw new ApiException("Departure is too close to require manual confirmation");
        }

        return candidate;
    }

    private static decimal CalculateRefundAmount(Booking booking)
    {
        if (booking.payment?.status != PaymentStatus.PAID)
        {
            return 0m;
        }

        var now = DateTimeHelpers.UtcNow();
        var (freeCancelBeforeHours, refundPercentBefore, refundPercentAfter) = ResolveCancellationPolicy(booking);
        var deadline = DateTimeHelpers.EnsureUtc(booking.date).AddHours(-freeCancelBeforeHours);
        var percent = now <= deadline ? refundPercentBefore : refundPercentAfter;

        return RoundPrice(booking.payment.amount * (percent / 100m));
    }

    private static (int freeCancelBeforeHours, decimal refundPercentBefore, decimal refundPercentAfter) ResolveCancellationPolicy(Booking booking)
    {
        if (booking.package is not null)
        {
            return (booking.package.free_cancel_before_hours, booking.package.refund_percent_before, booking.package.refund_percent_after);
        }

        if (booking.room is not null)
        {
            return (booking.room.free_cancel_before_hours, booking.room.refund_percent_before, booking.room.refund_percent_after);
        }

        return (48, 100m, 0m);
    }

    private static decimal RoundPrice(decimal value)
        => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static DateTime MinDate(DateTime left, DateTime right)
        => left <= right ? left : right;

    private static string GenerateCode(string prefix)
    {
        var random = Convert.ToHexString(RandomNumberGenerator.GetBytes(4));
        var timestamp = ToBase36(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        return $"{prefix}-{timestamp}-{random}";
    }

    private static string ToBase36(long value)
    {
        const string chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        if (value == 0)
        {
            return "0";
        }

        var buffer = new Stack<char>();
        var current = value;

        while (current > 0)
        {
            buffer.Push(chars[(int)(current % 36)]);
            current /= 36;
        }

        return new string(buffer.ToArray());
    }
}
