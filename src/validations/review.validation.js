const { z } = require('zod');

const reviewBody = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal(''))
});

const reviewIdParams = z.object({ id: z.coerce.number().int().positive() });
const spotIdParams = z.object({ spotId: z.coerce.number().int().positive() });

const createReviewSchema = z.object({
  params: spotIdParams,
  body: reviewBody
});

const updateReviewSchema = z.object({
  params: reviewIdParams,
  body: reviewBody.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  })
});

const reviewParamsSchema = z.object({ params: reviewIdParams });
const spotReviewParamsSchema = z.object({ params: spotIdParams });

module.exports = {
  createReviewSchema,
  updateReviewSchema,
  reviewParamsSchema,
  spotReviewParamsSchema
};
