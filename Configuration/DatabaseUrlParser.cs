using MySqlConnector;

namespace TravelSpotFinder.Api.Configuration;

public static class DatabaseUrlParser
{
    public static string ToMySqlConnectionString(string databaseUrl)
    {
        if (string.IsNullOrWhiteSpace(databaseUrl))
        {
            throw new InvalidOperationException("DATABASE_URL is missing.");
        }

        var cleaned = databaseUrl.Trim().Trim('"');
        if (cleaned.Contains("server=", StringComparison.OrdinalIgnoreCase))
        {
            return cleaned;
        }

        if (!Uri.TryCreate(cleaned, UriKind.Absolute, out var uri))
        {
            return cleaned;
        }

        var credentials = uri.UserInfo.Split(':', 2, StringSplitOptions.TrimEntries);
        var builder = new MySqlConnectionStringBuilder
        {
            Server = uri.Host,
            Port = (uint)(uri.Port > 0 ? uri.Port : 3306),
            Database = uri.AbsolutePath.Trim('/'),
            UserID = credentials.ElementAtOrDefault(0) ?? string.Empty,
            Password = credentials.Length > 1 ? Uri.UnescapeDataString(credentials[1]) : string.Empty,
            AllowUserVariables = true
        };

        if (!string.IsNullOrWhiteSpace(uri.Query))
        {
            var query = uri.Query.TrimStart('?')
                .Split('&', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            foreach (var item in query)
            {
                var parts = item.Split('=', 2);
                if (parts.Length != 2)
                {
                    continue;
                }

                var key = Uri.UnescapeDataString(parts[0]);
                var value = Uri.UnescapeDataString(parts[1]);

                if (key.Equals("sslmode", StringComparison.OrdinalIgnoreCase) &&
                    Enum.TryParse<MySqlSslMode>(value, true, out var sslMode))
                {
                    builder.SslMode = sslMode;
                }
            }
        }

        return builder.ConnectionString;
    }
}
