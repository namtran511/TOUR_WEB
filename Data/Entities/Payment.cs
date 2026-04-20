namespace TravelSpotFinder.Api.Data.Entities;

public sealed class Payment
{
    public int id { get; set; }
    public int booking_id { get; set; }
    public decimal amount { get; set; }
    public PaymentMethod method { get; set; }
    public PaymentStatus status { get; set; } = PaymentStatus.UNPAID;
    public DateTime? due_at { get; set; }
    public DateTime? paid_at { get; set; }
    public DateTime? refunded_at { get; set; }
    public string? transaction_code { get; set; }
    public DateTime created_at { get; set; }
    public DateTime updated_at { get; set; }

    public Booking? booking { get; set; }
}
