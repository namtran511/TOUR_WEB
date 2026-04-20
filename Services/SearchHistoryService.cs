using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Data;

namespace TravelSpotFinder.Api.Services;

public sealed class SearchHistoryService
{
    private readonly TravelSpotDbContext _db;

    public SearchHistoryService(TravelSpotDbContext db)
    {
        _db = db;
    }

    public async Task<object> ListAsync(int userId, int? page, int? limit, CancellationToken cancellationToken = default)
    {
        var (safePage, safeLimit, skip) = PaginationHelpers.GetPagination(page, limit);

        var query = _db.search_histories
            .AsNoTracking()
            .Where(item => item.user_id == userId);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(item => item.searched_at)
            .Skip(skip)
            .Take(safeLimit)
            .Select(item => new
            {
                item.id,
                item.user_id,
                item.keyword,
                item.latitude,
                item.longitude,
                item.searched_at
            })
            .ToListAsync(cancellationToken);

        return new
        {
            items,
            pagination = PaginationHelpers.CreatePagination(safePage, safeLimit, total)
        };
    }

    public async Task<object> CreateAsync(int userId, string? keyword, double? latitude, double? longitude, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(keyword) && (!latitude.HasValue || !longitude.HasValue))
        {
            throw new ApiException("keyword or (latitude, longitude) is required", StatusCodes.Status400BadRequest);
        }

        var entry = new Data.Entities.SearchHistory
        {
            user_id = userId,
            keyword = string.IsNullOrWhiteSpace(keyword) ? null : keyword.Trim(),
            latitude = latitude,
            longitude = longitude,
            searched_at = DateTimeHelpers.UtcNow()
        };

        _db.search_histories.Add(entry);
        await _db.SaveChangesAsync(cancellationToken);

        return new
        {
            entry.id,
            entry.user_id,
            entry.keyword,
            entry.latitude,
            entry.longitude,
            entry.searched_at
        };
    }

    public async Task DeleteAsync(int userId, int id, CancellationToken cancellationToken = default)
    {
        var entry = await _db.search_histories
            .FirstOrDefaultAsync(item => item.id == id && item.user_id == userId, cancellationToken);

        if (entry is null)
        {
            throw new ApiException("Search history entry not found", StatusCodes.Status404NotFound);
        }

        _db.search_histories.Remove(entry);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task ClearAsync(int userId, CancellationToken cancellationToken = default)
    {
        var entries = await _db.search_histories
            .Where(item => item.user_id == userId)
            .ToListAsync(cancellationToken);

        if (entries.Count == 0)
        {
            return;
        }

        _db.search_histories.RemoveRange(entries);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
