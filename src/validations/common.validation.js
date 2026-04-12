const { z } = require('zod');

const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  })
});

module.exports = {
  paginationQuerySchema
};
