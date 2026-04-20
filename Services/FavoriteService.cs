using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Data;

namespace TravelSpotFinder.Api.Services;

public sealed class FavoriteService
{
    private readonly TravelSpotDbContext _db;

    public FavoriteService(TravelSpotDbContext db)
    {
        _db = db;
    }

    public async Task<object> ListAsync(int userId, int? page, int? limit, CancellationToken cancellationToken = default)
    {
        var (safePage, safeLimit, skip) = PaginationHelpers.GetPagination(page, limit);

        var total = await _db.favorites
            .AsNoTracking()
            .CountAsync(item => item.user_id == userId, cancellationToken);

        var items = await _db.favorites
            .Where(item => item.user_id == userId)
            .OrderByDescending(item => item.created_at)
            .Skip(skip)
            .Take(safeLimit)
            .Include(item => item.spot!)
                .ThenInclude(item => item.category)
            .Include(item => item.spot!)
                .ThenInclude(item => item.images)
            .Include(item => item.spot!)
                .ThenInclude(item => item.reviews)
            .Include(item => item.spot!)
                .ThenInclude(item => item.favorites)
            .Include(item => item.spot!)
                .ThenInclude(item => item.packages)
            .Include(item => item.spot!)
                .ThenInclude(item => item.rooms)
            .Include(item => item.spot!)
                .ThenInclude(item => item.departures)
            .Include(item => item.spot!)
                .ThenInclude(item => item.creator)
            .ToListAsync(cancellationToken);

        return new
        {
            items = items.Select(ResponseMapper.MapFavorite).ToList(),
            pagination = PaginationHelpers.CreatePagination(safePage, safeLimit, total)
        };
    }

    public async Task<object> AddAsync(int userId, int spotId, CancellationToken cancellationToken = default)
    {
        var spot = await _db.spots.FirstOrDefaultAsync(item => item.id == spotId, cancellationToken);
        if (spot is null)
        {
            throw new ApiException("Spot not found", StatusCodes.Status404NotFound);
        }

        var existing = await _db.favorites
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.user_id == userId && item.spot_id == spotId, cancellationToken);

        if (existing is not null)
        {
            throw new ApiException("Spot already in favorites", StatusCodes.Status409Conflict);
        }

        var favorite = new Data.Entities.Favorite
        {
            user_id = userId,
            spot_id = spotId
        };

        _db.favorites.Add(favorite);
        await _db.SaveChangesAsync(cancellationToken);

        favorite.spot = spot;
        return new
        {
            favorite.id,
            favorite.user_id,
            favorite.spot_id,
            favorite.created_at,
            spot = ResponseMapper.MapSpot(spot)
        };
    }

    public async Task RemoveAsync(int userId, int spotId, CancellationToken cancellationToken = default)
    {
        var favorite = await _db.favorites
            .FirstOrDefaultAsync(item => item.user_id == userId && item.spot_id == spotId, cancellationToken);

        if (favorite is null)
        {
            throw new ApiException("Favorite not found", StatusCodes.Status404NotFound);
        }

        _db.favorites.Remove(favorite);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
