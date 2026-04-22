namespace TravelSpotFinder.Api.Data.Entities;

public enum UserRole
{
    USER,
    ADMIN
}

public enum BookingStatus
{
    PENDING,
    ACCEPTED,
    REJECTED,
    COMPLETED,
    CANCELLED,
    NO_SHOW
}

public enum ConfirmationType
{
    INSTANT,
    MANUAL
}

public enum PaymentMethod
{
    PAY_NOW,
    PAY_LATER,
    PAY_AT_DESTINATION
}

public enum PaymentStatus
{
    UNPAID,
    PENDING,
    PAID,
    FAILED,
    REFUNDED,
    PARTIALLY_REFUNDED
}
