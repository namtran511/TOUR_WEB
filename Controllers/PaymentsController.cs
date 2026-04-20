using System.Globalization;
using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TravelSpotFinder.Api.Common;
using TravelSpotFinder.Api.Configuration;
using TravelSpotFinder.Api.Services;

namespace TravelSpotFinder.Api.Controllers;

[AllowAnonymous]
[Route("api/payments")]
public sealed class PaymentsController : ApiControllerBase
{
    private readonly BookingService _bookingService;
    private readonly VnpayService _vnpayService;
    private readonly ApplicationSettings _settings;

    public PaymentsController(BookingService bookingService, VnpayService vnpayService, ApplicationSettings settings)
    {
        _bookingService = bookingService;
        _vnpayService = vnpayService;
        _settings = settings;
    }

    [HttpGet("vnpay/simulate")]
    public IActionResult Simulate()
    {
        var query = Request.Query.ToDictionary(item => item.Key, item => (string?)item.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        if (!_vnpayService.VerifySignature(query))
        {
            return Content("<h2>VNPAY simulator: invalid signature</h2>", "text/html; charset=utf-8");
        }

        if (!int.TryParse(query.GetValueOrDefault("booking_id"), out var bookingId) ||
            string.IsNullOrWhiteSpace(query.GetValueOrDefault("booking_code")) ||
            string.IsNullOrWhiteSpace(query.GetValueOrDefault("vnp_TxnRef")) ||
            !long.TryParse(query.GetValueOrDefault("vnp_Amount"), out var amount))
        {
            return Content("<h2>VNPAY simulator: missing required params</h2>", "text/html; charset=utf-8");
        }

        var bookingCode = query["booking_code"]!;
        var transactionCode = query["vnp_TxnRef"]!;
        var callbackBase = $"{_settings.app_base_url}/api/payments/vnpay/return";
        var successUrl = _vnpayService.BuildSignedUrl(callbackBase, _vnpayService.CreateCallbackPayload(bookingId, bookingCode, transactionCode, amount, "00"));
        var failedUrl = _vnpayService.BuildSignedUrl(callbackBase, _vnpayService.CreateCallbackPayload(bookingId, bookingCode, transactionCode, amount, "24"));

        return Content(RenderSimulatorHtml(bookingId, bookingCode, transactionCode, amount, successUrl, failedUrl), "text/html; charset=utf-8");
    }

    [HttpGet("vnpay/return")]
    public async Task<IActionResult> Return([FromQuery] string? format, CancellationToken cancellationToken)
    {
        var query = Request.Query.ToDictionary(item => item.Key, item => (string?)item.Value.ToString(), StringComparer.OrdinalIgnoreCase);
        if (!_vnpayService.VerifySignature(query))
        {
            return BadRequest(ApiEnvelope.Error("Invalid VNPAY signature"));
        }

        if (!int.TryParse(query.GetValueOrDefault("booking_id"), out var bookingId) ||
            string.IsNullOrWhiteSpace(query.GetValueOrDefault("vnp_TxnRef")))
        {
            return BadRequest(ApiEnvelope.Error("Missing booking_id or vnp_TxnRef"));
        }

        var transactionCode = query["vnp_TxnRef"]!;
        var responseCode = query.GetValueOrDefault("vnp_ResponseCode") ?? "99";
        long? amount = long.TryParse(query.GetValueOrDefault("vnp_Amount"), out var parsedAmount) ? parsedAmount : null;

        var booking = await _bookingService.FinalizeVnpayPaymentAsync(bookingId, transactionCode, responseCode, amount, cancellationToken);
        var status = string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase) ? "success" : "failed";
        var redirectUrl = BuildClientRedirectUrl(status, booking.id, transactionCode);

        if ((Request.Headers.Accept.ToString().Contains("application/json", StringComparison.OrdinalIgnoreCase)) ||
            string.Equals(format, "json", StringComparison.OrdinalIgnoreCase))
        {
            return Success("VNPAY return processed", new
            {
                booking = ResponseMapper.MapBooking(booking),
                status,
                redirect_url = redirectUrl
            });
        }

        return Content(RenderReturnHtml(status, booking.id, transactionCode, redirectUrl), "text/html; charset=utf-8");
    }

    private string BuildClientRedirectUrl(string status, int bookingId, string transactionCode)
    {
        var baseUrl = _settings.client_base_url.TrimEnd('/');
        var query = $"payment={WebUtility.UrlEncode(status)}&bookingId={bookingId}&txnRef={WebUtility.UrlEncode(transactionCode)}";
        return $"{baseUrl}/#/bookings?{query}";
    }

    private static string RenderSimulatorHtml(int bookingId, string bookingCode, string transactionCode, long amount, string successUrl, string failedUrl)
    {
        var displayAmount = Math.Max(amount / 100, 0L);
        var amountText = displayAmount.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"));
        var qrImage = BuildMockQrDataUrl($"{bookingCode}-{transactionCode}-{displayAmount}");
        var maskedTxn = transactionCode.Length > 12
            ? $"{transactionCode[..8]}...{transactionCode[^4..]}"
            : transactionCode;
        var safeBookingCode = WebUtility.HtmlEncode(bookingCode);
        var safeMaskedTxn = WebUtility.HtmlEncode(maskedTxn);
        var safeFailedUrl = WebUtility.HtmlEncode(failedUrl);
        var successUrlJs = ToJsStringLiteral(successUrl);

        return $$"""
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cong thanh toan VNPAY</title>
  <style>
    :root {
      --brand:#1196db;
      --brand-strong:#0a84ce;
      --danger:#d71b34;
      --ink:#303846;
      --muted:#6f7b8d;
      --bg:#f4f6fa;
      --panel:#ffffff;
      --line:#dce3ec;
      --soft:#eef3f8;
      --soft-line:#e8edf3;
    }
    * { box-sizing:border-box; }
    html, body { margin:0; min-height:100%; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: radial-gradient(circle at top, #f8fbff 0%, var(--bg) 52%, #eef2f7 100%);
      color: var(--ink);
    }
    button, input, a { font:inherit; }
    button { border:0; background:none; cursor:pointer; }
    a { color:inherit; text-decoration:none; }
    .page { min-height:100vh; padding:20px; }
    .screen[hidden] { display:none; }
    .selector-wrap {
      min-height:calc(100vh - 40px);
      display:flex;
      align-items:center;
      justify-content:center;
    }
    .selector-card {
      width:min(100%, 760px);
      background:var(--panel);
      border:1px solid var(--soft-line);
      box-shadow:0 14px 32px rgba(42, 58, 80, .08);
      padding:22px 24px 16px;
    }
    .topbar, .detail-head {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
    }
    .back-link {
      display:inline-flex;
      align-items:center;
      gap:10px;
      color:#4c5666;
      font-size:14px;
    }
    .arrow {
      width:18px;
      height:18px;
      border-radius:999px;
      border:1px solid #d1dae5;
      position:relative;
      flex-shrink:0;
    }
    .arrow::before {
      content:"";
      position:absolute;
      left:6px;
      top:4px;
      width:5px;
      height:5px;
      border-left:2px solid #7a8596;
      border-bottom:2px solid #7a8596;
      transform:rotate(45deg);
    }
    .lang {
      display:inline-flex;
      align-items:center;
      gap:8px;
      color:#617081;
      font-size:14px;
    }
    .flag {
      width:22px;
      height:14px;
      border:1px solid #d3dae3;
      border-radius:2px;
      position:relative;
      overflow:hidden;
      flex-shrink:0;
    }
    .flag.en {
      background:
        linear-gradient(90deg, transparent 42%, #bf2033 42%, #bf2033 58%, transparent 58%),
        linear-gradient(transparent 38%, #bf2033 38%, #bf2033 62%, transparent 62%),
        linear-gradient(90deg, transparent 46%, #fff 46%, #fff 54%, transparent 54%),
        linear-gradient(transparent 43%, #fff 43%, #fff 57%, transparent 57%),
        #1f55a6;
    }
    .flag.vn { background:#d82136; }
    .flag.vn::after {
      content:"";
      position:absolute;
      left:8px;
      top:3px;
      width:5px;
      height:5px;
      background:#ffd651;
      clip-path:polygon(50% 0%, 61% 36%, 98% 36%, 68% 58%, 79% 94%, 50% 72%, 21% 94%, 32% 58%, 2% 36%, 39% 36%);
    }
    .brand, .brand-small {
      display:inline-flex;
      align-items:center;
      gap:10px;
    }
    .brand { margin-top:28px; }
    .mark {
      width:30px;
      height:22px;
      position:relative;
      flex-shrink:0;
    }
    .mark::before, .mark::after {
      content:"";
      position:absolute;
      top:3px;
      width:16px;
      height:16px;
      transform:rotate(45deg);
    }
    .mark::before {
      left:0;
      background:linear-gradient(180deg, #1b5eb7, #0d438e);
    }
    .mark::after {
      right:0;
      background:linear-gradient(180deg, #ef4a5b, #d91d38);
    }
    .brand-text {
      line-height:1;
      font-weight:700;
      color:#0f4da1;
      font-size:19px;
    }
    .brand-text span,
    .brand-mini strong span,
    .qr-logo span {
      color:var(--danger);
    }
    .brand-text small,
    .brand-mini strong small,
    .qr-logo small {
      font-size:9px;
      vertical-align:super;
      margin-left:1px;
    }
    .selector-title {
      margin:28px 0 24px;
      text-align:center;
      font-size:35px;
      font-weight:500;
      color:#404958;
    }
    .method-list { display:grid; gap:10px; }
    .method-row {
      width:100%;
      min-height:82px;
      border:1px solid var(--soft-line);
      background:#fff;
      padding:18px 22px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      color:#434d5b;
      text-align:left;
      transition:.18s ease;
    }
    .method-row:hover {
      border-color:#b7d8ee;
      box-shadow:0 8px 20px rgba(17, 150, 219, .08);
      transform:translateY(-1px);
    }
    .method-label {
      font-size:22px;
      line-height:1.35;
    }
    .method-label strong { color:var(--danger); }
    .qr-mini {
      width:42px;
      height:42px;
      border:1px solid #dfe5ee;
      padding:3px;
      background:#fff;
      flex-shrink:0;
    }
    .qr-mini img { width:100%; height:100%; display:block; }
    .bank-card-icon {
      width:48px;
      height:28px;
      border-radius:4px;
      background:linear-gradient(180deg, #28a7ea, #0d90d7);
      position:relative;
      flex-shrink:0;
    }
    .bank-card-icon::before {
      content:"";
      position:absolute;
      left:7px;
      top:12px;
      width:34px;
      height:3px;
      background:rgba(255,255,255,.9);
    }
    .card-brands { display:flex; gap:5px; flex-shrink:0; }
    .card-pill {
      height:14px;
      padding:0 7px;
      border-radius:999px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      font-size:8px;
      font-weight:700;
      letter-spacing:.05em;
      color:#fff;
    }
    .visa { background:#1d4ed8; }
    .master { background:#f97316; }
    .jcb { background:#16a34a; }
    .wallet-badge {
      display:inline-flex;
      align-items:center;
      gap:7px;
      font-size:12px;
      font-weight:700;
      color:#0f4da1;
      flex-shrink:0;
    }
    .wallet-badge::before {
      content:"";
      width:16px;
      height:16px;
      display:inline-block;
      transform:rotate(45deg);
      border-radius:2px;
      background:linear-gradient(135deg, #1b5eb7 0 50%, #e0243d 50% 100%);
    }
    .selector-foot {
      margin-top:18px;
      padding-top:14px;
      border-top:1px solid #eef2f7;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      flex-wrap:wrap;
      color:#647083;
      font-size:13px;
    }
    .contact {
      display:inline-flex;
      align-items:center;
      gap:7px;
      color:#607183;
    }
    .contact-icon {
      width:18px;
      height:18px;
      border-radius:999px;
      border:1px solid #d4dde7;
      position:relative;
      flex-shrink:0;
    }
    .contact-icon.phone::before {
      content:"";
      position:absolute;
      inset:4px;
      border:2px solid #6f7b8d;
      border-top-color:transparent;
      border-left-color:transparent;
      border-radius:8px;
      transform:rotate(45deg);
    }
    .contact-icon.mail::before {
      content:"";
      position:absolute;
      left:3px;
      right:3px;
      top:5px;
      bottom:5px;
      border:1.5px solid #6f7b8d;
      border-radius:2px;
    }
    .contact-icon.mail::after {
      content:"";
      position:absolute;
      left:4px;
      right:4px;
      top:6px;
      height:7px;
      border-left:1.5px solid #6f7b8d;
      border-bottom:1.5px solid #6f7b8d;
      transform:skewY(-34deg);
    }
    .secure-badge {
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:7px 10px;
      border:1px solid #e3e8ef;
      background:#fbfcfe;
      font-size:12px;
      color:#4f5a6b;
    }
    .secure-check {
      width:18px;
      height:18px;
      border-radius:999px;
      background:#1e90ff;
      position:relative;
      flex-shrink:0;
    }
    .secure-check::before {
      content:"";
      position:absolute;
      left:6px;
      top:3px;
      width:6px;
      height:9px;
      border:2px solid #fff;
      border-top:0;
      border-left:0;
      transform:rotate(45deg);
    }
    .detail-shell { max-width:1180px; margin:0 auto; }
    .brand-mini {
      display:flex;
      flex-direction:column;
      gap:2px;
    }
    .brand-mini small {
      font-size:12px;
      font-weight:700;
      color:#7b8491;
    }
    .brand-mini strong {
      font-size:22px;
      color:#0f4da1;
      line-height:1;
    }
    .flags { display:flex; gap:7px; }
    .notice {
      margin-top:14px;
      border:1px solid #dcecf8;
      background:#edf8ff;
      padding:16px 18px;
      text-align:center;
      color:#6c8696;
      font-size:18px;
    }
    .detail-card {
      margin-top:16px;
      background:#fff;
      border:1px solid #eef2f6;
      box-shadow:0 14px 32px rgba(47, 61, 79, .06);
      display:grid;
      grid-template-columns:minmax(320px, 1fr) minmax(380px, 1.05fr);
    }
    .qr-side {
      padding:42px 28px 26px;
      text-align:center;
      border-right:1px solid #f1f4f8;
    }
    .qr-head {
      margin:0;
      font-size:22px;
      line-height:1.3;
      color:#434b57;
      font-weight:600;
    }
    .qr-logo {
      margin-top:16px;
      font-size:26px;
      font-weight:700;
      color:#0f4da1;
    }
    .qr-frame {
      width:236px;
      height:236px;
      margin:18px auto 0;
      position:relative;
      padding:22px;
    }
    .qr-corner {
      position:absolute;
      width:28px;
      height:28px;
      border-color:#9ba5b1;
      border-style:solid;
    }
    .qr-corner.tl { left:0; top:0; border-width:2px 0 0 2px; }
    .qr-corner.tr { right:0; top:0; border-width:2px 2px 0 0; }
    .qr-corner.bl { left:0; bottom:0; border-width:0 0 2px 2px; }
    .qr-corner.br { right:0; bottom:0; border-width:0 2px 2px 0; }
    .qr-frame img { width:100%; display:block; }
    .scan-text {
      margin-top:6px;
      color:#15a4da;
      font-size:22px;
      font-style:italic;
      font-weight:700;
    }
    .order-caption {
      margin-top:14px;
      font-size:22px;
      color:#5f6876;
    }
    .amount {
      margin-top:10px;
      font-size:46px;
      font-weight:700;
      color:#303846;
      line-height:1;
    }
    .help {
      margin-top:12px;
      color:#198fda;
      font-size:16px;
    }
    .txn {
      margin-top:12px;
      color:#7f8a97;
      font-size:14px;
    }
    .banks {
      margin-top:44px;
    }
    .banks p {
      margin:0 0 12px;
      color:#657081;
      font-size:15px;
    }
    .bank-grid {
      display:flex;
      flex-wrap:wrap;
      justify-content:center;
      gap:10px 12px;
    }
    .bank-chip {
      min-width:78px;
      padding:6px 8px;
      border-radius:999px;
      border:1px solid #edf1f6;
      background:#fbfcff;
      color:#5d6a7a;
      font-size:12px;
      font-weight:700;
    }
    .form-side {
      padding:38px 34px 30px;
    }
    .detail-title {
      margin:0;
      text-align:center;
      font-size:36px;
      line-height:1.16;
      color:#414955;
      font-weight:500;
    }
    .tabs {
      margin:26px auto 0;
      width:min(100%, 440px);
      display:grid;
      grid-template-columns:1fr 1fr;
      border:1px solid #e3e8ef;
      background:#fff;
    }
    .tab {
      min-height:52px;
      color:#808998;
      font-size:17px;
    }
    .tab.active {
      background:var(--brand);
      color:#fff;
      font-weight:700;
    }
    .panel {
      width:min(100%, 440px);
      margin:18px auto 0;
      display:none;
    }
    .panel.active { display:block; }
    .field {
      width:100%;
      height:50px;
      border:1px solid #d9e0e9;
      display:flex;
      align-items:center;
      background:#fff;
      margin-top:10px;
    }
    .field:focus-within {
      border-color:#93cdec;
      box-shadow:0 0 0 3px rgba(17, 150, 219, .08);
    }
    .field-icon {
      width:46px;
      height:100%;
      border-right:1px solid #eef2f6;
      position:relative;
      flex-shrink:0;
    }
    .field-icon::before,
    .field-icon::after {
      content:"";
      position:absolute;
    }
    .field-icon.card::before {
      left:11px;
      top:15px;
      width:22px;
      height:14px;
      border:2px solid #b1b8c4;
      border-radius:2px;
    }
    .field-icon.card::after {
      left:12px;
      top:20px;
      width:20px;
      height:2px;
      background:#b1b8c4;
    }
    .field-icon.cal::before {
      left:11px;
      top:12px;
      width:22px;
      height:18px;
      border:2px solid #b1b8c4;
      border-radius:2px;
    }
    .field-icon.cal::after {
      left:13px;
      top:18px;
      width:18px;
      height:2px;
      background:#b1b8c4;
    }
    .field-icon.user::before {
      left:15px;
      top:11px;
      width:12px;
      height:12px;
      border:2px solid #b1b8c4;
      border-radius:50%;
    }
    .field-icon.user::after {
      left:12px;
      top:26px;
      width:18px;
      height:9px;
      border:2px solid #b1b8c4;
      border-top-left-radius:10px;
      border-top-right-radius:10px;
      border-bottom:0;
    }
    .field input {
      width:100%;
      height:100%;
      border:0;
      outline:none;
      padding:0 14px;
      font-size:18px;
      color:#2f3640;
      background:transparent;
    }
    .field input::placeholder { color:#a0a8b5; }
    .field-meta {
      margin-top:10px;
      display:flex;
      align-items:center;
      gap:8px;
      color:#707a89;
      font-size:14px;
    }
    .dot {
      width:9px;
      height:9px;
      border-radius:50%;
      border:1px solid #7f8795;
      position:relative;
    }
    .dot::after {
      content:"";
      position:absolute;
      inset:2px;
      border-radius:50%;
      background:#6f7786;
    }
    .policy {
      margin-top:16px;
      color:#6c7685;
      font-size:14px;
    }
    .policy span {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      width:17px;
      height:17px;
      margin-left:6px;
      border-radius:50%;
      background:#e9f4fb;
      color:#3a94d6;
      font-size:12px;
      font-weight:700;
    }
    .guide {
      margin:14px 0 4px;
      padding:16px 18px;
      border:1px solid #e2eef8;
      background:#f9fcfe;
      color:#647083;
      font-size:15px;
      line-height:1.6;
    }
    .primary-btn,
    .secondary-btn {
      width:100%;
      min-height:50px;
      margin-top:14px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      text-decoration:none;
      font-size:19px;
      font-weight:700;
      letter-spacing:.02em;
    }
    .primary-btn {
      background:var(--brand);
      color:#fff;
      transition:.18s ease;
    }
    .primary-btn:hover:not(:disabled) { background:var(--brand-strong); }
    .primary-btn:disabled {
      opacity:.55;
      cursor:not-allowed;
    }
    .back-action {
      margin-top:12px;
      color:#6f7a88;
      text-align:center;
      width:100%;
      text-decoration:underline;
    }
    .or {
      margin-top:10px;
      text-align:center;
      color:#6b7482;
      font-size:16px;
    }
    .secondary-btn {
      background:#edf1f5;
      color:#6d7784;
    }
    .secondary-btn:hover { background:#e3e8ef; }
    .note {
      max-width:1180px;
      margin:18px auto 0;
      color:#8d95a3;
      text-align:center;
      font-size:13px;
    }
    @media (max-width:980px) {
      .selector-title { font-size:31px; }
      .method-label { font-size:18px; }
      .detail-card { grid-template-columns:1fr; }
      .qr-side { border-right:0; border-bottom:1px solid #f1f4f8; }
      .detail-title { font-size:30px; }
    }
    @media (max-width:720px) {
      .page { padding:12px; }
      .selector-wrap { min-height:auto; padding:12px 0; }
      .selector-card { padding:16px 16px 14px; }
      .brand { margin-top:18px; }
      .selector-title { margin:18px 0; font-size:27px; }
      .method-row { min-height:72px; padding:14px; }
      .method-label { font-size:15px; }
      .notice { font-size:14px; padding:12px; }
      .qr-side, .form-side { padding:22px 16px; }
      .qr-head { font-size:18px; }
      .qr-frame { width:202px; height:202px; padding:18px; }
      .amount { font-size:38px; }
      .detail-title { font-size:24px; }
      .tab, .field input, .primary-btn, .secondary-btn { font-size:16px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="screen selector-wrap" data-screen="selector">
      <div class="selector-card">
        <div class="topbar">
          <a class="back-link" href="{{safeFailedUrl}}">
            <span class="arrow" aria-hidden="true"></span>
            <span>Quay lai</span>
          </a>
          <button class="lang" type="button">
            <span class="flag en" aria-hidden="true"></span>
            <span>En</span>
          </button>
        </div>

        <div class="brand" aria-label="VNPAY">
          <span class="mark" aria-hidden="true"></span>
          <span class="brand-text">VN<span>PAY</span><small>QR</small></span>
        </div>

        <h1 class="selector-title">Chọn phương thức thanh toán</h1>

        <div class="method-list">
          <button class="method-row" type="button" data-method="qr">
            <span class="method-label">Ứng dụng thanh toán hỗ trợ <strong>VNPAY</strong></span>
            <span class="qr-mini"><img src="{{qrImage}}" alt="QR" /></span>
          </button>
          <button class="method-row" type="button" data-method="bank">
            <span class="method-label">Thẻ nội địa và tài khoản ngân hàng</span>
            <span class="bank-card-icon" aria-hidden="true"></span>
          </button>
          <button class="method-row" type="button" data-method="international">
            <span class="method-label">Thẻ thanh toán quốc tế</span>
            <span class="card-brands" aria-hidden="true">
              <span class="card-pill visa">VISA</span>
              <span class="card-pill master">MC</span>
              <span class="card-pill jcb">JCB</span>
            </span>
          </button>
          <button class="method-row" type="button" data-method="wallet">
            <span class="method-label">Ví điện tử <strong>VNPAY</strong></span>
            <span class="wallet-badge" aria-hidden="true">VNPAY</span>
          </button>
        </div>

        <div class="selector-foot">
          <a class="contact" href="tel:1900555577">
            <span class="contact-icon phone" aria-hidden="true"></span>
            <span>1900.5555.77</span>
          </a>
          <a class="contact" href="mailto:hotrovnpay@vnpay.vn">
            <span class="contact-icon mail" aria-hidden="true"></span>
            <span>hotrovnpay@vnpay.vn</span>
          </a>
          <div class="secure-badge">
            <span class="secure-check" aria-hidden="true"></span>
            <span>secure verified</span>
          </div>
        </div>
      </div>
    </section>

    <section class="screen" data-screen="detail" hidden>
      <div class="detail-shell">
        <header class="detail-head">
          <div class="brand-small">
            <span class="mark" aria-hidden="true"></span>
            <div class="brand-mini">
              <small>CONG THANH TOAN</small>
              <strong>VN<span>PAY</span><small>QR</small></strong>
            </div>
          </div>
          <div class="flags">
            <span class="flag vn" aria-hidden="true"></span>
            <span class="flag en" aria-hidden="true"></span>
          </div>
        </header>

        <div class="notice">Quý khách vui lòng không tắt trình duyệt cho đến khi nhận được kết quả giao dịch từ website. Xin cảm ơn!</div>

        <div class="detail-card">
          <aside class="qr-side">
            <h2 class="qr-head">Ứng dụng mobile<br />quét mã</h2>
            <div class="qr-logo">VN<span>PAY</span><small>QR</small></div>
            <div class="qr-frame">
              <span class="qr-corner tl" aria-hidden="true"></span>
              <span class="qr-corner tr" aria-hidden="true"></span>
              <span class="qr-corner bl" aria-hidden="true"></span>
              <span class="qr-corner br" aria-hidden="true"></span>
              <img src="{{qrImage}}" alt="VNPAY QR" />
            </div>
            <div class="scan-text">Scan to Pay</div>
            <div class="order-caption">Thanh toán đơn hàng #{{bookingId}}</div>
            <div class="amount">{{amountText}} VND</div>
            <div class="help">Huong dan thanh toan?</div>
            <div class="txn">{{safeBookingCode}} · {{safeMaskedTxn}}</div>

            <div class="banks">
              <p>Sử dụng ứng dụng hỗ trợ <strong>VNPAYQR</strong></p>
              <div class="bank-grid">
                <span class="bank-chip">Vietcombank</span>
                <span class="bank-chip">Agribank</span>
                <span class="bank-chip">BIDV</span>
                <span class="bank-chip">VietinBank</span>
                <span class="bank-chip">IVB</span>
                <span class="bank-chip">Eximbank</span>
                <span class="bank-chip">Nam A Bank</span>
                <span class="bank-chip">OceanBank</span>
              </div>
            </div>
          </aside>

          <section class="form-side">
            <h2 class="detail-title" id="detail-title">Thanh toán qua Ngân hàng<br />Techcombank</h2>

            <div class="tabs" id="bank-tabs">
              <button class="tab" type="button">Internet Banking</button>
              <button class="tab active" type="button">The ATM</button>
            </div>

            <div class="panel active" id="bank-panel">
              <label class="field">
                <span class="field-icon card" aria-hidden="true"></span>
                <input id="card-number" type="text" inputmode="numeric" autocomplete="cc-number" placeholder="Số thẻ" maxlength="23" />
              </label>
              <label class="field">
                <span class="field-icon cal" aria-hidden="true"></span>
                <input id="card-expiry" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5" />
              </label>
              <div class="field-meta">
                <span class="dot" aria-hidden="true"></span>
                <span id="validity-text">Ngày hiệu lực</span>
              </div>
              <label class="field">
                <span class="field-icon user" aria-hidden="true"></span>
                <input id="card-holder" type="text" autocomplete="cc-name" placeholder="Tên chủ thẻ không dấu" />
              </label>
              <div class="policy">Điều kiện sử dụng dịch vụ <span>?</span></div>
              <button class="primary-btn" id="confirm-button" type="button" disabled>XÁC THỰC</button>
              <button class="back-action" type="button" data-action="back">Chọn lại phương thức</button>
              <div class="or">Hoặc</div>
              <a class="secondary-btn" href="{{safeFailedUrl}}">HỦY</a>
            </div>

            <div class="panel" id="guide-panel">
              <div class="guide" id="guide-copy">Mở ứng dụng ngân hàng hoặc ứng dụng VNPAY để quét mã bên trái, sau đó tiếp tục để mô phỏng callback thành công.</div>
              <button class="primary-btn" id="guide-button" type="button">TÔI ĐÃ QUÉT MÃ</button>
              <button class="back-action" type="button" data-action="back">Chọn lại phương thức</button>
              <div class="or">Hoặc</div>
              <a class="secondary-btn" href="{{safeFailedUrl}}">HỦY</a>
            </div>
          </section>
        </div>

        <div class="note">Simulator chi phuc vu kiem thu luong booking, khong ket noi cong thanh toan that.</div>
      </div>
    </section>
  </div>

  <script>
    (function () {
      var successUrl = {{successUrlJs}};
      var selectorScreen = document.querySelector('[data-screen="selector"]');
      var detailScreen = document.querySelector('[data-screen="detail"]');
      var detailTitle = document.getElementById('detail-title');
      var tabs = document.getElementById('bank-tabs');
      var bankPanel = document.getElementById('bank-panel');
      var guidePanel = document.getElementById('guide-panel');
      var guideCopy = document.getElementById('guide-copy');
      var guideButton = document.getElementById('guide-button');
      var confirmButton = document.getElementById('confirm-button');
      var validityText = document.getElementById('validity-text');
      var cardNumber = document.getElementById('card-number');
      var cardExpiry = document.getElementById('card-expiry');
      var cardHolder = document.getElementById('card-holder');

      var config = {
        qr: {
          heading: 'Thanh toán bằng QR<br />Ứng dụng hỗ trợ VNPAY',
          panel: 'guide',
          guide: 'Mở ứng dụng ngân hàng hoặc ứng dụng VNPAY để quét mã bên trái, sau đó bấm tiếp tục để mô phỏng callback thanh toán thành công.',
          button: 'TÔI ĐÃ QUÉT MÃ'
        },
        bank: {
          heading: 'Thanh toán qua Ngân hàng<br />Techcombank',
          panel: 'bank',
          validity: 'Ngày hiệu lực',
          tabs: true
        },
        international: {
          heading: 'Thanh toán qua thẻ<br />quốc tế',
          panel: 'bank',
          validity: 'Ngày hết hạn',
          tabs: false
        },
        wallet: {
          heading: 'Thanh toán bằng<br />ví điện tử VNPAY',
          panel: 'guide',
          guide: 'Đăng nhập ví VNPAY để xác nhận giao dịch giả lập. Khi hoàn tất, bấm tiếp tục để quay về hệ thống booking.',
          button: 'TIẾP TỤC'
        }
      };

      function showScreen(name) {
        var selectorVisible = name === 'selector';
        selectorScreen.hidden = !selectorVisible;
        detailScreen.hidden = selectorVisible;
      }

      function digits(value) {
        return String(value || '').replace(/\D/g, '');
      }

      function formatCard(value) {
        return digits(value).slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
      }

      function formatExpiry(value) {
        var clean = digits(value).slice(0, 4);
        return clean.length <= 2 ? clean : clean.slice(0, 2) + '/' + clean.slice(2);
      }

      function validExpiry(value) {
        if (!/^\d{2}\/\d{2}$/.test(value)) {
          return false;
        }

        var parts = value.split('/');
        var month = Number(parts[0]);
        return month >= 1 && month <= 12;
      }

      function syncConfirmState() {
        var ready = digits(cardNumber.value).length >= 12 &&
          validExpiry(cardExpiry.value) &&
          cardHolder.value.trim().replace(/\s+/g, ' ').length >= 4;

        confirmButton.disabled = !ready;
      }

      function openMethod(method) {
        var entry = config[method] || config.bank;
        detailTitle.innerHTML = entry.heading;

        if (entry.panel === 'bank') {
          tabs.style.display = entry.tabs ? 'grid' : 'none';
          validityText.textContent = entry.validity || 'Ngay hieu luc';
          bankPanel.classList.add('active');
          guidePanel.classList.remove('active');
          syncConfirmState();
          setTimeout(function () {
            cardNumber.focus();
          }, 60);
        } else {
          tabs.style.display = 'none';
          guideCopy.textContent = entry.guide;
          guideButton.textContent = entry.button;
          guidePanel.classList.add('active');
          bankPanel.classList.remove('active');
        }

        showScreen('detail');
      }

      document.querySelectorAll('[data-method]').forEach(function (button) {
        button.addEventListener('click', function () {
          openMethod(button.getAttribute('data-method'));
        });
      });

      document.querySelectorAll('[data-action="back"]').forEach(function (button) {
        button.addEventListener('click', function () {
          showScreen('selector');
        });
      });

      cardNumber.addEventListener('input', function () {
        cardNumber.value = formatCard(cardNumber.value);
        syncConfirmState();
      });

      cardExpiry.addEventListener('input', function () {
        cardExpiry.value = formatExpiry(cardExpiry.value);
        syncConfirmState();
      });

      cardHolder.addEventListener('input', function () {
        cardHolder.value = cardHolder.value.toUpperCase().replace(/[^A-Z\s]/g, '').replace(/\s{2,}/g, ' ').trimStart();
        syncConfirmState();
      });

      cardHolder.addEventListener('blur', function () {
        cardHolder.value = cardHolder.value.trim().replace(/\s{2,}/g, ' ');
        syncConfirmState();
      });

      confirmButton.addEventListener('click', function () {
        if (!confirmButton.disabled) {
          window.location.href = successUrl;
        }
      });

      guideButton.addEventListener('click', function () {
        window.location.href = successUrl;
      });
    }());
  </script>
</body>
</html>
""";
    }

    private static string RenderReturnHtml(string status, int bookingId, string transactionCode, string redirectUrl)
    {
        var title = status == "success" ? "Thanh toan thanh cong" : "Thanh toan that bai";
        var summary = status == "success"
            ? "Giao dich da duoc ghi nhan."
            : "Giao dich chua hoan tat.";

        return $$"""
<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{WebUtility.HtmlEncode(title)}}</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f5f7fb; color:#243040; margin:0; padding:24px; }
    .card { max-width:640px; margin:0 auto; background:#fff; border:1px solid #dbe3ec; padding:28px; box-shadow:0 12px 28px rgba(36,48,64,.08); }
    .btn { display:inline-flex; align-items:center; justify-content:center; min-height:46px; padding:0 18px; text-decoration:none; font-weight:700; background:#1196db; color:#fff; margin-top:18px; }
  </style>
</head>
<body>
  <section class="card">
    <h1>{{WebUtility.HtmlEncode(title)}}</h1>
    <p>{{WebUtility.HtmlEncode(summary)}}</p>
    <p><strong>Booking:</strong> #{{bookingId}}</p>
    <p><strong>Ma giao dich:</strong> {{WebUtility.HtmlEncode(transactionCode)}}</p>
    <a class="btn" href="{{WebUtility.HtmlEncode(redirectUrl)}}">Mo trang bookings</a>
  </section>
</body>
</html>
""";
    }

    private static string BuildMockQrDataUrl(string seed)
    {
        const int size = 29;
        const int cell = 8;
        var state = 0u;

        foreach (var character in seed)
        {
            state = ((state * 131) + character) & 0xffffffff;
        }

        if (state == 0)
        {
            state = 0x9e3779b9;
        }

        bool NextBit()
        {
            state ^= state << 13;
            state ^= state >> 17;
            state ^= state << 5;
            return (state & 1) == 1;
        }

        bool? IsFinderPixel(int x, int y)
        {
            var finders = new (int fx, int fy)[]
            {
                (0, 0),
                (size - 7, 0),
                (0, size - 7)
            };

            foreach (var (fx, fy) in finders)
            {
                if (x < fx || x >= fx + 7 || y < fy || y >= fy + 7)
                {
                    continue;
                }

                var rx = x - fx;
                var ry = y - fy;
                var outer = rx == 0 || rx == 6 || ry == 0 || ry == 6;
                var inner = rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4;
                return outer || inner;
            }

            return null;
        }

        var rects = new StringBuilder();
        for (var y = 0; y < size; y++)
        {
            for (var x = 0; x < size; x++)
            {
                var finder = IsFinderPixel(x, y);
                var dark = finder ?? (NextBit() ^ ((x + y) % 2 == 1));

                if (dark)
                {
                    rects.Append($"<rect x=\"{x * cell}\" y=\"{y * cell}\" width=\"{cell}\" height=\"{cell}\" fill=\"#111827\"/>");
                }
            }
        }

        var pixelSize = size * cell;
        var svg = $"<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{pixelSize}\" height=\"{pixelSize}\" viewBox=\"0 0 {pixelSize} {pixelSize}\"><rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/>{rects}</svg>";
        return $"data:image/svg+xml;base64,{Convert.ToBase64String(Encoding.UTF8.GetBytes(svg))}";
    }

    private static string ToJsStringLiteral(string value)
        => JsonSerializer.Serialize(value);
}
