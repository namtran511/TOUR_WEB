const favoriteService = require('../services/favorite.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const listFavorites = asyncHandler(async (req, res) => {
  const result = await favoriteService.listFavorites(req.user.id, req.query);
  return successResponse(res, 'Get favorites successful', result);
});

const addFavorite = asyncHandler(async (req, res) => {
  const result = await favoriteService.addFavorite(req.user.id, Number(req.params.spotId));
  return successResponse(res, 'Add favorite successful', result, 201);
});

const removeFavorite = asyncHandler(async (req, res) => {
  await favoriteService.removeFavorite(req.user.id, Number(req.params.spotId));
  return successResponse(res, 'Remove favorite successful', null);
});

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite
};
