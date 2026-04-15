const express = require('express');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

router.get('/vnpay/simulate', paymentController.renderVnpaySimulator);
router.get('/vnpay/return', paymentController.handleVnpayReturn);

module.exports = router;
