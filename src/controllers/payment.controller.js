const bookingService = require('../services/booking.service');
const vnpayService = require('../services/vnpay.service');
const { APP_BASE_URL, CLIENT_BASE_URL } = require('../config/env');
const { successResponse } = require('../utils/apiResponse');

const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const buildClientRedirectUrl = (status, bookingId, transactionCode) => {
  const base = (CLIENT_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
  const query = new URLSearchParams({
    payment: status,
    bookingId: String(bookingId || ''),
    txnRef: String(transactionCode || '')
  });

  return `${base}/#/bookings?${query.toString()}`;
};

const renderVnpayReturnPage = ({ status, bookingId, transactionCode, redirectUrl }) => {
  const isSuccess = status === 'success';
  const title = isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại';
  const subtitle = isSuccess
    ? `Giao dịch VNPAY cho booking #${bookingId || '-'} đã được ghi nhận.`
    : `Giao dịch VNPAY cho booking #${bookingId || '-'} chưa hoàn tất.`;
  const summary = isSuccess
    ? 'Bạn có thể quay lại danh sách booking để kiểm tra trạng thái mới nhất.'
    : 'Bạn có thể quay lại danh sách booking để thử thanh toán lại hoặc kiểm tra trạng thái hiện tại.';
  const safeTitle = escapeHtml(title);
  const safeSubtitle = escapeHtml(subtitle);
  const safeSummary = escapeHtml(summary);
  const safeTxn = escapeHtml(transactionCode || '-');
  const safeRedirectUrl = escapeHtml(redirectUrl);

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeTitle}</title>
    <style>
      :root {
        --success: #0a9f6e;
        --danger: #d9485f;
        --text: #253041;
        --muted: #6b7280;
        --border: #dbe3ec;
        --bg: #f4f7fb;
        --card: #ffffff;
        --primary: #1196db;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 20px;
        font-family: Arial, Helvetica, sans-serif;
        background: var(--bg);
        color: var(--text);
      }
      .card {
        width: min(100%, 560px);
        background: var(--card);
        border: 1px solid var(--border);
        box-shadow: 0 16px 34px rgba(37, 48, 65, 0.08);
        padding: 28px 24px;
      }
      .badge {
        width: 58px;
        height: 58px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        font-size: 30px;
        font-weight: 700;
        color: #ffffff;
        background: ${isSuccess ? 'var(--success)' : 'var(--danger)'};
      }
      h1 {
        margin: 18px 0 10px;
        font-size: 30px;
        line-height: 1.2;
      }
      p {
        margin: 0;
        font-size: 16px;
        line-height: 1.6;
        color: var(--muted);
      }
      .meta {
        margin-top: 18px;
        padding: 14px 16px;
        background: #f8fafc;
        border: 1px solid var(--border);
      }
      .meta strong {
        color: var(--text);
      }
      .actions {
        margin-top: 22px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .button {
        min-height: 46px;
        padding: 0 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        font-weight: 700;
      }
      .button.primary {
        background: var(--primary);
        color: #ffffff;
      }
      .button.secondary {
        background: #eef2f6;
        color: #4b5563;
      }
      .hint {
        margin-top: 16px;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <section class="card">
      <div class="badge">${isSuccess ? '&#10003;' : '!'}</div>
      <h1>${safeTitle}</h1>
      <p>${safeSubtitle}</p>
      <p style="margin-top:8px;">${safeSummary}</p>

      <div class="meta">
        <p><strong>Mã giao dịch:</strong> ${safeTxn}</p>
        <p><strong>Booking:</strong> #${escapeHtml(String(bookingId || '-'))}</p>
      </div>

      <div class="actions">
        <a class="button primary" href="${safeRedirectUrl}">Mở trang bookings</a>
        <a class="button secondary" href="javascript:history.back()">Quay lại</a>
      </div>

      <p class="hint">Nếu frontend chưa chạy ở <strong>${escapeHtml(CLIENT_BASE_URL)}</strong>, trạng thái thanh toán vẫn đã được xử lý ở backend.</p>
    </section>
  </body>
</html>`;
};

const buildMockQrDataUrl = (seed = 'VNPAY-SIMULATOR') => {
  const size = 29;
  const cell = 8;
  let state = 0;

  for (let i = 0; i < seed.length; i += 1) {
    state = ((state * 131) + seed.charCodeAt(i)) >>> 0;
  }

  if (state === 0) {
    state = 0x9e3779b9;
  }

  const nextBit = () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state >>>= 0;
    state ^= state << 5;
    state >>>= 0;
    return state & 1;
  };

  const inFinderZone = (x, y, fx, fy) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7;

  const isFinderPixel = (x, y) => {
    const finders = [
      [0, 0],
      [size - 7, 0],
      [0, size - 7]
    ];

    for (const [fx, fy] of finders) {
      if (inFinderZone(x, y, fx, fy)) {
        const rx = x - fx;
        const ry = y - fy;
        const outer = rx === 0 || rx === 6 || ry === 0 || ry === 6;
        const inner = rx >= 2 && rx <= 4 && ry >= 2 && ry <= 4;
        return outer || inner;
      }
    }

    return null;
  };

  let rects = '';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const finderPixel = isFinderPixel(x, y);
      const isDark = typeof finderPixel === 'boolean' ? finderPixel : ((nextBit() ^ ((x + y) % 2)) === 1);

      if (isDark) {
        rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="#111827"/>`;
      }
    }
  }

  const pxSize = size * cell;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pxSize}" height="${pxSize}" viewBox="0 0 ${pxSize} ${pxSize}"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const renderVnpaySimulator = (req, res) => {
  const isValid = vnpayService.verifySignature(req.query);
  if (!isValid) {
    return res.status(400).type('html').send('<h2>VNPAY simulator: invalid signature</h2>');
  }

  const bookingId = Number(req.query.booking_id);
  const bookingCode = req.query.booking_code;
  const transactionCode = req.query.vnp_TxnRef;
  const amount = req.query.vnp_Amount;

  if (!bookingId || !bookingCode || !transactionCode || !amount) {
    return res.status(400).type('html').send('<h2>VNPAY simulator: missing required params</h2>');
  }

  const callbackBase = `${APP_BASE_URL}/api/payments/vnpay/return`;
  const successPayload = vnpayService.createCallbackPayload({
    bookingId,
    bookingCode,
    transactionCode,
    amount,
    responseCode: '00'
  });

  const failedPayload = vnpayService.createCallbackPayload({
    bookingId,
    bookingCode,
    transactionCode,
    amount,
    responseCode: '24'
  });

  const successUrl = vnpayService.buildSignedUrl(callbackBase, successPayload);
  const failedUrl = vnpayService.buildSignedUrl(callbackBase, failedPayload);
  const displayAmount = Math.max(Math.round(Number(amount) / 100), 0);
  const qrImage = buildMockQrDataUrl(`${bookingCode}-${transactionCode}-${displayAmount}`);
  const maskedTxn = `${String(transactionCode).slice(0, 8)}...${String(transactionCode).slice(-4)}`;
  const escapedFailedUrl = escapeHtml(failedUrl);
  const escapedBookingCode = escapeHtml(bookingCode);
  const escapedMaskedTxn = escapeHtml(maskedTxn);

  return res.status(200).type('html').send(`<!doctype html><html lang="vi"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><title>Cổng thanh toán VNPAY</title><style>
:root{--b:#1196db;--bd:#0b7fc6;--r:#d71b34;--t:#303846;--m:#7d8795;--bg:#f4f6fa;--br:#dce3ec;--s:#ebeff5}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);font-family:Arial,Helvetica,sans-serif;color:var(--t)}button,input,a{font:inherit}button{border:0;background:none;cursor:pointer}a{color:inherit}.pg{min-height:100vh;padding:20px}.screen[hidden]{display:none}.sel{min-height:calc(100vh - 40px);display:flex;align-items:center;justify-content:center}.sc{width:min(100%,760px);background:#fff;border:1px solid var(--s);box-shadow:0 12px 30px rgba(45,56,72,.06);padding:24px 26px 18px}.top{display:flex;align-items:center;justify-content:space-between;font-size:14px}.back{display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#495464}.back:hover{color:#1b2534}.ar{width:18px;height:18px;border-radius:999px;border:1px solid #cfd7e3;position:relative}.ar:before{content:'';position:absolute;left:6px;top:4px;width:5px;height:5px;border-left:2px solid #7a8596;border-bottom:2px solid #7a8596;transform:rotate(45deg)}.lang{display:inline-flex;align-items:center;gap:8px;color:#5d6777}.flag{width:22px;height:14px;border:1px solid #d1d7e0;border-radius:2px;position:relative;overflow:hidden;flex-shrink:0}.flag.en{background:linear-gradient(90deg,transparent 42%,#b91c2d 42%,#b91c2d 58%,transparent 58%),linear-gradient(transparent 38%,#b91c2d 38%,#b91c2d 62%,transparent 62%),linear-gradient(90deg,transparent 46%,#fff 46%,#fff 54%,transparent 54%),linear-gradient(transparent 43%,#fff 43%,#fff 57%,transparent 57%),#2056a9}.flag.vn{background:#d82136}.flag.vn:after{content:'';position:absolute;left:8px;top:3px;width:5px;height:5px;background:#ffd651;clip-path:polygon(50% 0%,61% 36%,98% 36%,68% 58%,79% 94%,50% 72%,21% 94%,32% 58%,2% 36%,39% 36%)}.logo,.dbrand{display:inline-flex;align-items:center;gap:10px}.logo{margin-top:34px}.mark{width:30px;height:22px;position:relative}.mark:before,.mark:after{content:'';position:absolute;width:16px;height:16px;top:3px;transform:rotate(45deg)}.mark:before{left:0;background:linear-gradient(180deg,#1b5eb7,#0e3e87)}.mark:after{right:0;background:linear-gradient(180deg,#f04a5a,#d91d38)}.word{font-size:19px;font-weight:700;color:#0f4da1;line-height:1}.word span,.dbcopy strong span,.qlogo span{color:var(--r)}.word small,.dbcopy strong small,.qlogo small{font-size:9px;vertical-align:super;margin-left:1px}.st{margin:28px 0 24px;text-align:center;font-size:36px;font-weight:500;color:#404958}.methods{display:grid;gap:10px}.row{width:100%;min-height:82px;border:1px solid var(--s);padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;color:#434d5b;text-align:left;transition:.18s}.row:hover{border-color:#b7d8ee;box-shadow:0 8px 20px rgba(17,150,219,.08);transform:translateY(-1px)}.lb{font-size:22px;line-height:1.35}.lb strong{color:var(--r)}.qrmini{width:42px;height:42px;border:1px solid #dfe5ee;padding:3px;background:#fff}.qrmini img{width:100%;height:100%;display:block}.card{width:48px;height:28px;border-radius:4px;background:linear-gradient(180deg,#28a7ea,#0d90d7);position:relative}.card:before{content:'';position:absolute;left:7px;top:12px;width:34px;height:3px;background:rgba(255,255,255,.9)}.cards{display:flex;gap:5px}.pill{height:14px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;padding:0 7px;color:#fff;font-size:8px;font-weight:700;letter-spacing:.05em}.visa{background:#1d4ed8}.master{background:#f97316}.jcb{background:#16a34a}.wallet{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#0f4da1}.wallet:before{content:'';width:16px;height:16px;display:inline-block;transform:rotate(45deg);border-radius:2px;background:linear-gradient(135deg,#1b5eb7 0 50%,#e0243d 50% 100%)}.ft{margin-top:18px;padding-top:14px;border-top:1px solid #eef2f7;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;color:#647083;font-size:13px}.contact{display:inline-flex;align-items:center;gap:7px;text-decoration:none;color:#607183}.contact:hover{color:#1b2534}.fi{width:18px;height:18px;border-radius:999px;border:1px solid #d4dde7;position:relative}.fi.ph:before{content:'';position:absolute;inset:4px;border:2px solid #6f7b8d;border-top-color:transparent;border-left-color:transparent;border-radius:8px;transform:rotate(45deg)}.fi.ml:before{content:'';position:absolute;left:3px;right:3px;top:5px;bottom:5px;border:1.5px solid #6f7b8d;border-radius:2px}.fi.ml:after{content:'';position:absolute;left:4px;right:4px;top:6px;height:7px;border-left:1.5px solid #6f7b8d;border-bottom:1.5px solid #6f7b8d;transform:skewY(-34deg)}.secure{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid #e3e8ef;background:#fbfcfe;font-size:12px;color:#4f5a6b}.check{width:18px;height:18px;border-radius:999px;background:#1e90ff;position:relative}.check:before{content:'';position:absolute;left:6px;top:3px;width:6px;height:9px;border:2px solid #fff;border-top:0;border-left:0;transform:rotate(45deg)}.ds{max-width:1180px;margin:0 auto}.dh{display:flex;align-items:center;justify-content:space-between;padding:2px 0 10px}.dbcopy{display:flex;flex-direction:column;gap:2px}.dbcopy small{font-size:12px;font-weight:700;color:#7b8491}.dbcopy strong{font-size:22px;color:#0f4da1;line-height:1}.flags{display:flex;gap:7px}.nt{border:1px solid #dcecf8;background:#edf8ff;padding:16px 18px;text-align:center;color:#6c8696;font-size:18px}.dc{margin-top:16px;background:#fff;border:1px solid #eef2f6;box-shadow:0 14px 32px rgba(47,61,79,.06);display:grid;grid-template-columns:minmax(320px,1fr) minmax(380px,1.05fr)}.qs{padding:42px 28px 26px;text-align:center;border-right:1px solid #f1f4f8}.qh{margin:0;font-size:22px;line-height:1.3;color:#434b57;font-weight:600}.qlogo{margin-top:16px;font-size:26px;font-weight:700;color:#0f4da1}.qf{width:236px;height:236px;margin:18px auto 0;position:relative;padding:22px}.qc{position:absolute;width:28px;height:28px;border-color:#9ba5b1;border-style:solid}.qc.tl{left:0;top:0;border-width:2px 0 0 2px}.qc.tr{right:0;top:0;border-width:2px 2px 0 0}.qc.bl{left:0;bottom:0;border-width:0 0 2px 2px}.qc.br{right:0;bottom:0;border-width:0 2px 2px 0}.qf img{width:100%;display:block}.scan{margin-top:6px;color:#15a4da;font-size:22px;font-style:italic;font-weight:700}.oc{margin-top:14px;font-size:22px;color:#5f6876}.am{margin-top:10px;font-size:46px;font-weight:700;color:#303846;line-height:1}.help{margin-top:12px;color:#198fda;font-size:16px}.txn{margin-top:12px;color:#7f8a97;font-size:14px}.banks{margin-top:44px}.banks p{margin:0 0 12px;color:#657081;font-size:15px}.grid{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 12px}.chip{min-width:78px;padding:6px 8px;border-radius:999px;border:1px solid #edf1f6;background:#fbfcff;color:#5d6a7a;font-size:12px;font-weight:700}.fs{padding:38px 34px 30px}.title{margin:0;text-align:center;font-size:36px;line-height:1.16;color:#414955;font-weight:500}.tabs{margin:26px auto 0;width:min(100%,440px);display:grid;grid-template-columns:1fr 1fr;border:1px solid #e3e8ef;background:#fff}.tab{min-height:52px;color:#808998;font-size:17px}.tab.on{background:var(--b);color:#fff;font-weight:700}.panel{width:min(100%,440px);margin:18px auto 0;display:none}.panel.on{display:block}.fld{width:100%;height:50px;border:1px solid #d9e0e9;display:flex;align-items:center;background:#fff;margin-top:10px}.fld:focus-within{border-color:#93cdec;box-shadow:0 0 0 3px rgba(17,150,219,.08)}.ico{width:46px;height:100%;border-right:1px solid #eef2f6;position:relative;flex-shrink:0}.ico:before,.ico:after{content:'';position:absolute}.ic.card:before{left:11px;top:15px;width:22px;height:14px;border:2px solid #b1b8c4;border-radius:2px}.ic.card:after{left:12px;top:20px;width:20px;height:2px;background:#b1b8c4}.ic.cal:before{left:11px;top:12px;width:22px;height:18px;border:2px solid #b1b8c4;border-radius:2px}.ic.cal:after{left:13px;top:18px;width:18px;height:2px;background:#b1b8c4}.ic.user:before{left:15px;top:11px;width:12px;height:12px;border:2px solid #b1b8c4;border-radius:50%}.ic.user:after{left:12px;top:26px;width:18px;height:9px;border:2px solid #b1b8c4;border-top-left-radius:10px;border-top-right-radius:10px;border-bottom:0}.fld input{width:100%;height:100%;border:0;outline:none;padding:0 14px;font-size:18px;color:#2f3640;background:transparent}.fld input::placeholder{color:#a0a8b5}.meta{margin-top:10px;display:flex;align-items:center;gap:8px;color:#707a89;font-size:14px}.dot{width:9px;height:9px;border-radius:50%;border:1px solid #7f8795;position:relative}.dot:after{content:'';position:absolute;inset:2px;border-radius:50%;background:#6f7786}.policy{margin-top:16px;color:#6c7685;font-size:14px}.policy span{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;margin-left:6px;border-radius:50%;background:#e9f4fb;color:#3a94d6;font-size:12px;font-weight:700}.guide{margin:14px 0 4px;padding:16px 18px;border:1px solid #e2eef8;background:#f9fcfe;color:#647083;font-size:15px;line-height:1.6}.act,.cancel{width:100%;min-height:50px;margin-top:14px;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;font-size:19px;font-weight:700;letter-spacing:.02em}.act{background:var(--b);color:#fff;transition:.18s}.act:hover:not(:disabled){background:var(--bd)}.act:disabled{opacity:.55;cursor:not-allowed}.alt{margin-top:12px;color:#6f7a88;text-align:center;width:100%;text-decoration:underline}.or{margin-top:10px;text-align:center;color:#6b7482;font-size:16px}.cancel{background:#edf1f5;color:#6d7784}.cancel:hover{background:#e3e8ef}.note{max-width:1180px;margin:18px auto 0;color:#8d95a3;text-align:center;font-size:13px}@media (max-width:980px){.st{font-size:31px}.lb{font-size:18px}.dc{grid-template-columns:1fr}.qs{border-right:0;border-bottom:1px solid #f1f4f8}.title{font-size:30px}}@media (max-width:720px){.pg{padding:12px}.sel{min-height:auto;padding:12px 0}.sc{padding:16px 16px 14px}.logo{margin-top:18px}.st{margin:18px 0;font-size:27px}.row{min-height:72px;padding:14px}.lb{font-size:15px}.nt{font-size:14px;padding:12px}.qs,.fs{padding:22px 16px}.qh{font-size:18px}.qf{width:202px;height:202px;padding:18px}.am{font-size:38px}.title{font-size:24px}.tab,.fld input,.act,.cancel{font-size:16px}}
</style></head><body><div class="pg"><section class="screen sel" data-screen="selector"><div class="sc"><div class="top"><a class="back" href="${escapedFailedUrl}"><span class="ar" aria-hidden="true"></span><span>Quay lại</span></a><button class="lang" type="button"><span class="flag en" aria-hidden="true"></span><span>En</span></button></div><div class="logo" aria-label="VNPAY"><span class="mark" aria-hidden="true"></span><span class="word">VN<span>PAY</span><small>QR</small></span></div><h1 class="st">Chọn phương thức thanh toán</h1><div class="methods"><button class="row" type="button" data-method="qr"><span class="lb">Ứng dụng thanh toán hỗ trợ <strong>VNPAY</strong></span><span class="qrmini"><img src="${qrImage}" alt=""/></span></button><button class="row" type="button" data-method="bank"><span class="lb">Thẻ nội địa và tài khoản ngân hàng</span><span class="card" aria-hidden="true"></span></button><button class="row" type="button" data-method="international"><span class="lb">Thẻ thanh toán quốc tế</span><span class="cards" aria-hidden="true"><span class="pill visa">VISA</span><span class="pill master">MC</span><span class="pill jcb">JCB</span></span></button><button class="row" type="button" data-method="wallet"><span class="lb">Ví điện tử <strong>VNPAY</strong></span><span class="wallet" aria-hidden="true">VNPAY</span></button></div><div class="ft"><a class="contact" href="tel:1900555577"><span class="fi ph" aria-hidden="true"></span><span>1900.5555.77</span></a><a class="contact" href="mailto:hotrovnpay@vnpay.vn"><span class="fi ml" aria-hidden="true"></span><span>hotrovnpay@vnpay.vn</span></a><div class="secure"><span class="check" aria-hidden="true"></span><span>Secure verified</span></div></div></div></section><section class="screen" data-screen="detail" hidden><div class="ds"><header class="dh"><div class="dbrand"><span class="mark" aria-hidden="true"></span><div class="dbcopy"><small>CỔNG THANH TOÁN</small><strong>VN<span>PAY</span><small>QR</small></strong></div></div><div class="flags"><span class="flag vn" aria-hidden="true"></span><span class="flag en" aria-hidden="true"></span></div></header><div class="nt">Quý khách vui lòng không tắt trình duyệt cho đến khi nhận được kết quả giao dịch từ website. Xin cảm ơn!</div><div class="dc"><aside class="qs"><h2 class="qh">Ứng dụng mobile<br/>quét mã</h2><div class="qlogo">VN<span>PAY</span><small>QR</small></div><div class="qf"><span class="qc tl" aria-hidden="true"></span><span class="qc tr" aria-hidden="true"></span><span class="qc bl" aria-hidden="true"></span><span class="qc br" aria-hidden="true"></span><img src="${qrImage}" alt="VNPAY QR"/></div><div class="scan">Scan to Pay</div><div class="oc">Thanh toán đơn hàng #${bookingId}</div><div class="am">${displayAmount.toLocaleString('vi-VN')} VND</div><div class="help">Hướng dẫn thanh toán?</div><div class="txn">${escapedBookingCode} · ${escapedMaskedTxn}</div><div class="banks"><p>Sử dụng ứng dụng hỗ trợ <strong>VNPAYQR</strong></p><div class="grid"><span class="chip">Vietcombank</span><span class="chip">Agribank</span><span class="chip">BIDV</span><span class="chip">VietinBank</span><span class="chip">IVB</span><span class="chip">Eximbank</span><span class="chip">Nam A Bank</span><span class="chip">OceanBank</span></div></div></aside><section class="fs"><h2 class="title" id="title">Thanh toán qua Ngân hàng<br/>Techcombank</h2><div class="tabs" id="tabs"><button class="tab" type="button">Internet Banking</button><button class="tab on" type="button">Thẻ ATM</button></div><div class="panel on" id="bank-panel"><label class="fld"><span class="ico ic card" aria-hidden="true"></span><input id="card-number" type="text" inputmode="numeric" autocomplete="cc-number" placeholder="Số thẻ" maxlength="23"/></label><label class="fld"><span class="ico ic cal" aria-hidden="true"></span><input id="card-expiry" type="text" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5"/></label><div class="meta"><span class="dot" aria-hidden="true"></span><span id="validity">Ngày hiệu lực</span></div><label class="fld"><span class="ico ic user" aria-hidden="true"></span><input id="card-holder" type="text" autocomplete="cc-name" placeholder="Tên chủ thẻ không dấu"/></label><div class="policy">Điều kiện sử dụng dịch vụ <span>?</span></div><button class="act" id="confirm" type="button" disabled>XÁC THỰC</button><button class="alt" type="button" data-action="back">Chọn lại phương thức</button><div class="or">Hoặc</div><a class="cancel" href="${escapedFailedUrl}">HỦY</a></div><div class="panel" id="guide-panel"><div class="guide" id="guide-copy">Mở ứng dụng ngân hàng hoặc ứng dụng VNPAY để quét mã bên trái, sau đó tiếp tục để mô phỏng callback thành công.</div><button class="act" id="guide-btn" type="button">TÔI ĐÃ QUÉT MÃ</button><button class="alt" type="button" data-action="back">Chọn lại phương thức</button><div class="or">Hoặc</div><a class="cancel" href="${escapedFailedUrl}">HỦY</a></div></section></div><div class="note">Simulator chỉ phục vụ kiểm thử luồng booking, không kết nối cổng thanh toán thật.</div></div></section></div><script>(function(){var successUrl=${JSON.stringify(successUrl)};var selector=document.querySelector('[data-screen="selector"]');var detail=document.querySelector('[data-screen="detail"]');var title=document.getElementById('title');var tabs=document.getElementById('tabs');var bankPanel=document.getElementById('bank-panel');var guidePanel=document.getElementById('guide-panel');var guideCopy=document.getElementById('guide-copy');var guideBtn=document.getElementById('guide-btn');var validity=document.getElementById('validity');var confirmBtn=document.getElementById('confirm');var cardNumber=document.getElementById('card-number');var cardExpiry=document.getElementById('card-expiry');var cardHolder=document.getElementById('card-holder');var cfg={qr:{title:'Thanh toán bằng QR<br/>ứng dụng hỗ trợ VNPAY',panel:'guide',guide:'Mở ứng dụng ngân hàng hoặc ứng dụng VNPAY để quét mã bên trái, sau đó bấm tiếp tục để mô phỏng callback thanh toán thành công.',button:'TÔI ĐÃ QUÉT MÃ'},bank:{title:'Thanh toán qua Ngân hàng<br/>Techcombank',panel:'bank',validity:'Ngày hiệu lực'},international:{title:'Thanh toán qua thẻ<br/>quốc tế',panel:'bank',validity:'Ngày hết hạn'},wallet:{title:'Thanh toán bằng<br/>ví điện tử VNPAY',panel:'guide',guide:'Đăng nhập ví VNPAY để xác nhận giao dịch giả lập. Khi hoàn tất, bấm tiếp tục để quay về hệ thống booking.',button:'TIẾP TỤC'}};function show(screen){var isSelector=screen==='selector';selector.hidden=!isSelector;detail.hidden=isSelector}function digits(v){return String(v||'').replace(/\\D/g,'')}function fmtCard(v){return digits(v).slice(0,19).replace(/(.{4})/g,'$1 ').trim()}function fmtExpiry(v){var d=digits(v).slice(0,4);return d.length<=2?d:d.slice(0,2)+'/'+d.slice(2)}function okExpiry(v){if(!/^\\d{2}\\/\\d{2}$/.test(v)){return false}var p=v.split('/');var m=Number(p[0]);return m>=1&&m<=12&&Number(p[1])>=0}function okCard(){return digits(cardNumber.value).length>=12&&okExpiry(cardExpiry.value)&&cardHolder.value.trim().replace(/\\s+/g,' ').length>=4}function sync(){confirmBtn.disabled=!okCard()}function open(method){var c=cfg[method]||cfg.bank;title.innerHTML=c.title;if(c.panel==='bank'){tabs.style.display=method==='bank'?'grid':'none';validity.textContent=c.validity||'Ngày hiệu lực';bankPanel.classList.add('on');guidePanel.classList.remove('on');sync();setTimeout(function(){cardNumber.focus()},60)}else{tabs.style.display='none';guideCopy.textContent=c.guide;guideBtn.textContent=c.button;guidePanel.classList.add('on');bankPanel.classList.remove('on')}show('detail')}document.querySelectorAll('[data-method]').forEach(function(btn){btn.addEventListener('click',function(){open(btn.getAttribute('data-method'))})});document.querySelectorAll('[data-action="back"]').forEach(function(btn){btn.addEventListener('click',function(){show('selector')})});cardNumber.addEventListener('input',function(){cardNumber.value=fmtCard(cardNumber.value);sync()});cardExpiry.addEventListener('input',function(){cardExpiry.value=fmtExpiry(cardExpiry.value);sync()});cardHolder.addEventListener('input',function(){cardHolder.value=cardHolder.value.toUpperCase().replace(/[^A-Z\\s]/g,'').replace(/\\s{2,}/g,' ').trimStart();sync()});cardHolder.addEventListener('blur',function(){cardHolder.value=cardHolder.value.trim().replace(/\\s{2,}/g,' ');sync()});confirmBtn.addEventListener('click',function(){if(!confirmBtn.disabled){window.location.href=successUrl}});guideBtn.addEventListener('click',function(){window.location.href=successUrl})}());</script></body></html>`);
};

const handleVnpayReturn = async (req, res, next) => {
  try {
    const isValid = vnpayService.verifySignature(req.query);
    if (!isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid VNPAY signature',
        data: null
      });
    }

    const bookingId = Number(req.query.booking_id);
    const transactionCode = req.query.vnp_TxnRef;
    const responseCode = req.query.vnp_ResponseCode || '99';

    if (!bookingId || !transactionCode) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing booking_id or vnp_TxnRef',
        data: null
      });
    }

    const booking = await bookingService.finalizeVnpayPayment({
      bookingId,
      transactionCode,
      responseCode
    });

    const status = responseCode === '00' ? 'success' : 'failed';
    const redirectUrl = buildClientRedirectUrl(status, booking?.id || bookingId, transactionCode);

    if ((req.headers.accept || '').includes('application/json') || req.query.format === 'json') {
      return successResponse(res, 'VNPAY return processed', {
        booking,
        status,
        redirect_url: redirectUrl
      });
    }

    return res.status(200).type('html').send(
      renderVnpayReturnPage({
        status,
        bookingId: booking?.id || bookingId,
        transactionCode,
        redirectUrl
      })
    );
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  renderVnpaySimulator,
  handleVnpayReturn
};
