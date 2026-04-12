const express = require('express');
const favoriteController = require('../controllers/favorite.controller');
const validate = require('../middlewares/validate.middleware');
const authenticate = require('../middlewares/auth.middleware');
const { favoriteParamsSchema, favoriteListQuerySchema } = require('../validations/favorite.validation');

const router = express.Router();

router.get('/', authenticate, validate(favoriteListQuerySchema), favoriteController.listFavorites);
router.post('/:spotId', authenticate, validate(favoriteParamsSchema), favoriteController.addFavorite);
router.delete('/:spotId', authenticate, validate(favoriteParamsSchema), favoriteController.removeFavorite);

module.exports = router;
