const mapService = require('../services/map.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const getDirections = asyncHandler(async (req, res) => {
  const result = await mapService.getDirections(req.query);
  return successResponse(res, 'Get directions successful', result);
});

module.exports = {
  getDirections
};
