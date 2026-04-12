const { z } = require('zod');

const favoriteParamsSchema = z.object({
  params: z.object({
    spotId: z.coerce.number().int().positive()
  })
});

const favoriteListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort_by: z.enum(['created_at']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  })
});

module.exports = {
  favoriteParamsSchema,
  favoriteListQuerySchema
};
