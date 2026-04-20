using Microsoft.Data.SqlClient;
using MySqlConnector;

var mysqlConn = "Server=localhost;Port=3306;Database=travel_spot_finder;User Id=travel_app;Password=travel123;AllowUserVariables=true;";
var sqlConn = "Server=localhost\\SQLEXPRESS;Database=travel_spot_finder;Trusted_Connection=True;TrustServerCertificate=True";

// Tables must be processed in FK dependency order.
// Note: columns listed here must match BOTH the MySQL source and the SQL Server target exactly.
var tables = new (string Name, string[] Columns)[]
{
    ("users",            new[] { "id", "full_name", "email", "password_hash", "role", "avatar_url", "created_at", "updated_at" }),
    ("categories",       new[] { "id", "name", "description", "icon", "created_at" }),
    ("spots",            new[] { "id", "name", "description", "address", "city", "latitude", "longitude", "category_id", "image_url", "opening_hours", "ticket_price", "average_rating", "created_by", "created_at", "updated_at" }),
    ("vouchers",         new[] { "id", "code", "name", "description", "type", "value", "max_discount", "min_booking_amount", "usage_limit", "used_count", "expires_at", "is_active", "created_at", "updated_at" }),
    ("spot_images",      new[] { "id", "spot_id", "image_url", "is_primary" }),
    ("spot_packages",    new[] { "id", "spot_id", "name", "description", "price", "duration_minutes", "meeting_point", "pickup_included", "pickup_note", "pickup_area", "free_cancel_before_hours", "refund_percent_before", "refund_percent_after", "created_at", "updated_at" }),
    ("spot_rooms",       new[] { "id", "spot_id", "name", "description", "price", "quantity", "free_cancel_before_hours", "refund_percent_before", "refund_percent_after", "created_at", "updated_at" }),
    ("spot_departures",  new[] { "id", "spot_id", "label", "start_time", "end_time", "capacity", "booked_count", "confirmation_type", "is_active", "created_at", "updated_at" }),
    ("favorites",        new[] { "id", "user_id", "spot_id", "created_at" }),
    ("reviews",          new[] { "id", "user_id", "spot_id", "rating", "comment", "created_at", "updated_at" }),
    ("search_histories", new[] { "id", "user_id", "keyword", "latitude", "longitude", "searched_at" }),
    ("bookings",         new[] { "id", "user_id", "spot_id", "package_id", "room_id", "departure_id", "voucher_id", "date", "end_date", "guests", "tour_days", "room_count", "subtotal_price", "discount_amount", "total_price", "refund_amount", "status", "payment_method", "confirmation_type", "expires_at", "confirmed_at", "cancelled_at", "rejection_reason", "cancellation_reason", "notes", "booking_code", "ticket_code", "qr_value", "pickup_requested", "pickup_address", "meeting_point_snapshot", "created_at", "updated_at" }),
    ("payments",         new[] { "id", "booking_id", "amount", "method", "status", "due_at", "paid_at", "refunded_at", "transaction_code", "created_at", "updated_at" })
};

using var sql = new SqlConnection(sqlConn);
await sql.OpenAsync();

Console.WriteLine("Clearing destination tables (reverse FK order)...");
foreach (var (name, _) in tables.Reverse())
{
    using var cmd = new SqlCommand($"DELETE FROM [{name}]", sql);
    await cmd.ExecuteNonQueryAsync();
}
// Reset identity seeds so imported IDs start clean
foreach (var (name, _) in tables)
{
    try
    {
        using var cmd = new SqlCommand($"DBCC CHECKIDENT('[{name}]', RESEED, 0)", sql);
        await cmd.ExecuteNonQueryAsync();
    }
    catch { /* no identity column or empty table */ }
}

using var mysql = new MySqlConnection(mysqlConn);
await mysql.OpenAsync();

foreach (var (name, columns) in tables)
{
    Console.Write($"Migrating {name}... ");

    var cols = string.Join(", ", columns);
    var selectCmd = new MySqlCommand($"SELECT {cols} FROM `{name}`", mysql);
    using var reader = await selectCmd.ExecuteReaderAsync();

    var rows = new List<object?[]>();
    while (await reader.ReadAsync())
    {
        var values = new object?[columns.Length];
        reader.GetValues(values);
        for (var i = 0; i < values.Length; i++)
        {
            if (values[i] is DBNull) values[i] = null;
        }
        rows.Add(values);
    }
    reader.Close();

    if (rows.Count == 0)
    {
        Console.WriteLine("(empty)");
        continue;
    }

    using (var ident = new SqlCommand($"SET IDENTITY_INSERT [{name}] ON", sql))
    {
        await ident.ExecuteNonQueryAsync();
    }

    var paramList = string.Join(", ", columns.Select((_, i) => "@p" + i));
    var bracketedCols = string.Join(", ", columns.Select(c => $"[{c}]"));
    var insertSql = $"INSERT INTO [{name}] ({bracketedCols}) VALUES ({paramList})";

    foreach (var row in rows)
    {
        using var insert = new SqlCommand(insertSql, sql);
        for (var i = 0; i < columns.Length; i++)
        {
            var value = row[i] ?? DBNull.Value;
            if (value is DateTime)
            {
                var param = new SqlParameter("@p" + i, System.Data.SqlDbType.DateTime2) { Value = value };
                insert.Parameters.Add(param);
            }
            else
            {
                insert.Parameters.AddWithValue("@p" + i, value);
            }
        }
        await insert.ExecuteNonQueryAsync();
    }

    using (var ident = new SqlCommand($"SET IDENTITY_INSERT [{name}] OFF", sql))
    {
        await ident.ExecuteNonQueryAsync();
    }

    Console.WriteLine($"{rows.Count} rows");
}

Console.WriteLine("Done.");
