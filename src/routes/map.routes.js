const express = require('express');
const mapController = require('../controllers/map.controller');
const validate = require('../middlewares/validate.middleware');
const { directionsQuerySchema } = require('../validations/map.validation');

const router = express.Router();

/**
 * @swagger
 * /api/map/directions:
 *   get:
 *     summary: Get route directions from Mapbox
 *     tags: [Map]
 *     parameters:
 *       - in: query
 *         name: origin_lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: origin_lng
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: destination_lat
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: destination_lng
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Get directions successful
 */

router.get('/directions', validate(directionsQuerySchema), mapController.getDirections);

module.exports = router;
