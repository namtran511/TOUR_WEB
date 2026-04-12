const express = require('express');
const authRoutes = require('./auth.routes');
const categoryRoutes = require('./category.routes');
const spotRoutes = require('./spot.routes');
const reviewRoutes = require('./review.routes');
const favoriteRoutes = require('./favorite.routes');
const mapRoutes = require('./map.routes');
const bookingRoutes = require('./booking.routes');

const router = express.Router();

router.get('/', (req, res) => {
  return res.status(200).json({
    status: 'success',
    message: 'Travel Spot Finder API',
    data: null
  });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/spots', spotRoutes);
router.use('/reviews', reviewRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/map', mapRoutes);
router.use('/bookings', bookingRoutes);

module.exports = router;
