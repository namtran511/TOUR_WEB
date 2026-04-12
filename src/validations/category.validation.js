const { z } = require('zod');

const categoryBody = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  icon: z.string().trim().max(255).optional().or(z.literal(''))
});

const categoryIdParams = z.object({
  id: z.coerce.number().int().positive()
});

const createCategorySchema = z.object({ body: categoryBody });
const updateCategorySchema = z.object({
  params: categoryIdParams,
  body: categoryBody.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  })
});
const categoryParamsSchema = z.object({ params: categoryIdParams });
const categoryListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort_by: z.enum(['id', 'name', 'created_at']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  })
});

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryParamsSchema,
  categoryListQuerySchema
};
