namespace TravelSpotFinder.Api.Common;

public sealed class ApiException : Exception
{
    public int status_code { get; }

    public ApiException(string message, int statusCode = StatusCodes.Status400BadRequest)
        : base(message)
    {
        status_code = statusCode;
    }
}
