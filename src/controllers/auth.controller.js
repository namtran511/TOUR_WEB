const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  return successResponse(res, 'Register successful', result, 201);
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  return successResponse(res, 'Login successful', result, 200);
});

const getMe = asyncHandler(async (req, res) => {
  const result = await authService.getMe(req.user.id);
  return successResponse(res, 'Get profile successful', result, 200);
});

module.exports = {
  register,
  login,
  getMe
};
