namespace TravelSpotFinder.Api.Common;

public static class DateTimeHelpers
{
    public static DateTime UtcNow() => DateTime.UtcNow;

    public static DateTime EnsureUtc(DateTime value)
        => value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

    public static DateTime? EnsureUtc(DateTime? value)
        => value.HasValue ? EnsureUtc(value.Value) : null;

    public static DateTime AddDays(DateTime value, int days)
        => EnsureUtc(value).AddDays(days);
}
