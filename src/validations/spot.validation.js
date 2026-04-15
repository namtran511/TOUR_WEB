const { z } = require('zod');

const spotBody = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(3000).optional().or(z.literal('')),
  address: z.string().trim().min(3).max(255),
  city: z.string().trim().min(2).max(100),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  category_id: z.coerce.number().int().positive(),
  image_url: z.string().trim().max(255).optional().or(z.literal('')),
  opening_hours: z.string().trim().max(100).optional().or(z.literal('')),
  ticket_price: z.coerce.number().min(0).optional(),
  average_rating: z.coerce.number().min(0).max(5).optional(),
  packages: z.array(z.object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().optional(),
    price: z.coerce.number().min(0),
    duration_minutes: z.coerce.number().int().positive().optional(),
    meeting_point: z.string().trim().max(255).optional(),
    pickup_included: z.coerce.boolean().optional(),
    pickup_note: z.string().trim().max(255).optional(),
    pickup_area: z.string().trim().max(255).optional(),
    free_cancel_before_hours: z.coerce.number().int().min(0).optional(),
    refund_percent_before: z.coerce.number().int().min(0).max(100).optional(),
    refund_percent_after: z.coerce.number().int().min(0).max(100).optional()
  })).optional(),
  rooms: z.array(z.object({
    name: z.string().trim().min(1).max(150),
    description: z.string().trim().optional(),
    price: z.coerce.number().min(0),
    quantity: z.coerce.number().min(0),
    free_cancel_before_hours: z.coerce.number().int().min(0).optional(),
    refund_percent_before: z.coerce.number().int().min(0).max(100).optional(),
    refund_percent_after: z.coerce.number().int().min(0).max(100).optional()
  })).optional(),
  departures: z.array(z.object({
    label: z.string().trim().min(1).max(120),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    capacity: z.coerce.number().int().positive(),
    confirmation_type: z.enum(['INSTANT', 'MANUAL']).optional(),
    is_active: z.coerce.boolean().optional()
  })).optional()
});

const spotIdParams = z.object({
  id: z.coerce.number().int().positive()
});

const createSpotSchema = z.object({ body: spotBody });
const updateSpotSchema = z.object({
  params: spotIdParams,
  body: spotBody.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required'
  })
});
const spotParamsSchema = z.object({ params: spotIdParams });

const spotListQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort_by: z.enum(['id', 'name', 'city', 'average_rating', 'created_at']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  })
});

const nearbyQuerySchema = z.object({
  query: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().positive().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort_by: z.enum(['distance_km', 'average_rating', 'created_at']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  })
});

const searchQuerySchema = z.object({
  query: z.object({
    keyword: z.string().trim().optional(),
    category: z.coerce.number().int().positive().optional(),
    city: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    sort_by: z.enum(['id', 'name', 'city', 'average_rating', 'created_at']).optional(),
    sort_order: z.enum(['asc', 'desc']).optional()
  })
});

module.exports = {
  createSpotSchema,
  updateSpotSchema,
  spotParamsSchema,
  spotListQuerySchema,
  nearbyQuerySchema,
  searchQuerySchema
};
