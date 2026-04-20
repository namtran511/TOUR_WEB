namespace TravelSpotFinder.Api.Data.Entities;

public sealed class SpotImage
{
    public int id { get; set; }
    public int spot_id { get; set; }
    public string image_url { get; set; } = string.Empty;
    public bool is_primary { get; set; }

    public Spot? spot { get; set; }
}
