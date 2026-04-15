require('dotenv').config();

const PORT = process.env.PORT || 5000;
const fallbackAppBase = `http://localhost:${PORT}`;

const normalizeUrl = (value, fallback) => {
  if (!value || /YOUR_PUBLIC_BACKEND_DOMAIN/i.test(value)) {
    return fallback;
  }
  return value;
};

const APP_BASE_URL = normalizeUrl(process.env.APP_BASE_URL, fallbackAppBase);
const CLIENT_BASE_URL = normalizeUrl(process.env.CLIENT_BASE_URL, 'http://localhost:5173');
const VNPAY_RETURN_URL = normalizeUrl(process.env.VNPAY_RETURN_URL, `${APP_BASE_URL}/api/payments/vnpay/return`);

module.exports = {
  PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'change_me_in_real_env',
  MAPBOX_ACCESS_TOKEN: process.env.MAPBOX_ACCESS_TOKEN || '',
  APP_BASE_URL,
  CLIENT_BASE_URL,
  VNPAY_TMN_CODE: process.env.VNPAY_TMN_CODE || 'SIMULATOR',
  VNPAY_HASH_SECRET: process.env.VNPAY_HASH_SECRET || '',
  VNPAY_RETURN_URL
};
