namespace TravelSpotFinder.Api.Data.Entities;

public sealed class Category
{
    public int id { get; set; }
    public string name { get; set; } = string.Empty;
    public string? description { get; set; }
    public string? icon { get; set; }
    public DateTime created_at { get; set; }

    public List<Spot> spots { get; set; } = [];
}
