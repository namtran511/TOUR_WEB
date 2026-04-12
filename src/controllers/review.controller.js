const reviewService = require('../services/review.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getReviewsBySpot = asyncHandler(async (req, res) => {
  const result = await reviewService.getReviewsBySpot(Number(req.params.spotId));
  return successResponse(res, 'Get reviews successful', result);
});

const createReview = asyncHandler(async (req, res) => {
  const result = await reviewService.createReview(Number(req.params.spotId), req.user.id, req.body);
  return successResponse(res, 'Create review successful', result, 201);
});

const updateReview = asyncHandler(async (req, res) => {
  const result = await reviewService.updateReview(Number(req.params.id), req.user, req.body);
  return successResponse(res, 'Update review successful', result);
});

const deleteReview = asyncHandler(async (req, res) => {
  await reviewService.deleteReview(Number(req.params.id), req.user);
  return successResponse(res, 'Delete review successful', null);
});

module.exports = {
  getReviewsBySpot,
  createReview,
  updateReview,
  deleteReview
};
