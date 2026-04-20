using TravelSpotFinder.Api.Data.Entities;

namespace TravelSpotFinder.Api.Services;

public static class ResponseMapper
{
    public static object MapUser(User user)
        => new
        {
            user.id,
            user.full_name,
            user.email,
            user.role,
            user.avatar_url,
            user.created_at,
            user.updated_at
        };

    public static object MapUserSummary(User user)
        => new
        {
            user.id,
            user.full_name,
            user.email,
            user.role,
            user.avatar_url
        };

    public static object MapCategory(Category category, int? spotsCount = null)
        => new
        {
            category.id,
            category.name,
            category.description,
            category.icon,
            category.created_at,
            _count = spotsCount.HasValue ? new { spots = spotsCount.Value } : null
        };

    public static object MapSpotImage(SpotImage image)
        => new
        {
            image.id,
            image.spot_id,
            image.image_url,
            image.is_primary
        };

    public static object MapSpotPackage(SpotPackage package)
        => new
        {
            package.id,
            package.spot_id,
            package.name,
            package.description,
            package.price,
            package.duration_minutes,
            package.meeting_point,
            package.pickup_included,
            package.pickup_note,
            package.pickup_area,
            package.free_cancel_before_hours,
            package.refund_percent_before,
            package.refund_percent_after,
            package.created_at,
            package.updated_at
        };

    public static object MapSpotRoom(SpotRoom room)
        => new
        {
            room.id,
            room.spot_id,
            room.name,
            room.description,
            room.price,
            room.quantity,
            room.free_cancel_before_hours,
            room.refund_percent_before,
            room.refund_percent_after,
            room.created_at,
            room.updated_at
        };

    public static object MapSpotDeparture(SpotDeparture departure)
        => new
        {
            departure.id,
            departure.spot_id,
            departure.label,
            departure.start_time,
            departure.end_time,
            departure.capacity,
            departure.booked_count,
            departure.confirmation_type,
            departure.is_active,
            departure.created_at,
            departure.updated_at
        };

    public static object MapVoucher(Voucher voucher)
        => new
        {
            voucher.id,
            voucher.code,
            voucher.name,
            voucher.description,
            voucher.type,
            voucher.value,
            voucher.max_discount,
            voucher.min_booking_amount,
            voucher.usage_limit,
            voucher.used_count,
            voucher.expires_at,
            voucher.is_active,
            voucher.created_at,
            voucher.updated_at
        };

    public static object MapPayment(Payment payment)
        => new
        {
            payment.id,
            payment.booking_id,
            payment.amount,
            payment.method,
            payment.status,
            payment.due_at,
            payment.paid_at,
            payment.refunded_at,
            payment.transaction_code,
            payment.created_at,
            payment.updated_at
        };

    public static object MapReview(Review review, string? tripDuration = null)
        => new
        {
            review.id,
            review.user_id,
            review.spot_id,
            review.rating,
            review.comment,
            review.created_at,
            review.updated_at,
            user = review.user is null
                ? null
                : new
                {
                    review.user.id,
                    review.user.full_name,
                    review.user.avatar_url,
                    review.user.role
                },
            trip_duration = tripDuration
        };

    public static object MapSpot(Spot spot, bool includeReviews = false)
        => new
        {
            spot.id,
            spot.name,
            spot.description,
            spot.address,
            spot.city,
            spot.latitude,
            spot.longitude,
            spot.category_id,
            spot.image_url,
            spot.opening_hours,
            spot.ticket_price,
            spot.average_rating,
            spot.created_by,
            spot.created_at,
            spot.updated_at,
            category = spot.category is null ? null : MapCategory(spot.category),
            packages = spot.packages.OrderBy(item => item.id).Select(MapSpotPackage).ToList(),
            rooms = spot.rooms.OrderBy(item => item.id).Select(MapSpotRoom).ToList(),
            departures = spot.departures.OrderBy(item => item.start_time).Select(MapSpotDeparture).ToList(),
            creator = spot.creator is null ? null : new
            {
                spot.creator.id,
                spot.creator.full_name,
                spot.creator.email,
                spot.creator.role
            },
            images = spot.images.OrderByDescending(item => item.is_primary).ThenBy(item => item.id).Select(MapSpotImage).ToList(),
            _count = new
            {
                favorites = spot.favorites.Count,
                reviews = spot.reviews.Count
            },
            reviews = includeReviews
                ? spot.reviews
                    .OrderByDescending(item => item.created_at)
                    .Select(review => new
                    {
                        review.id,
                        review.user_id,
                        review.spot_id,
                        review.rating,
                        review.comment,
                        review.created_at,
                        review.updated_at,
                        user = review.user is null ? null : new
                        {
                            review.user.id,
                            review.user.full_name,
                            review.user.avatar_url
                        }
                    })
                    .ToList()
                : null
        };

    public static object MapNearbySpot(Spot spot, double distanceKm)
        => new
        {
            spot.id,
            spot.name,
            spot.description,
            spot.address,
            spot.city,
            spot.latitude,
            spot.longitude,
            spot.category_id,
            spot.image_url,
            spot.opening_hours,
            spot.ticket_price,
            spot.average_rating,
            spot.created_by,
            spot.created_at,
            spot.updated_at,
            distance_km = distanceKm,
            category = spot.category is null ? null : MapCategory(spot.category),
            packages = spot.packages.OrderBy(item => item.id).Select(MapSpotPackage).ToList(),
            rooms = spot.rooms.OrderBy(item => item.id).Select(MapSpotRoom).ToList(),
            departures = spot.departures.OrderBy(item => item.start_time).Select(MapSpotDeparture).ToList(),
            creator = spot.creator is null ? null : new
            {
                spot.creator.id,
                spot.creator.full_name,
                spot.creator.email,
                spot.creator.role
            },
            images = spot.images.OrderByDescending(item => item.is_primary).ThenBy(item => item.id).Select(MapSpotImage).ToList(),
            _count = new
            {
                favorites = spot.favorites.Count,
                reviews = spot.reviews.Count
            }
        };

    public static object MapFavorite(Favorite favorite)
        => new
        {
            favorite.id,
            favorite.user_id,
            favorite.spot_id,
            favorite.created_at,
            spot = favorite.spot is null ? null : MapSpot(favorite.spot)
        };

    public static object MapBooking(Booking booking, bool includeUser = false)
        => new
        {
            booking.id,
            booking.user_id,
            booking.spot_id,
            booking.package_id,
            booking.room_id,
            booking.departure_id,
            booking.voucher_id,
            booking.date,
            booking.end_date,
            booking.guests,
            booking.tour_days,
            booking.room_count,
            booking.subtotal_price,
            booking.discount_amount,
            booking.total_price,
            booking.refund_amount,
            booking.status,
            booking.payment_method,
            booking.confirmation_type,
            booking.expires_at,
            booking.confirmed_at,
            booking.cancelled_at,
            booking.rejection_reason,
            booking.cancellation_reason,
            booking.notes,
            booking.booking_code,
            booking.ticket_code,
            booking.qr_value,
            booking.pickup_requested,
            booking.pickup_address,
            booking.meeting_point_snapshot,
            booking.created_at,
            booking.updated_at,
            spot = booking.spot is null ? null : new
            {
                booking.spot.id,
                booking.spot.name,
                booking.spot.city,
                booking.spot.address,
                booking.spot.image_url
            },
            package = booking.package is null ? null : MapSpotPackage(booking.package),
            room = booking.room is null ? null : MapSpotRoom(booking.room),
            departure = booking.departure is null ? null : MapSpotDeparture(booking.departure),
            voucher = booking.voucher is null ? null : MapVoucher(booking.voucher),
            payment = booking.payment is null ? null : MapPayment(booking.payment),
            user = includeUser && booking.user is not null
                ? new
                {
                    booking.user.id,
                    booking.user.full_name,
                    booking.user.email
                }
                : null
        };

    public static object MapTicket(Booking booking)
        => new
        {
            booking_id = booking.id,
            booking_code = booking.booking_code,
            ticket_code = booking.ticket_code,
            qr_value = booking.qr_value,
            booking.status,
            booking.tour_days,
            booking.end_date,
            traveler = booking.user?.full_name,
            spot = booking.spot?.name,
            departure = booking.departure is null ? null : MapSpotDeparture(booking.departure),
            meeting_point = booking.meeting_point_snapshot,
            booking.pickup_requested,
            booking.pickup_address,
            payment_status = booking.payment?.status
        };
}
