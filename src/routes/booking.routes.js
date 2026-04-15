const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  createBookingSchema,
  updateBookingStatusSchema,
  bookingParamsSchema,
  payBookingSchema,
  cancelBookingSchema
} = require('../validations/booking.validation');

router.use(authenticate);

router.post('/', authorizeRoles('USER'), validate(createBookingSchema), bookingController.createBooking);
router.get('/me', bookingController.getUserBookings);
router.get('/admin', authorizeRoles('ADMIN'), bookingController.getAdminBookings);
router.post('/:id/pay', authorizeRoles('USER'), validate(payBookingSchema), bookingController.payBooking);
router.post('/:id/cancel', authorizeRoles('USER'), validate(cancelBookingSchema), bookingController.cancelBooking);
router.get('/:id/ticket', validate(bookingParamsSchema), bookingController.getBookingTicket);
router.patch('/:id/status', authorizeRoles('ADMIN'), validate(updateBookingStatusSchema), bookingController.updateBookingStatus);

module.exports = router;
