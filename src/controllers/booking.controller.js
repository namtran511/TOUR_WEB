const bookingService = require('../services/booking.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const createBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.createBooking(req.user.id, req.body);
  return successResponse(res, 'Booking created successfully', result, 201);
});

const getUserBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getUserBookings(req.user.id);
  return successResponse(res, 'Get user bookings successful', result);
});

const getAdminBookings = asyncHandler(async (req, res) => {
  const result = await bookingService.getAdminBookings();
  return successResponse(res, 'Get all bookings successful', result);
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const result = await bookingService.updateBookingStatus(Number(req.params.id), req.body.status);
  return successResponse(res, 'Booking status updated successfully', result);
});

const payBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.payBooking(Number(req.params.id), req.user.id, req.body);
  return successResponse(res, 'Booking payment updated successfully', result);
});

const cancelBooking = asyncHandler(async (req, res) => {
  const result = await bookingService.cancelBooking(Number(req.params.id), req.user.id, req.body.reason);
  return successResponse(res, 'Booking cancelled successfully', result);
});

const getBookingTicket = asyncHandler(async (req, res) => {
  const result = await bookingService.getBookingTicket(Number(req.params.id), req.user);
  return successResponse(res, 'Get booking ticket successful', result);
});

module.exports = {
  createBooking,
  getUserBookings,
  getAdminBookings,
  updateBookingStatus,
  payBooking,
  cancelBooking,
  getBookingTicket
};
