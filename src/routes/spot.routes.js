const express = require('express');
const spotController = require('../controllers/spot.controller');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');
const authorizeRoles = require('../middlewares/role.middleware');
const {
  createSpotSchema,
  updateSpotSchema,
  spotParamsSchema,
  spotListQuerySchema,
  nearbyQuerySchema,
  searchQuerySchema
} = require('../validations/spot.validation');

const router = express.Router();

/**
 * @swagger
 * /api/spots:
 *   get:
 *     summary: Get spot list
 *     tags: [Spots]
 *     responses:
 *       200:
 *         description: Get spots successful
 *   post:
 *     summary: Create spot
 *     tags: [Spots]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SpotInput'
 *     responses:
 *       201:
 *         description: Create spot successful
 *
 * /api/spots/search:
 *   get:
 *     summary: Search spots by keyword, category, city
 *     tags: [Spots]
 *     responses:
 *       200:
 *         description: Search spots successful
 *
 * /api/spots/nearby:
 *   get:
 *     summary: Get nearby spots by Haversine distance
 *     tags: [Spots]
 *     responses:
 *       200:
 *         description: Get nearby spots successful
 *
 * /api/spots/{id}:
 *   get:
 *     summary: Get spot detail
 *     tags: [Spots]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Get spot successful
 *   put:
 *     summary: Update spot
 *     tags: [Spots]
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
 *         description: Update spot successful
 *   delete:
 *     summary: Delete spot
 *     tags: [Spots]
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
 *         description: Delete spot successful
 */

router.get('/', validate(spotListQuerySchema), spotController.listSpots);
router.get('/nearby', validate(nearbyQuerySchema), spotController.getNearbySpots);
router.get('/search', validate(searchQuerySchema), spotController.searchSpots);
router.get('/:id', validate(spotParamsSchema), spotController.getSpotById);
router.post('/', authenticate, authorizeRoles('ADMIN'), validate(createSpotSchema), spotController.createSpot);
router.put('/:id', authenticate, authorizeRoles('ADMIN'), validate(updateSpotSchema), spotController.updateSpot);
router.delete('/:id', authenticate, authorizeRoles('ADMIN'), validate(spotParamsSchema), spotController.deleteSpot);

module.exports = router;
