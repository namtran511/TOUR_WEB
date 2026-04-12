const { z } = require('zod');

const directionsQuerySchema = z.object({
  query: z.object({
    origin_lat: z.coerce.number().min(-90).max(90),
    origin_lng: z.coerce.number().min(-180).max(180),
    destination_lat: z.coerce.number().min(-90).max(90),
    destination_lng: z.coerce.number().min(-180).max(180),
    profile: z.enum(['driving', 'walking', 'cycling']).optional()
  })
});

module.exports = {
  directionsQuerySchema
};
