namespace TravelSpotFinder.Api.Data.Entities;

public sealed class SpotPackage
{
    public int id { get; set; }
    public int spot_id { get; set; }
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public decimal price { get; set; }
    public int? duration_minutes { get; set; }
    public string? meeting_point { get; set; }
    public bool pickup_included { get; set; }
    public string? pickup_note { get; set; }
    public string? pickup_area { get; set; }
    public int free_cancel_before_hours { get; set; }
    public int refund_percent_before { get; set; }
    public int refund_percent_after { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public Spot? spot { get; set; }
    public List<Booking> bookings { get; set; } = [];
}
