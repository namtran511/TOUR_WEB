namespace TravelSpotFinder.Api.Data.Entities;

public sealed class SearchHistory
{
    public int id { get; set; }
    public int user_id { get; set; }
    public string? keyword { get; set; }
    public double? latitude { get; set; }
    public double? longitude { get; set; }
    public DateTime searched_at { get; set; }

    public User? user { get; set; }
}
