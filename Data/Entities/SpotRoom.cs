namespace TravelSpotFinder.Api.Data.Entities;

public sealed class SpotRoom
{
    public int id { get; set; }
    public int spot_id { get; set; }
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public decimal price { get; set; }
    public int quantity { get; set; }
    public int free_cancel_before_hours { get; set; }
    public int refund_percent_before { get; set; }
    public int refund_percent_after { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public Spot? spot { get; set; }
    public List<Booking> bookings { get; set; } = [];
}
