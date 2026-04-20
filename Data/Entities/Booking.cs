namespace TravelSpotFinder.Api.Data.Entities;

public sealed class Booking
{
    public int id { get; set; }
    public int user_id { get; set; }
    public int spot_id { get; set; }
    public int? package_id { get; set; }
    public int? room_id { get; set; }
    public int? departure_id { get; set; }
    public int? voucher_id { get; set; }
    public DateTime date { get; set; }
    public DateTime end_date { get; set; }
    public int guests { get; set; } = 1;
    public int tour_days { get; set; } = 1;
    public int room_count { get; set; } = 1;
    public decimal? subtotal_price { get; set; }
    public decimal? discount_amount { get; set; }
    public decimal? total_price { get; set; }
    public decimal? refund_amount { get; set; }
    public BookingStatus status { get; set; } = BookingStatus.PENDING;
    public PaymentMethod payment_method { get; set; } = PaymentMethod.PAY_NOW;
    public ConfirmationType confirmation_type { get; set; } = ConfirmationType.MANUAL;
    public DateTime? expires_at { get; set; }
    public DateTime? confirmed_at { get; set; }
    public DateTime? cancelled_at { get; set; }
    public string? rejection_reason { get; set; }
    public string? cancellation_reason { get; set; }
    public string? notes { get; set; }
    public string booking_code { get; set; } = string.Empty;
    public string? ticket_code { get; set; }
    public string? qr_value { get; set; }
    public bool pickup_requested { get; set; }
    public string? pickup_address { get; set; }
    public string? meeting_point_snapshot { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public User? user { get; set; }
    public Spot? spot { get; set; }
    public SpotPackage? package { get; set; }
    public SpotRoom? room { get; set; }
    public SpotDeparture? departure { get; set; }
    public Voucher? voucher { get; set; }
    public Payment? payment { get; set; }
}
