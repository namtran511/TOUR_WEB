namespace TravelSpotFinder.Api.Data.Entities;

public sealed class Voucher
{
    public int id { get; set; }
    public string code { get; set; } = string.Empty;
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public VoucherType type { get; set; }
    public decimal value { get; set; }
    public decimal? max_discount { get; set; }
    public decimal? min_booking_amount { get; set; }
    public int? usage_limit { get; set; }
    public int used_count { get; set; }
    public DateTime? expires_at { get; set; }
    public bool is_active { get; set; } = true;
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public List<Booking> bookings { get; set; } = [];
}
