using Microsoft.Data.SqlClient;

namespace TravelSpotFinder.Api.Configuration;

public static class DatabaseUrlParser
{
    public static string ToSqlServerConnectionString(string databaseUrl)
    {
        if (string.IsNullOrWhiteSpace(databaseUrl))
        {
            throw new InvalidOperationException("DATABASE_URL is missing.");
        }

        var cleaned = databaseUrl.Trim().Trim('"');

        if (cleaned.Contains("server=", StringComparison.OrdinalIgnoreCase) ||
            cleaned.Contains("data source=", StringComparison.OrdinalIgnoreCase))
        {
            var existing = new SqlConnectionStringBuilder(cleaned);
            if (!existing.Encrypt)
            {
                existing.TrustServerCertificate = true;
            }
            return existing.ConnectionString;
        }

        if (!Uri.TryCreate(cleaned, UriKind.Absolute, out var uri))
        {
            return cleaned;
        }

        var credentials = uri.UserInfo.Split(':', 2, StringSplitOptions.TrimEntries);
        var host = uri.Host;
        var port = uri.Port > 0 ? uri.Port : 1433;
        var server = port == 1433 ? host : $"{host},{port}";

        var builder = new SqlConnectionStringBuilder
        {
            DataSource = server,
            InitialCatalog = uri.AbsolutePath.Trim('/'),
            TrustServerCertificate = true
        };

        var user = credentials.ElementAtOrDefault(0);
        var password = credentials.Length > 1 ? Uri.UnescapeDataString(credentials[1]) : string.Empty;

        if (!string.IsNullOrWhiteSpace(user))
        {
            builder.UserID = user;
            builder.Password = password;
        }
        else
        {
            builder.IntegratedSecurity = true;
        }

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

                if (key.Equals("encrypt", StringComparison.OrdinalIgnoreCase) &&
                    bool.TryParse(value, out var encrypt))
                {
                    builder.Encrypt = encrypt;
                }
                else if (key.Equals("trustservercertificate", StringComparison.OrdinalIgnoreCase) &&
                         bool.TryParse(value, out var trust))
                {
                    builder.TrustServerCertificate = trust;
                }
                else if (key.Equals("integratedsecurity", StringComparison.OrdinalIgnoreCase) &&
                         bool.TryParse(value, out var integrated))
                {
                    builder.IntegratedSecurity = integrated;
                }
            }
        }

        return builder.ConnectionString;
    }
}
