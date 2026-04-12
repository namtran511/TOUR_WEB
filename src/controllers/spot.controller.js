const spotService = require('../services/spot.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const listSpots = asyncHandler(async (req, res) => {
  const result = await spotService.listSpots(req.query);
  return successResponse(res, 'Get spots successful', result);
});

const getSpotById = asyncHandler(async (req, res) => {
  const result = await spotService.getSpotById(Number(req.params.id));
  return successResponse(res, 'Get spot successful', result);
});

const createSpot = asyncHandler(async (req, res) => {
  const result = await spotService.createSpot(req.body, req.user.id);
  return successResponse(res, 'Create spot successful', result, 201);
});

const updateSpot = asyncHandler(async (req, res) => {
  const result = await spotService.updateSpot(Number(req.params.id), req.body);
  return successResponse(res, 'Update spot successful', result);
});

const deleteSpot = asyncHandler(async (req, res) => {
  await spotService.deleteSpot(Number(req.params.id));
  return successResponse(res, 'Delete spot successful', null);
});

const getNearbySpots = asyncHandler(async (req, res) => {
  const result = await spotService.getNearbySpots(req.query);
  return successResponse(res, 'Get nearby spots successful', result);
});

const searchSpots = asyncHandler(async (req, res) => {
  const result = await spotService.searchSpots(req.query, req.user ? req.user.id : null);
  return successResponse(res, 'Search spots successful', result);
});

module.exports = {
  listSpots,
  getSpotById,
  createSpot,
  updateSpot,
  deleteSpot,
  getNearbySpots,
  searchSpots
};
