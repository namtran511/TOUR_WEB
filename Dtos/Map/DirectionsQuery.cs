using System.ComponentModel.DataAnnotations;

namespace TravelSpotFinder.Api.Dtos.Map;

public sealed class directions_query
{
    [Range(-90d, 90d)]
    public double origin_lat { get; set; }

    [Range(-180d, 180d)]
    public double origin_lng { get; set; }

    [Range(-90d, 90d)]
    public double destination_lat { get; set; }

    [Range(-180d, 180d)]
    public double destination_lng { get; set; }

    [RegularExpression("^(driving|walking|cycling)?$")]
    public string? profile { get; set; }
}
