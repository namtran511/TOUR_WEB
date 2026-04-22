using System.ComponentModel.DataAnnotations;
using TravelSpotFinder.Api.Data.Entities;

namespace TravelSpotFinder.Api.Dtos.Booking;

public sealed class create_booking_request : IValidatableObject
{
    [Required]
    [Range(1, int.MaxValue)]
    public int? spot_id { get; set; }

    [Required]
    [Range(1, int.MaxValue)]
    public int? departure_id { get; set; }

    [Range(1, int.MaxValue)]
    public int? package_id { get; set; }

    [Range(1, int.MaxValue)]
    public int? room_id { get; set; }

    public DateTime? end_date { get; set; }

    [Range(1, 50)]
    public int? guests { get; set; }

    [Range(1, 30)]
    public int? tour_days { get; set; }

    [Range(1, 20)]
    public int? room_count { get; set; }

    public string? notes { get; set; }

    public PaymentMethod? payment_method { get; set; }

    public bool? pickup_requested { get; set; }

    [StringLength(255)]
    public string? pickup_address { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (package_id is null && room_id is null)
        {
            yield return new ValidationResult("At least one package or room must be selected");
        }
    }
}

public sealed class update_booking_status_request
{
    [Required]
    public BookingStatus? status { get; set; }
}

public sealed class pay_booking_request
{
    [StringLength(80)]
    public string? transaction_code { get; set; }
}

public sealed class cancel_booking_request
{
    [StringLength(500)]
    public string? reason { get; set; }
}
