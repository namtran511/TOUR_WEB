using System.Net.Http.Json;
using System.Text.Json;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Configuration;
using TravelSpotFinder.Api.Dtos.Map;

namespace TravelSpotFinder.Api.Services;

public sealed class MapService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ApplicationSettings _settings;

    public MapService(IHttpClientFactory httpClientFactory, ApplicationSettings settings)
    {
        _httpClientFactory = httpClientFactory;
        _settings = settings;
    }

    public async Task<object> GetDirectionsAsync(directions_query query, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_settings.mapbox_access_token))
        {
            throw new ApiException("Mapbox access token is not configured", StatusCodes.Status500InternalServerError);
        }

        var profile = string.IsNullOrWhiteSpace(query.profile) ? "driving" : query.profile.Trim();
        var coordinates = $"{query.origin_lng},{query.origin_lat};{query.destination_lng},{query.destination_lat}";
        var url = $"https://api.mapbox.com/directions/v5/mapbox/{profile}/{coordinates}" +
                  $"?geometries=geojson&overview=full&steps=false&access_token={Uri.EscapeDataString(_settings.mapbox_access_token)}";

        var client = _httpClientFactory.CreateClient();
        client.Timeout = TimeSpan.FromSeconds(15);

        using var response = await client.GetAsync(url, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            try
            {
                using var document = JsonDocument.Parse(body);
                var message = document.RootElement.TryGetProperty("message", out var messageElement)
                    ? messageElement.GetString()
                    : document.RootElement.TryGetProperty("error", out var errorElement)
                        ? errorElement.GetString()
                        : null;

                throw new ApiException(message ?? "Mapbox request failed", (int)response.StatusCode);
            }
            catch (JsonException)
            {
                throw new ApiException("Mapbox request failed", (int)response.StatusCode);
            }
        }

        using var payload = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
        var route = payload?.RootElement.GetProperty("routes")[0];
        if (route is null || route.Value.ValueKind == JsonValueKind.Undefined)
        {
            throw new ApiException("Route not found", StatusCodes.Status404NotFound);
        }

        return new
        {
            distance_meters = route.Value.GetProperty("distance").GetDouble(),
            duration_seconds = route.Value.GetProperty("duration").GetDouble(),
            geometry = route.Value.GetProperty("geometry"),
            legs = route.Value.TryGetProperty("legs", out var legs) ? legs : default(JsonElement)
        };
    }
}
