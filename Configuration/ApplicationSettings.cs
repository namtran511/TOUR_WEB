namespace TravelSpotFinder.Api.Configuration;

public sealed class ApplicationSettings
{
    public int port { get; init; } = 5000;
    public string database_url { get; init; } = string.Empty;
    public string jwt_secret { get; init; } = "change_me_in_real_env";
    public string mapbox_access_token { get; init; } = string.Empty;
    public string app_base_url { get; init; } = "http://localhost:5000";
    public string client_base_url { get; init; } = "http://localhost:5173";
    public string vnpay_tmn_code { get; init; } = "SIMULATOR";
    public string vnpay_hash_secret { get; init; } = string.Empty;
    public string vnpay_return_url { get; init; } = "http://localhost:5000/api/payments/vnpay/return";

    public static ApplicationSettings From(IConfiguration configuration)
    {
        var port = configuration.GetValue<int?>("PORT") ?? 5000;
        var fallbackAppBase = $"http://localhost:{port}";

        string NormalizeUrl(string? value, string fallback)
        {
            if (string.IsNullOrWhiteSpace(value) || value.Contains("YOUR_PUBLIC_BACKEND_DOMAIN", StringComparison.OrdinalIgnoreCase))
            {
                return fallback;
            }

            return value.TrimEnd('/');
        }

        var appBaseUrl = NormalizeUrl(configuration["APP_BASE_URL"], fallbackAppBase);

        return new ApplicationSettings
        {
            port = port,
            database_url = configuration["DATABASE_URL"] ?? string.Empty,
            jwt_secret = configuration["JWT_SECRET"] ?? "change_me_in_real_env",
            mapbox_access_token = configuration["MAPBOX_ACCESS_TOKEN"] ?? string.Empty,
            app_base_url = appBaseUrl,
            client_base_url = NormalizeUrl(configuration["CLIENT_BASE_URL"], "http://localhost:5173"),
            vnpay_tmn_code = configuration["VNPAY_TMN_CODE"] ?? "SIMULATOR",
            vnpay_hash_secret = configuration["VNPAY_HASH_SECRET"] ?? string.Empty,
            vnpay_return_url = NormalizeUrl(configuration["VNPAY_RETURN_URL"], $"{appBaseUrl}/api/payments/vnpay/return")
        };
    }
}
