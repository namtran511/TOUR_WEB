const express = require('express');
const categoryController = require('../controllers/category.controller');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  createCategorySchema,
  updateCategorySchema,
  categoryParamsSchema,
  categoryListQuerySchema
} = require('../validations/category.validation');

const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Get category list
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Get categories successful
 *   post:
 *     summary: Create category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Create category successful
 *
 * /api/categories/{id}:
 *   get:
 *     summary: Get category detail
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Get category successful
 *   put:
 *     summary: Update category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Update category successful
 *   delete:
 *     summary: Delete category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Delete category successful
 */

router.get('/', validate(categoryListQuerySchema), categoryController.listCategories);
router.get('/:id', validate(categoryParamsSchema), categoryController.getCategoryById);
router.post('/', authenticate, authorizeRoles('ADMIN'), validate(createCategorySchema), categoryController.createCategory);
router.put('/:id', authenticate, authorizeRoles('ADMIN'), validate(updateCategorySchema), categoryController.updateCategory);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), validate(categoryParamsSchema), categoryController.deleteCategory);

module.exports = router;
