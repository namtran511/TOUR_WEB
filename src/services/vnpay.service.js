const crypto = require('crypto');
const { APP_BASE_URL, VNPAY_TMN_CODE, VNPAY_HASH_SECRET, VNPAY_RETURN_URL } = require('../config/env');

const DEFAULT_HASH_SECRET = 'travelspot-vnpay-simulator-secret';

const hashSecret = VNPAY_HASH_SECRET || DEFAULT_HASH_SECRET;
const simulatorBaseUrl = `${APP_BASE_URL}/api/payments/vnpay/simulate`;

const sanitizeValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const buildSignData = (params = {}) => {
  const sortedKeys = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .sort();

  return sortedKeys
    .map((key) => `${key}=${encodeURIComponent(sanitizeValue(params[key])).replace(/%20/g, '+')}`)
    .join('&');
};

const signParams = (params = {}) => {
  const signData = buildSignData(params);
  const signature = crypto
    .createHmac('sha512', hashSecret)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  return {
    signData,
    signature
  };
};

const buildSignedUrl = (baseUrl, params = {}) => {
  const cleanParams = { ...params };
  delete cleanParams.vnp_SecureHash;
  delete cleanParams.vnp_SecureHashType;

  const { signData, signature } = signParams(cleanParams);
  return `${baseUrl}?${signData}&vnp_SecureHash=${signature}`;
};

const verifySignature = (params = {}) => {
  const received = sanitizeValue(params.vnp_SecureHash).toLowerCase();
  if (!received) {
    return false;
  }

  const payload = { ...params };
  delete payload.vnp_SecureHash;
  delete payload.vnp_SecureHashType;

  const { signature } = signParams(payload);
  return signature.toLowerCase() === received;
};

const formatVnpDate = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join('');
};

const createSimulationPaymentUrl = ({ booking, transactionCode }) => {
  const amount = Math.round(Number(booking.payment?.amount || booking.total_price || 0));
  const now = new Date();
  const expiresAt = booking.payment?.due_at ? new Date(booking.payment.due_at) : new Date(now.getTime() + 15 * 60 * 1000);

  const params = {
    booking_id: booking.id,
    booking_code: booking.booking_code,
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: VNPAY_TMN_CODE || 'SIMULATOR',
    vnp_Amount: amount * 100,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: transactionCode,
    vnp_OrderInfo: `Booking ${booking.booking_code}`,
    vnp_OrderType: 'travel',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: VNPAY_RETURN_URL,
    vnp_IpAddr: '127.0.0.1',
    vnp_CreateDate: formatVnpDate(now),
    vnp_ExpireDate: formatVnpDate(expiresAt)
  };

  return buildSignedUrl(simulatorBaseUrl, params);
};

const createCallbackPayload = ({ bookingId, bookingCode, transactionCode, amount, responseCode }) => ({
  booking_id: bookingId,
  booking_code: bookingCode,
  vnp_Amount: amount,
  vnp_TxnRef: transactionCode,
  vnp_ResponseCode: responseCode,
  vnp_TransactionStatus: responseCode,
  vnp_PayDate: formatVnpDate(new Date())
});

module.exports = {
  buildSignedUrl,
  verifySignature,
  createSimulationPaymentUrl,
  createCallbackPayload
};
