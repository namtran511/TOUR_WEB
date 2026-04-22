using Microsoft.EntityFrameworkCore;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Data.Entities;

namespace TravelSpotFinder.Api.Data;

public sealed class TravelSpotDbContext : DbContext
{
    public TravelSpotDbContext(DbContextOptions<TravelSpotDbContext> options) : base(options)
    {
    }

    public DbSet<User> users => Set<User>();
    public DbSet<Category> categories => Set<Category>();
    public DbSet<Spot> spots => Set<Spot>();
    public DbSet<Favorite> favorites => Set<Favorite>();
    public DbSet<Review> reviews => Set<Review>();
    public DbSet<SpotImage> spot_images => Set<SpotImage>();
    public DbSet<SpotPackage> spot_packages => Set<SpotPackage>();
    public DbSet<SpotRoom> spot_rooms => Set<SpotRoom>();
    public DbSet<SpotDeparture> spot_departures => Set<SpotDeparture>();
    public DbSet<Booking> bookings => Set<Booking>();
    public DbSet<Payment> payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureUser(modelBuilder);
        ConfigureCategory(modelBuilder);
        ConfigureSpot(modelBuilder);
        ConfigureFavorite(modelBuilder);
        ConfigureReview(modelBuilder);
        ConfigureSpotImage(modelBuilder);
        ConfigureSpotPackage(modelBuilder);
        ConfigureSpotRoom(modelBuilder);
        ConfigureSpotDeparture(modelBuilder);
        ConfigureBooking(modelBuilder);
        ConfigurePayment(modelBuilder);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditTimestamps();
        return await base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyAuditTimestamps();
        return base.SaveChanges();
    }

    private void ApplyAuditTimestamps()
    {
        var now = DateTimeHelpers.UtcNow();

        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State != EntityState.Added && entry.State != EntityState.Modified)
            {
                continue;
            }

            var createdProperty = entry.Properties.FirstOrDefault(property => property.Metadata.Name == "created_at");
            var updatedProperty = entry.Properties.FirstOrDefault(property => property.Metadata.Name == "updated_at");

            if (entry.State == EntityState.Added && createdProperty is not null)
            {
                var createdAt = createdProperty.CurrentValue is DateTime value ? value : default(DateTime?);
                if (!createdAt.HasValue || createdAt.Value == default)
                {
                    createdProperty.CurrentValue = now;
                }
            }

            if (updatedProperty is not null)
            {
                updatedProperty.CurrentValue = now;
            }
        }
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.email).IsUnique();
            entity.Property(item => item.full_name).HasMaxLength(100);
            entity.Property(item => item.email).HasMaxLength(150);
            entity.Property(item => item.password_hash).HasMaxLength(255);
            entity.Property(item => item.avatar_url).HasMaxLength(255);
            entity.Property(item => item.role).HasConversion<string>();
        });
    }

    private static void ConfigureCategory(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.name).IsUnique();
            entity.Property(item => item.name).HasMaxLength(100);
            entity.Property(item => item.icon).HasMaxLength(255);
        });
    }

    private static void ConfigureSpot(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Spot>(entity =>
        {
            entity.ToTable("spots");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.category_id);
            entity.HasIndex(item => item.created_by);
            entity.HasIndex(item => item.city);
            entity.HasIndex(item => new { item.latitude, item.longitude });
            entity.Property(item => item.name).HasMaxLength(150);
            entity.Property(item => item.address).HasMaxLength(255);
            entity.Property(item => item.city).HasMaxLength(100);
            entity.Property(item => item.image_url).HasMaxLength(255);
            entity.Property(item => item.opening_hours).HasMaxLength(100);
            entity.Property(item => item.ticket_price).HasPrecision(10, 2);
            entity.HasOne(item => item.category)
                .WithMany(item => item.spots)
                .HasForeignKey(item => item.category_id)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(item => item.creator)
                .WithMany(item => item.spots_created)
                .HasForeignKey(item => item.created_by)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureFavorite(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Favorite>(entity =>
        {
            entity.ToTable("favorites");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => new { item.user_id, item.spot_id }).IsUnique();
            entity.HasIndex(item => item.user_id);
            entity.HasIndex(item => item.spot_id);
            entity.HasOne(item => item.user)
                .WithMany(item => item.favorites)
                .HasForeignKey(item => item.user_id)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.spot)
                .WithMany(item => item.favorites)
                .HasForeignKey(item => item.spot_id)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureReview(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("reviews");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => new { item.user_id, item.spot_id }).IsUnique();
            entity.HasIndex(item => item.user_id);
            entity.HasIndex(item => item.spot_id);
            entity.HasOne(item => item.user)
                .WithMany(item => item.reviews)
                .HasForeignKey(item => item.user_id)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.spot)
                .WithMany(item => item.reviews)
                .HasForeignKey(item => item.spot_id)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureSpotImage(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SpotImage>(entity =>
        {
            entity.ToTable("spot_images");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.spot_id);
            entity.Property(item => item.image_url).HasMaxLength(255);
            entity.HasOne(item => item.spot)
                .WithMany(item => item.images)
                .HasForeignKey(item => item.spot_id)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureSpotPackage(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SpotPackage>(entity =>
        {
            entity.ToTable("spot_packages");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.spot_id);
            entity.Property(item => item.name).HasMaxLength(150);
            entity.Property(item => item.price).HasPrecision(10, 2);
            entity.Property(item => item.meeting_point).HasMaxLength(255);
            entity.Property(item => item.pickup_note).HasMaxLength(255);
            entity.Property(item => item.pickup_area).HasMaxLength(255);
            entity.HasOne(item => item.spot)
                .WithMany(item => item.packages)
                .HasForeignKey(item => item.spot_id)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureSpotRoom(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SpotRoom>(entity =>
        {
            entity.ToTable("spot_rooms");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.spot_id);
            entity.Property(item => item.name).HasMaxLength(150);
            entity.Property(item => item.price).HasPrecision(10, 2);
            entity.HasOne(item => item.spot)
                .WithMany(item => item.rooms)
                .HasForeignKey(item => item.spot_id)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureSpotDeparture(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SpotDeparture>(entity =>
        {
            entity.ToTable("spot_departures");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.spot_id);
            entity.HasIndex(item => item.start_time);
            entity.Property(item => item.label).HasMaxLength(120);
            entity.Property(item => item.confirmation_type).HasConversion<string>();
            entity.HasOne(item => item.spot)
                .WithMany(item => item.departures)
                .HasForeignKey(item => item.spot_id)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }

    private static void ConfigureBooking(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Booking>(entity =>
        {
            entity.ToTable("bookings");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.user_id);
            entity.HasIndex(item => item.spot_id);
            entity.HasIndex(item => item.package_id);
            entity.HasIndex(item => item.room_id);
            entity.HasIndex(item => item.departure_id);
            entity.HasIndex(item => item.booking_code).IsUnique();
            entity.HasIndex(item => item.ticket_code).IsUnique();
            entity.Property(item => item.subtotal_price).HasPrecision(12, 2);
            entity.Property(item => item.discount_amount).HasPrecision(12, 2);
            entity.Property(item => item.total_price).HasPrecision(12, 2);
            entity.Property(item => item.refund_amount).HasPrecision(12, 2);
            entity.Property(item => item.status).HasConversion<string>();
            entity.Property(item => item.payment_method).HasConversion<string>();
            entity.Property(item => item.confirmation_type).HasConversion<string>();
            entity.Property(item => item.booking_code).HasMaxLength(40);
            entity.Property(item => item.ticket_code).HasMaxLength(60);
            entity.Property(item => item.qr_value).HasMaxLength(120);
            entity.Property(item => item.pickup_address).HasMaxLength(255);
            entity.Property(item => item.meeting_point_snapshot).HasMaxLength(255);
            entity.HasOne(item => item.user)
                .WithMany(item => item.bookings)
                .HasForeignKey(item => item.user_id)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(item => item.spot)
                .WithMany(item => item.bookings)
                .HasForeignKey(item => item.spot_id)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(item => item.package)
                .WithMany(item => item.bookings)
                .HasForeignKey(item => item.package_id)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(item => item.room)
                .WithMany(item => item.bookings)
                .HasForeignKey(item => item.room_id)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(item => item.departure)
                .WithMany(item => item.bookings)
                .HasForeignKey(item => item.departure_id)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigurePayment(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");
            entity.HasKey(item => item.id);
            entity.HasIndex(item => item.booking_id).IsUnique();
            entity.HasIndex(item => item.transaction_code).IsUnique();
            entity.Property(item => item.amount).HasPrecision(12, 2);
            entity.Property(item => item.method).HasConversion<string>();
            entity.Property(item => item.status).HasConversion<string>();
            entity.Property(item => item.transaction_code).HasMaxLength(80);
            entity.HasOne(item => item.booking)
                .WithOne(item => item.payment)
                .HasForeignKey<Payment>(item => item.booking_id)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
