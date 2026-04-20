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
        await SeedVouchersAsync(cancellationToken);
        await SeedSpotPackagesAndDeparturesAsync(cancellationToken);
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

    private async Task SeedVouchersAsync(CancellationToken cancellationToken)
    {
        var vouchers = new[]
        {
            new Voucher
            {
                code = "SUMMER10",
                name = "Summer 10%",
                description = "Giảm 10% cho booking từ 500.000 VND",
                type = VoucherType.PERCENT,
                value = 10,
                max_discount = 300000,
                min_booking_amount = 500000,
                usage_limit = 100,
                expires_at = new DateTime(2026, 12, 31, 23, 59, 59, DateTimeKind.Utc),
                is_active = true
            },
            new Voucher
            {
                code = "WELCOME200K",
                name = "Welcome 200K",
                description = "Giảm trực tiếp 200.000 VND cho người dùng mới",
                type = VoucherType.FIXED,
                value = 200000,
                max_discount = null,
                min_booking_amount = 1500000,
                usage_limit = 50,
                expires_at = new DateTime(2026, 12, 31, 23, 59, 59, DateTimeKind.Utc),
                is_active = true
            }
        };

        foreach (var item in vouchers)
        {
            var existing = await _db.vouchers.FirstOrDefaultAsync(voucher => voucher.code == item.code, cancellationToken);
            if (existing is null)
            {
                _db.vouchers.Add(item);
            }
            else
            {
                existing.name = item.name;
                existing.description = item.description;
                existing.type = item.type;
                existing.value = item.value;
                existing.max_discount = item.max_discount;
                existing.min_booking_amount = item.min_booking_amount;
                existing.usage_limit = item.usage_limit;
                existing.expires_at = item.expires_at;
                existing.is_active = item.is_active;
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
