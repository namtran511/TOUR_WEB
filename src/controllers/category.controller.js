const categoryService = require('../services/category.service');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const listCategories = asyncHandler(async (req, res) => {
  const result = await categoryService.listCategories(req.query);
  return successResponse(res, 'Get categories successful', result);
});

const getCategoryById = asyncHandler(async (req, res) => {
  const result = await categoryService.getCategoryById(Number(req.params.id));
  return successResponse(res, 'Get category successful', result);
});

const createCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.createCategory(req.body);
  return successResponse(res, 'Create category successful', result, 201);
});

const updateCategory = asyncHandler(async (req, res) => {
  const result = await categoryService.updateCategory(Number(req.params.id), req.body);
  return successResponse(res, 'Update category successful', result);
});

const deleteCategory = asyncHandler(async (req, res) => {
  await categoryService.deleteCategory(Number(req.params.id));
  return successResponse(res, 'Delete category successful', null);
});

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
