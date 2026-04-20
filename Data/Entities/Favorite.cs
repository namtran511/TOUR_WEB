namespace TravelSpotFinder.Api.Data.Entities;

public sealed class Favorite
{
    public int id { get; set; }
    public int user_id { get; set; }
    public int spot_id { get; set; }
    public DateTime created_at { get; set; }

    public User? user { get; set; }
    public Spot? spot { get; set; }
}
