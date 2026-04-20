namespace TravelSpotFinder.Api.Common;

public sealed class ApiEnvelope
{
    public string status { get; init; } = string.Empty;
    public string message { get; init; } = string.Empty;
    public object? data { get; init; }

    public static ApiEnvelope Success(string message, object? data = null)
        => new()
        {
            status = "success",
            message = message,
            data = data
        };

    public static ApiEnvelope Error(string message, object? data = null)
        => new()
        {
            status = "error",
            message = message,
            data = data
        };
}
