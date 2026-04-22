using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Data.Entities;

namespace TravelSpotFinder.Api.Data.Seed;

public sealed class DataSeeder
{
    private readonly TravelSpotDbContext _db;

    public DataSeeder(TravelSpotDbContext db)
    {
        _db = db;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        await SeedUsersAsync(cancellationToken);
        await SeedCategoriesAsync(cancellationToken);
        await SeedSpotsAsync(cancellationToken);
        await SeedSpotPackagesAndDeparturesAsync(cancellationToken);
    }

    private async Task SeedSpotsAsync(CancellationToken cancellationToken)
    {
        var admin = await _db.users.FirstOrDefaultAsync(user => user.email == "admin@travelspot.com", cancellationToken);
        if (admin is null)
        {
            return;
        }

        var beach = await _db.categories.FirstAsync(item => item.name == "Beach", cancellationToken);
        var mountain = await _db.categories.FirstAsync(item => item.name == "Mountain", cancellationToken);
        var historical = await _db.categories.FirstAsync(item => item.name == "Historical", cancellationToken);

        var sampleSpots = new[]
        {
            new Spot
            {
                name = "Bãi biển Mỹ Khê",
                description = "Một trong những bãi biển đẹp nhất Đà Nẵng với cát trắng mịn và nước biển trong xanh.",
                address = "Võ Nguyên Giáp, Sơn Trà",
                city = "Đà Nẵng",
                latitude = 16.0664,
                longitude = 108.2480,
                category_id = beach.id,
                image_url = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200",
                opening_hours = "24/7",
                ticket_price = 0,
                average_rating = 4.7,
                created_by = admin.id
            },
            new Spot
            {
                name = "Vịnh Hạ Long",
                description = "Di sản thiên nhiên thế giới với hàng nghìn hòn đảo đá vôi kỳ vĩ.",
                address = "Thành phố Hạ Long",
                city = "Quảng Ninh",
                latitude = 20.9101,
                longitude = 107.1839,
                category_id = beach.id,
                image_url = "https://images.unsplash.com/photo-1573270695802-5ad68d4ae4aa?w=1200",
                opening_hours = "06:00 - 18:00",
                ticket_price = 290000,
                average_rating = 4.9,
                created_by = admin.id
            },
            new Spot
            {
                name = "Sa Pa - Fansipan",
                description = "Nóc nhà Đông Dương với cảnh sắc mây núi tuyệt đẹp quanh năm.",
                address = "Thị xã Sa Pa",
                city = "Lào Cai",
                latitude = 22.3524,
                longitude = 103.7750,
                category_id = mountain.id,
                image_url = "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200",
                opening_hours = "07:30 - 17:30",
                ticket_price = 800000,
                average_rating = 4.8,
                created_by = admin.id
            },
            new Spot
            {
                name = "Bà Nà Hills",
                description = "Khu du lịch nghỉ dưỡng trên đỉnh núi với Cầu Vàng nổi tiếng.",
                address = "Hòa Ninh, Hòa Vang",
                city = "Đà Nẵng",
                latitude = 15.9977,
                longitude = 107.9884,
                category_id = mountain.id,
                image_url = "https://images.unsplash.com/photo-1528127269322-539801943592?w=1200",
                opening_hours = "07:30 - 22:00",
                ticket_price = 900000,
                average_rating = 4.6,
                created_by = admin.id
            },
            new Spot
            {
                name = "Phố cổ Hội An",
                description = "Đô thị cổ được UNESCO công nhận, nổi tiếng với đèn lồng và ẩm thực.",
                address = "Thành phố Hội An",
                city = "Quảng Nam",
                latitude = 15.8801,
                longitude = 108.3380,
                category_id = historical.id,
                image_url = "https://images.unsplash.com/photo-1528127269322-539801943592?w=1200",
                opening_hours = "24/7",
                ticket_price = 120000,
                average_rating = 4.8,
                created_by = admin.id
            },
            new Spot
            {
                name = "Cố đô Huế",
                description = "Quần thể di tích triều Nguyễn, di sản văn hóa thế giới.",
                address = "Thành phố Huế",
                city = "Thừa Thiên Huế",
                latitude = 16.4637,
                longitude = 107.5909,
                category_id = historical.id,
                image_url = "https://images.unsplash.com/photo-1509233725247-49e657c54213?w=1200",
                opening_hours = "07:00 - 17:30",
                ticket_price = 200000,
                average_rating = 4.7,
                created_by = admin.id
            }
        };

        foreach (var item in sampleSpots)
        {
            var exists = await _db.spots.AnyAsync(
                existing => existing.name == item.name && existing.city == item.city,
                cancellationToken);

            if (!exists)
            {
                _db.spots.Add(item);
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedUsersAsync(CancellationToken cancellationToken)
    {
        if (!await _db.users.AnyAsync(item => item.email == "admin@travelspot.com", cancellationToken))
        {
            _db.users.Add(new User
            {
                full_name = "System Admin",
                email = "admin@travelspot.com",
                password_hash = BCrypt.Net.BCrypt.HashPassword("admin123", workFactor: 10),
                role = UserRole.ADMIN
            });
        }

        if (!await _db.users.AnyAsync(item => item.email == "namtest@example.com", cancellationToken))
        {
            _db.users.Add(new User
            {
                full_name = "Nam Test",
                email = "namtest@example.com",
                password_hash = BCrypt.Net.BCrypt.HashPassword("123456", workFactor: 10),
                role = UserRole.USER
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedCategoriesAsync(CancellationToken cancellationToken)
    {
        var categories = new[]
        {
            new Category { name = "Beach", description = "Beautiful beach destinations", icon = "beach" },
            new Category { name = "Mountain", description = "Mountain and hiking spots", icon = "mountain" },
            new Category { name = "Historical", description = "Historical and cultural places", icon = "landmark" }
        };

        foreach (var item in categories)
        {
            var existing = await _db.categories.FirstOrDefaultAsync(category => category.name == item.name, cancellationToken);
            if (existing is null)
            {
                _db.categories.Add(item);
            }
            else
            {
                existing.description = item.description;
                existing.icon = item.icon;
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private async Task SeedSpotPackagesAndDeparturesAsync(CancellationToken cancellationToken)
    {
        var spots = await _db.spots
            .Include(item => item.packages)
            .Include(item => item.departures)
            .AsSplitQuery()
            .ToListAsync(cancellationToken);

        foreach (var spot in spots)
        {
            if (spot.packages.Count == 0)
            {
                spot.packages.AddRange(
                [
                    new SpotPackage
                    {
                        name = "Gói Phổ Thông",
                        description = "Bao gồm vé vào cửa và dịch vụ tiêu chuẩn",
                        price = 500000,
                        duration_minutes = 240,
                        meeting_point = "Sảnh chính",
                        pickup_included = false,
                        free_cancel_before_hours = 48,
                        refund_percent_before = 100,
                        refund_percent_after = 0
                    },
                    new SpotPackage
                    {
                        name = "Gói Nâng Cao",
                        description = "Thêm dịch vụ ăn uống và hướng dẫn viên",
                        price = 1500000,
                        duration_minutes = 360,
                        meeting_point = "Sảnh chính",
                        pickup_included = true,
                        pickup_note = "Đón trong khu vực trung tâm",
                        pickup_area = "Trung tâm thành phố",
                        free_cancel_before_hours = 48,
                        refund_percent_before = 100,
                        refund_percent_after = 25
                    },
                    new SpotPackage
                    {
                        name = "Gói Cao Cấp (VIP)",
                        description = "Trải nghiệm sang trọng và xe đưa đón tận nơi",
                        price = 3500000,
                        duration_minutes = 480,
                        meeting_point = "Sảnh VIP",
                        pickup_included = true,
                        pickup_note = "Đón tận nơi",
                        pickup_area = "Nội thành",
                        free_cancel_before_hours = 72,
                        refund_percent_before = 100,
                        refund_percent_after = 50
                    }
                ]);
            }

            if (spot.departures.Count == 0)
            {
                spot.departures.AddRange(
                    Enumerable.Range(0, 3)
                        .Select(index => BuildDemoDeparture(index))
                        .ToList());
            }
        }

        await _db.SaveChangesAsync(cancellationToken);
    }

    private static SpotDeparture BuildDemoDeparture(int index, DateTime? referenceDate = null)
    {
        var now = referenceDate ?? DateTime.UtcNow;
        var year = GetDemoDepartureYear(now);
        var start = new DateTime(year, 5, index + 1, 8 + index * 2, 0, 0, DateTimeKind.Utc);
        var end = start.AddHours(4);

        return new SpotDeparture
        {
            label = $"Khởi hành {index + 1}",
            start_time = start,
            end_time = end,
            capacity = 20,
            booked_count = 0,
            confirmation_type = index == 0 ? ConfirmationType.INSTANT : ConfirmationType.MANUAL,
            is_active = true
        };
    }

    private static int GetDemoDepartureYear(DateTime referenceDate)
    {
        var year = referenceDate.Year;
        var lastDemoDate = new DateTime(year, 5, 3, 23, 59, 59, 999, DateTimeKind.Utc);
        return referenceDate <= lastDemoDate ? year : year + 1;
    }
}
