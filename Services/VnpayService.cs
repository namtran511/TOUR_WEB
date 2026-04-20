using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using TravelSpotFinder.Api.Configuration;
using TravelSpotFinder.Api.Data.Entities;

namespace TravelSpotFinder.Api.Services;

public sealed class VnpayService
{
    private const string DefaultHashSecret = "travelspot-vnpay-simulator-secret";
    private readonly ApplicationSettings _settings;

    public VnpayService(ApplicationSettings settings)
    {
        _settings = settings;
    }

    public string BuildSignedUrl(string baseUrl, IDictionary<string, string?> parameters)
    {
        var clean = new Dictionary<string, string?>(parameters, StringComparer.OrdinalIgnoreCase);
        clean.Remove("vnp_SecureHash");
        clean.Remove("vnp_SecureHashType");

        var signData = BuildSignData(clean);
        var signature = Sign(signData);

        return $"{baseUrl}?{signData}&vnp_SecureHash={signature}";
    }

    public bool VerifySignature(IEnumerable<KeyValuePair<string, string?>> parameters)
    {
        var dictionary = parameters
            .Where(item => !string.IsNullOrWhiteSpace(item.Key))
            .ToDictionary(item => item.Key, item => item.Value, StringComparer.OrdinalIgnoreCase);

        if (!dictionary.TryGetValue("vnp_SecureHash", out var received) || string.IsNullOrWhiteSpace(received))
        {
            return false;
        }

        dictionary.Remove("vnp_SecureHash");
        dictionary.Remove("vnp_SecureHashType");

        var signData = BuildSignData(dictionary);
        var expected = Sign(signData);

        return string.Equals(expected, received, StringComparison.OrdinalIgnoreCase);
    }

    public string CreateSimulationPaymentUrl(Booking booking, string transactionCode)
    {
        var amount = Math.Max((int)Math.Round(Convert.ToDecimal(booking.payment?.amount ?? booking.total_price ?? 0m)), 0);
        var now = DateTime.UtcNow;
        var expiresAt = booking.payment?.due_at ?? now.AddMinutes(15);

        var parameters = new Dictionary<string, string?>
        {
            ["booking_id"] = booking.id.ToString(),
            ["booking_code"] = booking.booking_code,
            ["vnp_Version"] = "2.1.0",
            ["vnp_Command"] = "pay",
            ["vnp_TmnCode"] = _settings.vnpay_tmn_code,
            ["vnp_Amount"] = (amount * 100).ToString(),
            ["vnp_CurrCode"] = "VND",
            ["vnp_TxnRef"] = transactionCode,
            ["vnp_OrderInfo"] = $"Booking {booking.booking_code}",
            ["vnp_OrderType"] = "travel",
            ["vnp_Locale"] = "vn",
            ["vnp_ReturnUrl"] = _settings.vnpay_return_url,
            ["vnp_IpAddr"] = "127.0.0.1",
            ["vnp_CreateDate"] = FormatVnpDate(now),
            ["vnp_ExpireDate"] = FormatVnpDate(expiresAt)
        };

        var simulatorBaseUrl = $"{_settings.app_base_url}/api/payments/vnpay/simulate";
        return BuildSignedUrl(simulatorBaseUrl, parameters);
    }

    public IDictionary<string, string?> CreateCallbackPayload(int bookingId, string bookingCode, string transactionCode, long amount, string responseCode)
        => new Dictionary<string, string?>
        {
            ["booking_id"] = bookingId.ToString(),
            ["booking_code"] = bookingCode,
            ["vnp_Amount"] = amount.ToString(),
            ["vnp_TxnRef"] = transactionCode,
            ["vnp_ResponseCode"] = responseCode,
            ["vnp_TransactionStatus"] = responseCode,
            ["vnp_PayDate"] = FormatVnpDate(DateTime.UtcNow)
        };

    private string BuildSignData(IDictionary<string, string?> parameters)
    {
        return string.Join("&", parameters
            .Where(item => !string.IsNullOrWhiteSpace(item.Value))
            .OrderBy(item => item.Key, StringComparer.Ordinal)
            .Select(item => $"{item.Key}={EncodeValue(item.Value!)}"));
    }

    private string Sign(string signData)
    {
        var secret = string.IsNullOrWhiteSpace(_settings.vnpay_hash_secret)
            ? DefaultHashSecret
            : _settings.vnpay_hash_secret;

        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(signData));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string EncodeValue(string value)
        => Uri.EscapeDataString(value).Replace("%20", "+", StringComparison.Ordinal);

    public static string FormatVnpDate(DateTime value)
        => value.ToUniversalTime().ToString("yyyyMMddHHmmss");
}
