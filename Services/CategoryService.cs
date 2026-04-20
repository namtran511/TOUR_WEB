using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Data;
using TravelSpotFinder.Api.Dtos.Category;

namespace TravelSpotFinder.Api.Services;

public sealed class CategoryService
{
    private readonly TravelSpotDbContext _db;

    public CategoryService(TravelSpotDbContext db)
    {
        _db = db;
    }

    public async Task<object> ListAsync(int? page, int? limit, string? sort_by, string? sort_order, CancellationToken cancellationToken = default)
    {
        var (safePage, safeLimit, skip) = PaginationHelpers.GetPagination(page, limit);
        var categories = _db.categories.AsNoTracking().AsQueryable();

        categories = (sort_by?.ToLowerInvariant(), sort_order?.ToLowerInvariant()) switch
        {
            ("id", "asc") => categories.OrderBy(item => item.id),
            ("id", _) => categories.OrderByDescending(item => item.id),
            ("name", "asc") => categories.OrderBy(item => item.name),
            ("name", _) => categories.OrderByDescending(item => item.name),
            ("created_at", "asc") => categories.OrderBy(item => item.created_at),
            _ => categories.OrderByDescending(item => item.created_at)
        };

        var total = await categories.CountAsync(cancellationToken);
        var items = await categories
            .Skip(skip)
            .Take(safeLimit)
            .Select(category => new
            {
                category,
                spots_count = category.spots.Count
            })
            .ToListAsync(cancellationToken);

        return new
        {
            items = items.Select(item => ResponseMapper.MapCategory(item.category, item.spots_count)).ToList(),
            pagination = PaginationHelpers.CreatePagination(safePage, safeLimit, total)
        };
    }

    public async Task<object> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var category = await _db.categories
            .AsNoTracking()
            .Where(item => item.id == id)
            .Select(item => new
            {
                category = item,
                spots_count = item.spots.Count
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (category is null)
        {
            throw new ApiException("Category not found", StatusCodes.Status404NotFound);
        }

        return ResponseMapper.MapCategory(category.category, category.spots_count);
    }

    public async Task<object> CreateAsync(create_category_request request, CancellationToken cancellationToken = default)
    {
        var name = request.name.Trim();

        var existing = await _db.categories
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.name == name, cancellationToken);

        if (existing is not null)
        {
            throw new ApiException("Category name already exists", StatusCodes.Status409Conflict);
        }

        var category = new Data.Entities.Category
        {
            name = name,
            description = string.IsNullOrWhiteSpace(request.description) ? null : request.description.Trim(),
            icon = string.IsNullOrWhiteSpace(request.icon) ? null : request.icon.Trim()
        };

        _db.categories.Add(category);
        await _db.SaveChangesAsync(cancellationToken);

        return ResponseMapper.MapCategory(category, 0);
    }

    public async Task<object> UpdateAsync(int id, update_category_request request, CancellationToken cancellationToken = default)
    {
        var category = await _db.categories.FirstOrDefaultAsync(item => item.id == id, cancellationToken);
        if (category is null)
        {
            throw new ApiException("Category not found", StatusCodes.Status404NotFound);
        }

        if (!string.IsNullOrWhiteSpace(request.name))
        {
            var existing = await _db.categories
                .AsNoTracking()
                .FirstOrDefaultAsync(item => item.name == request.name.Trim() && item.id != id, cancellationToken);

            if (existing is not null)
            {
                throw new ApiException("Category name already exists", StatusCodes.Status409Conflict);
            }
        }

        if (request.name is not null)
        {
            category.name = request.name.Trim();
        }

        if (request.description is not null)
        {
            category.description = string.IsNullOrWhiteSpace(request.description) ? null : request.description.Trim();
        }

        if (request.icon is not null)
        {
            category.icon = string.IsNullOrWhiteSpace(request.icon) ? null : request.icon.Trim();
        }

        await _db.SaveChangesAsync(cancellationToken);

        var spotsCount = await _db.spots.CountAsync(item => item.category_id == category.id, cancellationToken);
        return ResponseMapper.MapCategory(category, spotsCount);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var category = await _db.categories
            .Where(item => item.id == id)
            .Select(item => new
            {
                entity = item,
                spots_count = item.spots.Count
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (category is null)
        {
            throw new ApiException("Category not found", StatusCodes.Status404NotFound);
        }

        if (category.spots_count > 0)
        {
            throw new ApiException("Cannot delete category that still has spots");
        }

        _db.categories.Remove(category.entity);
        await _db.SaveChangesAsync(cancellationToken);
    }
}
