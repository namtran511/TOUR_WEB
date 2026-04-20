using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace TravelSpotFinder.Api.Common.Json;

public sealed class NullableUtcDateTimeJsonConverter : JsonConverter<DateTime?>
{
    public override DateTime? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null)
        {
            return null;
        }

        var raw = reader.GetString();
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }

        if (DateTime.TryParse(
                raw,
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind | DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var parsed))
        {
            return DateTimeHelpers.EnsureUtc(parsed);
        }

        return DateTimeHelpers.EnsureUtc(DateTime.Parse(raw, CultureInfo.InvariantCulture));
    }

    public override void Write(Utf8JsonWriter writer, DateTime? value, JsonSerializerOptions options)
    {
        if (!value.HasValue)
        {
            writer.WriteNullValue();
            return;
        }

        writer.WriteStringValue(DateTimeHelpers.EnsureUtc(value.Value).ToString("O"));
    }
}
