using System.ComponentModel.DataAnnotations;

namespace TravelSpotFinder.Api.Dtos.Category;

public sealed class create_category_request
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string name { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? description { get; set; }

    [StringLength(255)]
    public string? icon { get; set; }
}

public sealed class update_category_request : IValidatableObject
{
    [StringLength(100, MinimumLength = 2)]
    public string? name { get; set; }

    [StringLength(1000)]
    public string? description { get; set; }

    [StringLength(255)]
    public string? icon { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (name is null && description is null && icon is null)
        {
            yield return new ValidationResult("At least one field is required");
        }
    }
}
