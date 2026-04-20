using System.ComponentModel.DataAnnotations;
using TravelSpotFinder.Api.Data.Entities;

namespace TravelSpotFinder.Api.Dtos.Spot;

public sealed class spot_package_request
{
    public int? id { get; set; }

    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string name { get; set; } = string.Empty;

    public string? description { get; set; }

    [Range(0, double.MaxValue)]
    public decimal price { get; set; }

    [Range(1, int.MaxValue)]
    public int? duration_minutes { get; set; }

    [StringLength(255)]
    public string? meeting_point { get; set; }

    public bool? pickup_included { get; set; }

    [StringLength(255)]
    public string? pickup_note { get; set; }

    [StringLength(255)]
    public string? pickup_area { get; set; }

    [Range(0, int.MaxValue)]
    public int? free_cancel_before_hours { get; set; }

    [Range(0, 100)]
    public int? refund_percent_before { get; set; }

    [Range(0, 100)]
    public int? refund_percent_after { get; set; }
}

public sealed class spot_room_request
{
    public int? id { get; set; }

    [Required]
    [StringLength(150, MinimumLength = 1)]
    public string name { get; set; } = string.Empty;

    public string? description { get; set; }

    [Range(0, double.MaxValue)]
    public decimal price { get; set; }

    [Range(0, int.MaxValue)]
    public int quantity { get; set; }

    [Range(0, int.MaxValue)]
    public int? free_cancel_before_hours { get; set; }

    [Range(0, 100)]
    public int? refund_percent_before { get; set; }

    [Range(0, 100)]
    public int? refund_percent_after { get; set; }
}

public sealed class spot_departure_request : IValidatableObject
{
    public int? id { get; set; }

    [Required]
    [StringLength(120, MinimumLength = 1)]
    public string label { get; set; } = string.Empty;

    [Required]
    public DateTime? start_time { get; set; }

    [Required]
    public DateTime? end_time { get; set; }

    [Range(1, int.MaxValue)]
    public int capacity { get; set; }

    public ConfirmationType? confirmation_type { get; set; }

    public bool? is_active { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (start_time.HasValue && end_time.HasValue && end_time.Value <= start_time.Value)
        {
            yield return new ValidationResult("Departure end time must be later than start time");
        }
    }
}

public sealed class create_spot_request
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string name { get; set; } = string.Empty;

    [StringLength(3000)]
    public string? description { get; set; }

    [Required]
    [StringLength(255, MinimumLength = 3)]
    public string address { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string city { get; set; } = string.Empty;

    [Range(-90d, 90d)]
    public double latitude { get; set; }

    [Range(-180d, 180d)]
    public double longitude { get; set; }

    [Range(1, int.MaxValue)]
    public int category_id { get; set; }

    [StringLength(255)]
    public string? image_url { get; set; }

    [StringLength(100)]
    public string? opening_hours { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? ticket_price { get; set; }

    [Range(0d, 5d)]
    public double? average_rating { get; set; }

    public List<spot_package_request>? packages { get; set; }
    public List<spot_room_request>? rooms { get; set; }
    public List<spot_departure_request>? departures { get; set; }
}

public sealed class update_spot_request : IValidatableObject
{
    [StringLength(150, MinimumLength = 2)]
    public string? name { get; set; }

    [StringLength(3000)]
    public string? description { get; set; }

    [StringLength(255, MinimumLength = 3)]
    public string? address { get; set; }

    [StringLength(100, MinimumLength = 2)]
    public string? city { get; set; }

    [Range(-90d, 90d)]
    public double? latitude { get; set; }

    [Range(-180d, 180d)]
    public double? longitude { get; set; }

    [Range(1, int.MaxValue)]
    public int? category_id { get; set; }

    [StringLength(255)]
    public string? image_url { get; set; }

    [StringLength(100)]
    public string? opening_hours { get; set; }

    [Range(0, double.MaxValue)]
    public decimal? ticket_price { get; set; }

    [Range(0d, 5d)]
    public double? average_rating { get; set; }

    public List<spot_package_request>? packages { get; set; }
    public List<spot_room_request>? rooms { get; set; }
    public List<spot_departure_request>? departures { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (name is null &&
            description is null &&
            address is null &&
            city is null &&
            latitude is null &&
            longitude is null &&
            category_id is null &&
            image_url is null &&
            opening_hours is null &&
            ticket_price is null &&
            average_rating is null &&
            packages is null &&
            rooms is null &&
            departures is null)
        {
            yield return new ValidationResult("At least one field is required");
        }
    }
}
