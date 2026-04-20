namespace TravelSpotFinder.Api.Data.Entities;

public sealed class SpotDeparture
{
    public int id { get; set; }
    public int spot_id { get; set; }
    public string label { get; set; } = string.Empty;
    public DateTime start_time { get; set; }
    public DateTime end_time { get; set; }
    public int capacity { get; set; }
    public int booked_count { get; set; }
    public ConfirmationType confirmation_type { get; set; } = ConfirmationType.MANUAL;
    public bool is_active { get; set; } = true;
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public Spot? spot { get; set; }
    public List<Booking> bookings { get; set; } = [];
}
