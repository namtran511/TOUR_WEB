using System.ComponentModel.DataAnnotations;

namespace TravelSpotFinder.Api.Dtos.Search;

public sealed class create_search_history_request : IValidatableObject
{
    [StringLength(150)]
    public string? keyword { get; set; }

    [Range(-90, 90)]
    public double? latitude { get; set; }

    [Range(-180, 180)]
    public double? longitude { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var hasKeyword = !string.IsNullOrWhiteSpace(keyword);
        var hasCoordinates = latitude.HasValue && longitude.HasValue;

        if (!hasKeyword && !hasCoordinates)
        {
            yield return new ValidationResult("keyword or (latitude, longitude) is required", new[] { nameof(keyword) });
        }
    }
}
