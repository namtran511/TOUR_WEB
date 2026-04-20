using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Data;
using TravelSpotFinder.Api.Dtos.Review;

namespace TravelSpotFinder.Api.Services;

public sealed class ReviewService
{
    private readonly TravelSpotDbContext _db;

    public ReviewService(TravelSpotDbContext db)
    {
        _db = db;
    }

    public async Task<object> GetBySpotAsync(int spotId, CancellationToken cancellationToken = default)
    {
        await EnsureSpotExistsAsync(spotId, cancellationToken);

        var reviews = await _db.reviews
            .AsNoTracking()
            .Where(item => item.spot_id == spotId)
            .Include(item => item.user)
            .OrderByDescending(item => item.created_at)
            .ToListAsync(cancellationToken);

        var trips = await _db.bookings
            .AsNoTracking()
            .Where(item => item.spot_id == spotId && item.status == Data.Entities.BookingStatus.COMPLETED)
            .GroupBy(item => item.user_id)
            .Select(group => group.OrderByDescending(item => item.end_date).First())
            .ToListAsync(cancellationToken);

        var tripByUser = trips.ToDictionary(item => item.user_id, item => item);

        return reviews.Select(review =>
        {
            string? tripDuration = null;
            if (tripByUser.TryGetValue(review.user_id, out var trip))
            {
                var days = Math.Max(1, (int)Math.Ceiling((trip.end_date - trip.date).TotalDays) + 1);
                tripDuration = days == 1 ? "1 ngày" : $"{days} ngày {days - 1} đêm";
            }

            return ResponseMapper.MapReview(review, tripDuration);
        }).ToList();
    }

    public async Task<object> CreateAsync(int spotId, int userId, create_review_request request, CancellationToken cancellationToken = default)
    {
        await EnsureSpotExistsAsync(spotId, cancellationToken);

        var now = DateTimeHelpers.UtcNow();
        await _db.bookings
            .Where(item => item.user_id == userId && item.spot_id == spotId && item.status == Data.Entities.BookingStatus.ACCEPTED && item.end_date < now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.status, Data.Entities.BookingStatus.COMPLETED)
                .SetProperty(item => item.updated_at, now), cancellationToken);

        var completedTrip = await _db.bookings
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.user_id == userId && item.spot_id == spotId && item.status == Data.Entities.BookingStatus.COMPLETED, cancellationToken);

        if (completedTrip is null)
        {
            throw new ApiException("Bạn cần trải nghiệm/hoàn tất chuyến đi trước khi đánh giá.", StatusCodes.Status403Forbidden);
        }

        var existing = await _db.reviews
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.user_id == userId && item.spot_id == spotId, cancellationToken);

        if (existing is not null)
        {
            throw new ApiException("You have already reviewed this spot", StatusCodes.Status409Conflict);
        }

        var review = new Data.Entities.Review
        {
            user_id = userId,
            spot_id = spotId,
            rating = request.rating,
            comment = string.IsNullOrWhiteSpace(request.comment) ? null : request.comment.Trim()
        };

        _db.reviews.Add(review);
        await _db.SaveChangesAsync(cancellationToken);

        review.user = await _db.users.AsNoTracking().FirstAsync(item => item.id == userId, cancellationToken);
        await RecalculateAverageRatingAsync(spotId, cancellationToken);

        return ResponseMapper.MapReview(review);
    }

    public async Task<object> UpdateAsync(int reviewId, int userId, string role, update_review_request request, CancellationToken cancellationToken = default)
    {
        var review = await _db.reviews
            .Include(item => item.user)
            .FirstOrDefaultAsync(item => item.id == reviewId, cancellationToken);

        if (review is null)
        {
            throw new ApiException("Review not found", StatusCodes.Status404NotFound);
        }

        if (!string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase) && review.user_id != userId)
        {
            throw new ApiException("Forbidden", StatusCodes.Status403Forbidden);
        }

        if (request.rating.HasValue)
        {
            review.rating = request.rating.Value;
        }

        if (request.comment is not null)
        {
            review.comment = string.IsNullOrWhiteSpace(request.comment) ? null : request.comment.Trim();
        }

        await _db.SaveChangesAsync(cancellationToken);
        await RecalculateAverageRatingAsync(review.spot_id, cancellationToken);

        return ResponseMapper.MapReview(review);
    }

    public async Task DeleteAsync(int reviewId, int userId, string role, CancellationToken cancellationToken = default)
    {
        var review = await _db.reviews
            .FirstOrDefaultAsync(item => item.id == reviewId, cancellationToken);

        if (review is null)
        {
            throw new ApiException("Review not found", StatusCodes.Status404NotFound);
        }

        if (!string.Equals(role, "ADMIN", StringComparison.OrdinalIgnoreCase) && review.user_id != userId)
        {
            throw new ApiException("Forbidden", StatusCodes.Status403Forbidden);
        }

        var spotId = review.spot_id;
        _db.reviews.Remove(review);
        await _db.SaveChangesAsync(cancellationToken);
        await RecalculateAverageRatingAsync(spotId, cancellationToken);
    }

    private async Task EnsureSpotExistsAsync(int spotId, CancellationToken cancellationToken)
    {
        var exists = await _db.spots.AsNoTracking().AnyAsync(item => item.id == spotId, cancellationToken);
        if (!exists)
        {
            throw new ApiException("Spot not found", StatusCodes.Status404NotFound);
        }
    }

    private async Task RecalculateAverageRatingAsync(int spotId, CancellationToken cancellationToken)
    {
        var average = await _db.reviews
            .Where(item => item.spot_id == spotId)
            .Select(item => (double?)item.rating)
            .AverageAsync(cancellationToken);

        var spot = await _db.spots.FirstAsync(item => item.id == spotId, cancellationToken);
        spot.average_rating = Math.Round(average ?? 0d, 2);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
