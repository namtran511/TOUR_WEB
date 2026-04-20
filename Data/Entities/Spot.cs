namespace TravelSpotFinder.Api.Data.Entities;

public sealed class Spot
{
    public int id { get; set; }
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public string address { get; set; } = string.Empty;
    public string city { get; set; } = string.Empty;
    public double latitude { get; set; }
    public double longitude { get; set; }
    public int category_id { get; set; }
    public string? image_url { get; set; }
    public string? opening_hours { get; set; }
    public decimal? ticket_price { get; set; }
    public double average_rating { get; set; }
    public int created_by { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public Category? category { get; set; }
    public User? creator { get; set; }
    public List<Favorite> favorites { get; set; } = [];
    public List<Review> reviews { get; set; } = [];
    public List<SpotImage> images { get; set; } = [];
    public List<Booking> bookings { get; set; } = [];
    public List<SpotPackage> packages { get; set; } = [];
    public List<SpotRoom> rooms { get; set; } = [];
    public List<SpotDeparture> departures { get; set; } = [];
}
