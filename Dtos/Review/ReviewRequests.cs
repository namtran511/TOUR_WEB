using System.ComponentModel.DataAnnotations;

namespace TravelSpotFinder.Api.Dtos.Review;

public sealed class create_review_request
{
    [Range(1, 5)]
    public int rating { get; set; }

    [StringLength(2000)]
    public string? comment { get; set; }
}

public sealed class update_review_request : IValidatableObject
{
    [Range(1, 5)]
    public int? rating { get; set; }

    [StringLength(2000)]
    public string? comment { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (rating is null && comment is null)
        {
            yield return new ValidationResult("At least one field is required");
        }
    }
}
