using System.Data;
using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Data;
using TravelSpotFinder.Api.Data.Entities;
using TravelSpotFinder.Api.Dtos.Spot;

namespace TravelSpotFinder.Api.Services;

public sealed class SpotService
{
    private readonly TravelSpotDbContext _db;

    public SpotService(TravelSpotDbContext db)
    {
        _db = db;
    }

    public async Task<object> ListAsync(int? page, int? limit, string? sort_by, string? sort_order, CancellationToken cancellationToken = default)
    {
        var (safePage, safeLimit, skip) = PaginationHelpers.GetPagination(page, limit);
        var query = ApplySpotSorting(_db.spots.AsNoTracking(), sort_by, sort_order);

        var total = await query.CountAsync(cancellationToken);
        var items = await IncludeSpotGraph(query)
            .Skip(skip)
            .Take(safeLimit)
            .ToListAsync(cancellationToken);

        return new
        {
            items = items.Select(item => ResponseMapper.MapSpot(item)).ToList(),
            pagination = PaginationHelpers.CreatePagination(safePage, safeLimit, total)
        };
    }

    public async Task<object> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var spot = await IncludeSpotGraph(_db.spots.AsNoTracking())
            .Include(item => item.reviews)
                .ThenInclude(item => item.user)
            .FirstOrDefaultAsync(item => item.id == id, cancellationToken);

        if (spot is null)
        {
            throw new ApiException("Spot not found", StatusCodes.Status404NotFound);
        }

        return ResponseMapper.MapSpot(spot, includeReviews: true);
    }

    public async Task<object> CreateAsync(create_spot_request request, int userId, CancellationToken cancellationToken = default)
    {
        await EnsureCategoryExistsAsync(request.category_id, cancellationToken);

        var spot = new Spot
        {
            name = request.name.Trim(),
            description = string.IsNullOrWhiteSpace(request.description) ? null : request.description.Trim(),
            address = request.address.Trim(),
            city = request.city.Trim(),
            latitude = request.latitude,
            longitude = request.longitude,
            category_id = request.category_id,
            image_url = string.IsNullOrWhiteSpace(request.image_url) ? null : request.image_url.Trim(),
            opening_hours = string.IsNullOrWhiteSpace(request.opening_hours) ? null : request.opening_hours.Trim(),
            ticket_price = request.ticket_price,
            average_rating = request.average_rating ?? 0d,
            created_by = userId,
            packages = request.packages?.Select(BuildPackageEntity).ToList() ?? [],
            rooms = request.rooms?.Select(BuildRoomEntity).ToList() ?? [],
            departures = request.departures?.Select(BuildDepartureEntity).ToList() ?? []
        };

        _db.spots.Add(spot);
        await _db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(spot.id, cancellationToken);
    }

    public async Task<object> UpdateAsync(int id, update_spot_request request, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _db.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken);

        var spot = await _db.spots
            .Include(item => item.packages)
            .Include(item => item.rooms)
            .Include(item => item.departures)
            .FirstOrDefaultAsync(item => item.id == id, cancellationToken);

        if (spot is null)
        {
            throw new ApiException("Spot not found", StatusCodes.Status404NotFound);
        }

        if (request.category_id.HasValue)
        {
            await EnsureCategoryExistsAsync(request.category_id.Value, cancellationToken);
        }

        if (request.packages is not null)
        {
            await SyncPackagesAsync(spot, request.packages, cancellationToken);
        }

        if (request.rooms is not null)
        {
            await SyncRoomsAsync(spot, request.rooms, cancellationToken);
        }

        if (request.departures is not null)
        {
            await SyncDeparturesAsync(spot, request.departures, cancellationToken);
        }

        if (request.name is not null)
        {
            spot.name = request.name.Trim();
        }

        if (request.description is not null)
        {
            spot.description = string.IsNullOrWhiteSpace(request.description) ? null : request.description.Trim();
        }

        if (request.address is not null)
        {
            spot.address = request.address.Trim();
        }

        if (request.city is not null)
        {
            spot.city = request.city.Trim();
        }

        if (request.latitude.HasValue)
        {
            spot.latitude = request.latitude.Value;
        }

        if (request.longitude.HasValue)
        {
            spot.longitude = request.longitude.Value;
        }

        if (request.category_id.HasValue)
        {
            spot.category_id = request.category_id.Value;
        }

        if (request.image_url is not null)
        {
            spot.image_url = string.IsNullOrWhiteSpace(request.image_url) ? null : request.image_url.Trim();
        }

        if (request.opening_hours is not null)
        {
            spot.opening_hours = string.IsNullOrWhiteSpace(request.opening_hours) ? null : request.opening_hours.Trim();
        }

        if (request.ticket_price.HasValue)
        {
            spot.ticket_price = request.ticket_price.Value;
        }

        if (request.average_rating.HasValue)
        {
            spot.average_rating = request.average_rating.Value;
        }

        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var spot = await _db.spots.FirstOrDefaultAsync(item => item.id == id, cancellationToken);
        if (spot is null)
        {
            throw new ApiException("Spot not found", StatusCodes.Status404NotFound);
        }

        var hasBookings = await _db.bookings.AnyAsync(item => item.spot_id == id, cancellationToken);
        if (hasBookings)
        {
            throw new ApiException("Cannot delete a spot that already has bookings", StatusCodes.Status409Conflict);
        }

        _db.spots.Remove(spot);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<object> GetNearbyAsync(double lat, double lng, double? radius, int? page, int? limit, string? sort_by, string? sort_order, CancellationToken cancellationToken = default)
    {
        var query = await IncludeSpotGraph(_db.spots.AsNoTracking()).ToListAsync(cancellationToken);
        var (safePage, safeLimit, _) = PaginationHelpers.GetPagination(page, limit);
        var safeRadius = radius ?? 10d;
        var isDesc = string.Equals(sort_order, "desc", StringComparison.OrdinalIgnoreCase);

        var items = query
            .Select(spot => new
            {
                spot,
                distance_km = Math.Round(DistanceHelpers.HaversineDistanceKm(lat, lng, spot.latitude, spot.longitude), 2)
            })
            .Where(item => item.distance_km <= safeRadius)
            .ToList();

        items = (sort_by ?? "distance_km") switch
        {
            "average_rating" => isDesc
                ? items.OrderByDescending(item => item.spot.average_rating).ThenBy(item => item.distance_km).ToList()
                : items.OrderBy(item => item.spot.average_rating).ThenBy(item => item.distance_km).ToList(),
            "created_at" => isDesc
                ? items.OrderByDescending(item => item.spot.created_at).ToList()
                : items.OrderBy(item => item.spot.created_at).ToList(),
            _ => isDesc
                ? items.OrderByDescending(item => item.distance_km).ToList()
                : items.OrderBy(item => item.distance_km).ToList()
        };

        var total = items.Count;
        var paged = items.Skip((safePage - 1) * safeLimit).Take(safeLimit).ToList();

        return new
        {
            items = paged.Select(item => ResponseMapper.MapNearbySpot(item.spot, item.distance_km)).ToList(),
            pagination = PaginationHelpers.CreatePagination(safePage, safeLimit, total)
        };
    }

    public async Task<object> SearchAsync(string? keyword, int? category, string? city, int? page, int? limit, string? sort_by, string? sort_order, int? userId = null, CancellationToken cancellationToken = default)
    {
        var (safePage, safeLimit, skip) = PaginationHelpers.GetPagination(page, limit);
        var query = _db.spots.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var term = keyword.Trim();
            query = query.Where(item =>
                item.name.Contains(term) ||
                (item.description != null && item.description.Contains(term)) ||
                item.address.Contains(term) ||
                item.city.Contains(term));
        }

        if (category.HasValue)
        {
            query = query.Where(item => item.category_id == category.Value);
        }

        if (!string.IsNullOrWhiteSpace(city))
        {
            var cityTerm = city.Trim();
            query = query.Where(item => item.city.Contains(cityTerm));
        }

        query = ApplySpotSorting(query, sort_by, sort_order);
        var total = await query.CountAsync(cancellationToken);
        var items = await IncludeSpotGraph(query)
            .Skip(skip)
            .Take(safeLimit)
            .ToListAsync(cancellationToken);

        if (userId.HasValue && (!string.IsNullOrWhiteSpace(keyword) || !string.IsNullOrWhiteSpace(city)))
        {
            _db.search_histories.Add(new SearchHistory
            {
                user_id = userId.Value,
                keyword = !string.IsNullOrWhiteSpace(keyword) ? keyword.Trim() : city?.Trim(),
                latitude = null,
                longitude = null
            });
            await _db.SaveChangesAsync(cancellationToken);
        }

        return new
        {
            items = items.Select(item => ResponseMapper.MapSpot(item)).ToList(),
            pagination = PaginationHelpers.CreatePagination(safePage, safeLimit, total)
        };
    }

    private IQueryable<Spot> IncludeSpotGraph(IQueryable<Spot> query)
        => query
            .Include(item => item.category)
            .Include(item => item.creator)
            .Include(item => item.packages)
            .Include(item => item.rooms)
            .Include(item => item.departures)
            .Include(item => item.images)
            .Include(item => item.favorites)
            .Include(item => item.reviews)
            .AsSplitQuery();

    private IQueryable<Spot> ApplySpotSorting(IQueryable<Spot> query, string? sortBy, string? sortOrder)
    {
        var isDesc = !string.Equals(sortOrder, "asc", StringComparison.OrdinalIgnoreCase);

        return (sortBy ?? "created_at") switch
        {
            "id" => isDesc ? query.OrderByDescending(item => item.id) : query.OrderBy(item => item.id),
            "name" => isDesc ? query.OrderByDescending(item => item.name) : query.OrderBy(item => item.name),
            "city" => isDesc ? query.OrderByDescending(item => item.city) : query.OrderBy(item => item.city),
            "average_rating" => isDesc ? query.OrderByDescending(item => item.average_rating) : query.OrderBy(item => item.average_rating),
            _ => isDesc ? query.OrderByDescending(item => item.created_at) : query.OrderBy(item => item.created_at)
        };
    }

    private async Task EnsureCategoryExistsAsync(int categoryId, CancellationToken cancellationToken)
    {
        var exists = await _db.categories.AsNoTracking().AnyAsync(item => item.id == categoryId, cancellationToken);
        if (!exists)
        {
            throw new ApiException("Category not found", StatusCodes.Status404NotFound);
        }
    }

    private static SpotPackage BuildPackageEntity(spot_package_request request)
        => new()
        {
            name = request.name.Trim(),
            description = string.IsNullOrWhiteSpace(request.description) ? null : request.description.Trim(),
            price = request.price,
            duration_minutes = request.duration_minutes,
            meeting_point = string.IsNullOrWhiteSpace(request.meeting_point) ? null : request.meeting_point.Trim(),
            pickup_included = request.pickup_included ?? false,
            pickup_note = string.IsNullOrWhiteSpace(request.pickup_note) ? null : request.pickup_note.Trim(),
            pickup_area = string.IsNullOrWhiteSpace(request.pickup_area) ? null : request.pickup_area.Trim(),
            free_cancel_before_hours = request.free_cancel_before_hours ?? 48,
            refund_percent_before = request.refund_percent_before ?? 100,
            refund_percent_after = request.refund_percent_after ?? 0
        };

    private static SpotRoom BuildRoomEntity(spot_room_request request)
        => new()
        {
            name = request.name.Trim(),
            description = string.IsNullOrWhiteSpace(request.description) ? null : request.description.Trim(),
            price = request.price,
            quantity = request.quantity,
            free_cancel_before_hours = request.free_cancel_before_hours ?? 48,
            refund_percent_before = request.refund_percent_before ?? 100,
            refund_percent_after = request.refund_percent_after ?? 0
        };

    private static SpotDeparture BuildDepartureEntity(spot_departure_request request)
        => new()
        {
            label = request.label.Trim(),
            start_time = DateTimeHelpers.EnsureUtc(request.start_time!.Value),
            end_time = DateTimeHelpers.EnsureUtc(request.end_time!.Value),
            capacity = request.capacity,
            confirmation_type = request.confirmation_type ?? ConfirmationType.MANUAL,
            is_active = request.is_active ?? true
        };

    private async Task SyncPackagesAsync(Spot spot, IReadOnlyCollection<spot_package_request> requests, CancellationToken cancellationToken)
    {
        var currentIds = spot.packages.Select(item => item.id).ToHashSet();
        var requestIds = requests.Where(item => item.id.HasValue).Select(item => item.id!.Value).ToHashSet();

        if (requests.Any(item => item.id.HasValue && !currentIds.Contains(item.id.Value)))
        {
            throw new ApiException("Invalid package id for this spot");
        }

        var removedIds = currentIds.Except(requestIds).ToList();
        if (removedIds.Count > 0)
        {
            var hasBookings = await _db.bookings.AnyAsync(item => item.package_id.HasValue && removedIds.Contains(item.package_id.Value), cancellationToken);
            if (hasBookings)
            {
                throw new ApiException("Cannot remove packages that are already used in bookings", StatusCodes.Status409Conflict);
            }

            var removed = spot.packages.Where(item => removedIds.Contains(item.id)).ToList();
            _db.spot_packages.RemoveRange(removed);
        }

        foreach (var item in requests)
        {
            if (item.id.HasValue)
            {
                var entity = spot.packages.First(package => package.id == item.id.Value);
                entity.name = item.name.Trim();
                entity.description = string.IsNullOrWhiteSpace(item.description) ? null : item.description.Trim();
                entity.price = item.price;
                entity.duration_minutes = item.duration_minutes;
                entity.meeting_point = string.IsNullOrWhiteSpace(item.meeting_point) ? null : item.meeting_point.Trim();
                entity.pickup_included = item.pickup_included ?? false;
                entity.pickup_note = string.IsNullOrWhiteSpace(item.pickup_note) ? null : item.pickup_note.Trim();
                entity.pickup_area = string.IsNullOrWhiteSpace(item.pickup_area) ? null : item.pickup_area.Trim();
                entity.free_cancel_before_hours = item.free_cancel_before_hours ?? 48;
                entity.refund_percent_before = item.refund_percent_before ?? 100;
                entity.refund_percent_after = item.refund_percent_after ?? 0;
            }
            else
            {
                spot.packages.Add(BuildPackageEntity(item));
            }
        }
    }

    private async Task SyncRoomsAsync(Spot spot, IReadOnlyCollection<spot_room_request> requests, CancellationToken cancellationToken)
    {
        var currentIds = spot.rooms.Select(item => item.id).ToHashSet();
        var requestIds = requests.Where(item => item.id.HasValue).Select(item => item.id!.Value).ToHashSet();

        if (requests.Any(item => item.id.HasValue && !currentIds.Contains(item.id.Value)))
        {
            throw new ApiException("Invalid room id for this spot");
        }

        var removedIds = currentIds.Except(requestIds).ToList();
        if (removedIds.Count > 0)
        {
            var hasBookings = await _db.bookings.AnyAsync(item => item.room_id.HasValue && removedIds.Contains(item.room_id.Value), cancellationToken);
            if (hasBookings)
            {
                throw new ApiException("Cannot remove rooms that are already used in bookings", StatusCodes.Status409Conflict);
            }

            var removed = spot.rooms.Where(item => removedIds.Contains(item.id)).ToList();
            _db.spot_rooms.RemoveRange(removed);
        }

        foreach (var item in requests)
        {
            if (item.id.HasValue)
            {
                var entity = spot.rooms.First(room => room.id == item.id.Value);
                entity.name = item.name.Trim();
                entity.description = string.IsNullOrWhiteSpace(item.description) ? null : item.description.Trim();
                entity.price = item.price;
                entity.quantity = item.quantity;
                entity.free_cancel_before_hours = item.free_cancel_before_hours ?? 48;
                entity.refund_percent_before = item.refund_percent_before ?? 100;
                entity.refund_percent_after = item.refund_percent_after ?? 0;
            }
            else
            {
                spot.rooms.Add(BuildRoomEntity(item));
            }
        }
    }

    private async Task SyncDeparturesAsync(Spot spot, IReadOnlyCollection<spot_departure_request> requests, CancellationToken cancellationToken)
    {
        var currentIds = spot.departures.Select(item => item.id).ToHashSet();
        var requestIds = requests.Where(item => item.id.HasValue).Select(item => item.id!.Value).ToHashSet();

        if (requests.Any(item => item.id.HasValue && !currentIds.Contains(item.id.Value)))
        {
            throw new ApiException("Invalid departure id for this spot");
        }

        var removedIds = currentIds.Except(requestIds).ToList();
        if (removedIds.Count > 0)
        {
            var hasBookings = await _db.bookings.AnyAsync(item => item.departure_id.HasValue && removedIds.Contains(item.departure_id.Value), cancellationToken);
            if (hasBookings)
            {
                throw new ApiException("Cannot remove departures that are already used in bookings", StatusCodes.Status409Conflict);
            }

            var removed = spot.departures.Where(item => removedIds.Contains(item.id)).ToList();
            _db.spot_departures.RemoveRange(removed);
        }

        foreach (var item in requests)
        {
            if (item.id.HasValue)
            {
                var entity = spot.departures.First(departure => departure.id == item.id.Value);
                if (item.capacity < entity.booked_count)
                {
                    throw new ApiException("Departure capacity cannot be lower than booked seats", StatusCodes.Status409Conflict);
                }

                entity.label = item.label.Trim();
                entity.start_time = DateTimeHelpers.EnsureUtc(item.start_time!.Value);
                entity.end_time = DateTimeHelpers.EnsureUtc(item.end_time!.Value);
                entity.capacity = item.capacity;
                entity.confirmation_type = item.confirmation_type ?? ConfirmationType.MANUAL;
                entity.is_active = item.is_active ?? true;
            }
            else
            {
                spot.departures.Add(BuildDepartureEntity(item));
            }
        }
    }
}
