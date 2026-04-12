const express = require('express');
const reviewController = require('../controllers/review.controller');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');
const {
  createReviewSchema,
  updateReviewSchema,
  reviewParamsSchema,
  spotReviewParamsSchema
} = require('../validations/review.validation');

const router = express.Router();

/**
 * @swagger
 * /api/reviews/spot/{spotId}:
 *   get:
 *     summary: Get reviews by spot
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: spotId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Get reviews successful
 *   post:
 *     summary: Create review for a spot
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: spotId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewInput'
 *     responses:
 *       201:
 *         description: Create review successful
 *
 * /api/reviews/{id}:
 *   put:
 *     summary: Update review
 *     tags: [Reviews]
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
 *         description: Update review successful
 *   delete:
 *     summary: Delete review
 *     tags: [Reviews]
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
 *         description: Delete review successful
 */

router.get('/spot/:spotId', validate(spotReviewParamsSchema), reviewController.getReviewsBySpot);
router.post('/spot/:spotId', authenticate, validate(createReviewSchema), reviewController.createReview);
router.put('/:id', authenticate, validate(updateReviewSchema), reviewController.updateReview);
router.delete('/:id', authenticate, validate(reviewParamsSchema), reviewController.deleteReview);

module.exports = router;
