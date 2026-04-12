const { z } = require('zod');

const createBookingSchema = z.object({
  body: z.object({
    spot_id: z.number().int().positive(),
    package_id: z.number().int().positive().optional(),
    room_id: z.number().int().positive().optional(),
    date: z.string().datetime(),
    end_date: z.string().datetime(),
    guests: z.number().int().min(1).max(50).optional(),
    room_count: z.number().int().min(1).max(20).optional(),
    notes: z.string().optional()
  })
});

const updateBookingStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'COMPLETED'])
  })
});

module.exports = {
  createBookingSchema,
  updateBookingStatusSchema
};
