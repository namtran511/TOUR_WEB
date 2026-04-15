const { z } = require('zod');

const createBookingSchema = z.object({
  body: z.object({
    spot_id: z.number().int().positive(),
    departure_id: z.number().int().positive(),
    package_id: z.number().int().positive().optional(),
    room_id: z.number().int().positive().optional(),
    end_date: z.string().datetime().optional(),
    guests: z.number().int().min(1).max(50).optional(),
    tour_days: z.number().int().min(1).max(30).optional(),
    room_count: z.number().int().min(1).max(20).optional(),
    notes: z.string().optional(),
    payment_method: z.enum(['PAY_NOW', 'PAY_LATER', 'PAY_AT_DESTINATION']).optional(),
    voucher_code: z.string().trim().max(50).optional(),
    pickup_requested: z.boolean().optional(),
    pickup_address: z.string().trim().max(255).optional()
  }).refine((data) => Boolean(data.package_id || data.room_id), {
    message: 'At least one package or room must be selected'
  })
});

const updateBookingStatusSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  body: z.object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'COMPLETED', 'NO_SHOW'])
  })
});

const bookingParamsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  })
});

const payBookingSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  body: z.object({
    provider: z.enum(['MANUAL', 'VNPAY']).optional(),
    transaction_code: z.string().trim().max(80).optional()
  })
});

const cancelBookingSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive()
  }),
  body: z.object({
    reason: z.string().trim().max(500).optional()
  })
});

module.exports = {
  createBookingSchema,
  updateBookingStatusSchema,
  bookingParamsSchema,
  payBookingSchema,
  cancelBookingSchema
};
