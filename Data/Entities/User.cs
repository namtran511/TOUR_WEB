namespace TravelSpotFinder.Api.Data.Entities;

public sealed class User
{
    public int id { get; set; }
    public string full_name { get; set; } = string.Empty;
    public string email { get; set; } = string.Empty;
    public string password_hash { get; set; } = string.Empty;
    public UserRole role { get; set; } = UserRole.USER;
    public string? avatar_url { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public List<Spot> spots_created { get; set; } = [];
    public List<Favorite> favorites { get; set; } = [];
    public List<Review> reviews { get; set; } = [];
    public List<Booking> bookings { get; set; } = [];
}
