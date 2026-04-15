const crypto = require('crypto');
const prisma = require('../config/prisma');
const vnpayService = require('./vnpay.service');

const ACTIVE_BOOKING_STATUSES = ['PENDING', 'ACCEPTED'];
const ROOM_BLOCKING_STATUSES = ['PENDING', 'ACCEPTED', 'COMPLETED'];
const FINAL_BOOKING_STATUSES = ['REJECTED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

const bookingInclude = {
  spot: {
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      image_url: true
    }
  },
  package: true,
  room: true,
  departure: true,
  voucher: true,
  payment: true
};

const adminBookingInclude = {
  ...bookingInclude,
  user: {
    select: {
      id: true,
      full_name: true,
      email: true
    }
  }
};

const createHttpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const roundPrice = (value) => Number(Number(value || 0).toFixed(2));
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const generateCode = (prefix) => {
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${random}`;
};

const buildPaymentDueAt = (paymentMethod, departureStart) => {
  const now = Date.now();
  const departureTime = departureStart.getTime();

  if (paymentMethod === 'PAY_NOW') {
    return new Date(now + 30 * 60 * 1000);
  }

  if (paymentMethod === 'PAY_LATER') {
    const candidate = Math.min(now + 24 * 60 * 60 * 1000, departureTime - 2 * 60 * 60 * 1000);
    return new Date(candidate > now ? candidate : now + 30 * 60 * 1000);
  }

  return null;
};

const buildConfirmationExpiry = (departureStart) => {
  const now = Date.now();
  const departureTime = departureStart.getTime();
  const candidate = Math.min(now + 6 * 60 * 60 * 1000, departureTime - 30 * 60 * 1000);
  if (candidate <= now) {
    throw createHttpError('Departure is too close to require manual confirmation', 400);
  }
  return new Date(candidate);
};

const calculateVoucherDiscount = (voucher, subtotal) => {
  if (!voucher) return 0;

  let discount = 0;
  if (voucher.type === 'PERCENT') {
    discount = subtotal * (Number(voucher.value) / 100);
  } else {
    discount = Number(voucher.value);
  }

  if (voucher.max_discount !== null && voucher.max_discount !== undefined) {
    discount = Math.min(discount, Number(voucher.max_discount));
  }

  return roundPrice(Math.min(discount, subtotal));
};

const canIssueTicket = (booking) => {
  if (!['ACCEPTED', 'COMPLETED'].includes(booking.status)) {
    return false;
  }

  if (booking.payment_method === 'PAY_AT_DESTINATION') {
    return true;
  }

  return booking.payment && booking.payment.status === 'PAID';
};

const releaseDepartureCapacity = async (tx, booking) => {
  if (!booking.departure_id) return;

  const departure = await tx.spotDeparture.findUnique({
    where: { id: booking.departure_id },
    select: { id: true, booked_count: true }
  });

  if (!departure) return;

  await tx.spotDeparture.update({
    where: { id: departure.id },
    data: {
      booked_count: Math.max(0, departure.booked_count - booking.guests)
    }
  });
};

const adjustVoucherUsage = async (tx, voucherId, delta) => {
  if (!voucherId) return;

  const voucher = await tx.voucher.findUnique({
    where: { id: voucherId },
    select: { id: true, used_count: true }
  });

  if (!voucher) return;

  await tx.voucher.update({
    where: { id: voucher.id },
    data: {
      used_count: Math.max(0, voucher.used_count + delta)
    }
  });
};

const issueTicketIfEligible = async (tx, bookingId) => {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: bookingInclude
  });

  if (!booking || booking.ticket_code || !canIssueTicket(booking)) {
    return booking;
  }

  const ticketCode = generateCode('TKT');

  return tx.booking.update({
    where: { id: booking.id },
    data: {
      ticket_code: ticketCode,
      qr_value: `ticket:${ticketCode}`
    },
    include: bookingInclude
  });
};

const resolveCancellationPolicy = (booking) => {
  if (booking.package) {
    return {
      freeCancelBeforeHours: booking.package.free_cancel_before_hours ?? 48,
      refundPercentBefore: booking.package.refund_percent_before ?? 100,
      refundPercentAfter: booking.package.refund_percent_after ?? 0
    };
  }

  if (booking.room) {
    return {
      freeCancelBeforeHours: booking.room.free_cancel_before_hours ?? 48,
      refundPercentBefore: booking.room.refund_percent_before ?? 100,
      refundPercentAfter: booking.room.refund_percent_after ?? 0
    };
  }

  return {
    freeCancelBeforeHours: 48,
    refundPercentBefore: 100,
    refundPercentAfter: 0
  };
};

const calculateRefundAmount = (booking) => {
  if (!booking.payment || booking.payment.status !== 'PAID') {
    return 0;
  }

  const now = new Date();
  const { freeCancelBeforeHours, refundPercentBefore, refundPercentAfter } = resolveCancellationPolicy(booking);
  const deadline = new Date(new Date(booking.date).getTime() - freeCancelBeforeHours * 60 * 60 * 1000);
  const percent = now <= deadline ? refundPercentBefore : refundPercentAfter;

  return roundPrice(Number(booking.payment.amount) * (percent / 100));
};

const syncBookingLifecycle = async () => {
  const now = new Date();

  const pendingConfirmations = await prisma.booking.findMany({
    where: {
      status: 'PENDING',
      expires_at: { lt: now }
    },
    include: bookingInclude
  });

  for (const booking of pendingConfirmations) {
    await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id: booking.id },
        include: bookingInclude
      });

      if (!current || current.status !== 'PENDING') return;

      await tx.booking.update({
        where: { id: current.id },
        data: {
          status: 'REJECTED',
          rejection_reason: 'Confirmation window expired'
        }
      });

      if (current.payment && current.payment.status === 'PAID') {
        await tx.payment.update({
          where: { booking_id: current.id },
          data: {
            status: 'REFUNDED',
            refunded_at: now
          }
        });
      }

      await releaseDepartureCapacity(tx, current);
      await adjustVoucherUsage(tx, current.voucher_id, -1);
    });
  }

  const paymentExpiredBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['PENDING', 'ACCEPTED'] },
      payment: {
        is: {
          status: { in: ['PENDING', 'UNPAID'] },
          due_at: { lt: now }
        }
      }
    },
    include: bookingInclude
  });

  for (const booking of paymentExpiredBookings) {
    if (booking.payment_method === 'PAY_AT_DESTINATION') {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id: booking.id },
        include: bookingInclude
      });

      if (!current || !ACTIVE_BOOKING_STATUSES.includes(current.status)) return;
      if (!current.payment || !['PENDING', 'UNPAID'].includes(current.payment.status)) return;

      await tx.booking.update({
        where: { id: current.id },
        data: {
          status: 'CANCELLED',
          cancelled_at: now,
          cancellation_reason: 'Payment due date passed'
        }
      });

      await tx.payment.update({
        where: { booking_id: current.id },
        data: {
          status: 'FAILED'
        }
      });

      await releaseDepartureCapacity(tx, current);
      await adjustVoucherUsage(tx, current.voucher_id, -1);
    });
  }

  await prisma.booking.updateMany({
    where: {
      status: 'ACCEPTED',
      end_date: { lt: now }
    },
    data: { status: 'COMPLETED' }
  });
};

const createBooking = async (userId, payload) => {
  return prisma.$transaction(async (tx) => {
    const spot = await tx.spot.findUnique({
      where: { id: payload.spot_id },
      include: {
        packages: true,
        rooms: true,
        departures: true
      }
    });

    if (!spot) {
      throw createHttpError('Spot not found', 404);
    }

    const departure = spot.departures.find((item) => item.id === payload.departure_id);
    if (!departure || !departure.is_active) {
      throw createHttpError('Departure not found or inactive', 404);
    }

    const startDate = new Date(departure.start_time);
    if (startDate <= new Date()) {
      throw createHttpError('Departure must be in the future', 400);
    }

    const packageItem = payload.package_id
      ? spot.packages.find((item) => item.id === payload.package_id)
      : null;

    const roomItem = payload.room_id
      ? spot.rooms.find((item) => item.id === payload.room_id)
      : null;

    if (payload.package_id && !packageItem) {
      throw createHttpError('Package not found for this spot', 404);
    }

    if (payload.room_id && !roomItem) {
      throw createHttpError('Room not found for this spot', 404);
    }

    if (payload.pickup_requested && (!packageItem || !packageItem.pickup_included)) {
      throw createHttpError('Pickup is not available for the selected package', 400);
    }

    const departureEndDate = new Date(departure.end_time);
    const tourDays = packageItem ? Math.max(payload.tour_days || 1, 1) : 1;
    const tourEndDate = addDays(departureEndDate, Math.max(tourDays - 1, 0));

    let endDate = roomItem
      ? new Date(payload.end_date || '')
      : new Date(tourEndDate);

    if (Number.isNaN(endDate.getTime())) {
      throw createHttpError('End date is required for room bookings', 400);
    }

    if (roomItem && packageItem && endDate < tourEndDate) {
      throw createHttpError('Room checkout must not be earlier than the selected tour duration', 400);
    }

    if (endDate <= startDate) {
      throw createHttpError('End date must be later than the departure time', 400);
    }

    const guests = payload.guests || 1;
    const roomCount = payload.room_count || 1;
    const availableSeats = departure.capacity - departure.booked_count;

    if (guests > availableSeats) {
      throw createHttpError(`Only ${availableSeats} seats left for this departure`, 400);
    }

    let roomTotal = 0;
    if (roomItem) {
      const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

      const overlappingBookings = await tx.booking.aggregate({
        _sum: {
          room_count: true
        },
        where: {
          room_id: roomItem.id,
          status: { in: ROOM_BLOCKING_STATUSES },
          NOT: [
            { end_date: { lte: startDate } },
            { date: { gte: endDate } }
          ]
        }
      });

      const reservedRooms = overlappingBookings._sum.room_count || 0;
      if (reservedRooms + roomCount > roomItem.quantity) {
        throw createHttpError(`Only ${Math.max(roomItem.quantity - reservedRooms, 0)} rooms left for the selected dates`, 400);
      }

      roomTotal = Number(roomItem.price) * roomCount * nights;
    }

    const packageTotal = packageItem ? Number(packageItem.price) * guests * tourDays : 0;
    const subtotal = roundPrice(packageTotal + roomTotal);

    let voucher = null;
    let discountAmount = 0;
    if (payload.voucher_code) {
      voucher = await tx.voucher.findUnique({
        where: { code: payload.voucher_code.toUpperCase() }
      });

      if (!voucher || !voucher.is_active) {
        throw createHttpError('Voucher is not available', 404);
      }

      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        throw createHttpError('Voucher has expired', 400);
      }

      if (voucher.usage_limit !== null && voucher.used_count >= voucher.usage_limit) {
        throw createHttpError('Voucher has reached its usage limit', 400);
      }

      if (voucher.min_booking_amount !== null && subtotal < Number(voucher.min_booking_amount)) {
        throw createHttpError(`Voucher requires a minimum subtotal of ${Number(voucher.min_booking_amount).toLocaleString('vi-VN')} VND`, 400);
      }

      discountAmount = calculateVoucherDiscount(voucher, subtotal);
    }

    const totalPrice = roundPrice(subtotal - discountAmount);
    const confirmationType = departure.confirmation_type;
    const bookingStatus = confirmationType === 'INSTANT' ? 'ACCEPTED' : 'PENDING';
    const bookingCode = generateCode('BK');
    const paymentMethod = payload.payment_method || 'PAY_NOW';
    const paymentDueAt = buildPaymentDueAt(paymentMethod, startDate);

    const booking = await tx.booking.create({
      data: {
        user_id: userId,
        spot_id: payload.spot_id,
        package_id: packageItem ? packageItem.id : null,
        room_id: roomItem ? roomItem.id : null,
        departure_id: departure.id,
        voucher_id: voucher ? voucher.id : null,
        date: startDate,
        end_date: endDate,
        guests,
        tour_days: tourDays,
        room_count: roomItem ? roomCount : 1,
        subtotal_price: subtotal,
        discount_amount: discountAmount,
        total_price: totalPrice,
        status: bookingStatus,
        payment_method: paymentMethod,
        confirmation_type: confirmationType,
        expires_at: bookingStatus === 'PENDING' ? buildConfirmationExpiry(startDate) : null,
        confirmed_at: bookingStatus === 'ACCEPTED' ? new Date() : null,
        notes: payload.notes || null,
        booking_code: bookingCode,
        pickup_requested: payload.pickup_requested ?? false,
        pickup_address: payload.pickup_requested ? payload.pickup_address || null : null,
        meeting_point_snapshot: packageItem?.meeting_point || spot.address || null
      },
      include: bookingInclude
    });

    await tx.payment.create({
      data: {
        booking_id: booking.id,
        amount: totalPrice,
        method: paymentMethod,
        status: paymentMethod === 'PAY_AT_DESTINATION' ? 'UNPAID' : 'PENDING',
        due_at: paymentDueAt
      }
    });

    await tx.spotDeparture.update({
      where: { id: departure.id },
      data: {
        booked_count: {
          increment: guests
        }
      }
    });

    if (voucher) {
      await tx.voucher.update({
        where: { id: voucher.id },
        data: {
          used_count: {
            increment: 1
          }
        }
      });
    }

    await issueTicketIfEligible(tx, booking.id);

    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude
    });
  });
};

const getUserBookings = async (userId) => {
  await syncBookingLifecycle();

  return prisma.booking.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: bookingInclude
  });
};

const getAdminBookings = async () => {
  await syncBookingLifecycle();

  return prisma.booking.findMany({
    orderBy: { created_at: 'desc' },
    include: adminBookingInclude
  });
};

const updateBookingStatus = async (bookingId, status) => {
  await syncBookingLifecycle();

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude
    });

    if (!booking) {
      throw createHttpError('Booking not found', 404);
    }

    if (status === 'ACCEPTED') {
      if (booking.status !== 'PENDING') {
        throw createHttpError('Only pending bookings can be accepted', 400);
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'ACCEPTED',
          confirmed_at: new Date(),
          rejection_reason: null
        }
      });

      await issueTicketIfEligible(tx, booking.id);
    } else if (status === 'REJECTED') {
      if (booking.status !== 'PENDING') {
        throw createHttpError('Only pending bookings can be rejected', 400);
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: 'REJECTED',
          rejection_reason: 'Rejected by admin'
        }
      });

      await releaseDepartureCapacity(tx, booking);
      await adjustVoucherUsage(tx, booking.voucher_id, -1);

      if (booking.payment && booking.payment.status === 'PAID') {
        await tx.payment.update({
          where: { booking_id: booking.id },
          data: {
            status: 'REFUNDED',
            refunded_at: new Date()
          }
        });
      }
    } else if (status === 'COMPLETED') {
      if (booking.status !== 'ACCEPTED') {
        throw createHttpError('Only accepted bookings can be completed', 400);
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' }
      });
    } else if (status === 'NO_SHOW') {
      if (booking.status !== 'ACCEPTED') {
        throw createHttpError('Only accepted bookings can be marked as no-show', 400);
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'NO_SHOW' }
      });
    }

    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude
    });
  });
};

const payBooking = async (bookingId, userId, payload = {}) => {
  await syncBookingLifecycle();

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude
    });

    if (!booking || booking.user_id !== userId) {
      throw createHttpError('Booking not found', 404);
    }

    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
      throw createHttpError('Only active bookings can be paid', 400);
    }

    if (!booking.payment) {
      throw createHttpError('Payment record not found', 404);
    }

    if (booking.payment.status === 'PAID') {
      throw createHttpError('Booking is already paid', 400);
    }

    const provider = payload.provider || 'MANUAL';

    if (provider === 'VNPAY') {
      if (!['PAY_NOW', 'PAY_LATER'].includes(booking.payment_method)) {
        throw createHttpError('VNPAY simulation is only available for online payment methods', 400);
      }

      const transactionCode = booking.payment.transaction_code || generateCode('VNPAY');

      await tx.payment.update({
        where: { booking_id: booking.id },
        data: {
          status: 'PENDING',
          paid_at: null,
          transaction_code: transactionCode
        }
      });

      const refreshedBooking = await tx.booking.findUnique({
        where: { id: booking.id },
        include: bookingInclude
      });

      return {
        ...refreshedBooking,
        payment_provider: 'VNPAY',
        payment_url: vnpayService.createSimulationPaymentUrl({
          booking: refreshedBooking,
          transactionCode
        })
      };
    }

    await tx.payment.update({
      where: { booking_id: booking.id },
      data: {
        status: 'PAID',
        paid_at: new Date(),
        transaction_code: payload.transaction_code || generateCode('PAY')
      }
    });

    await issueTicketIfEligible(tx, booking.id);

    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude
    });
  });
};

const finalizeVnpayPayment = async ({ bookingId, transactionCode, responseCode }) => {
  await syncBookingLifecycle();

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude
    });

    if (!booking) {
      throw createHttpError('Booking not found', 404);
    }

    if (!booking.payment) {
      throw createHttpError('Payment record not found', 404);
    }

    if (booking.payment.transaction_code && transactionCode && booking.payment.transaction_code !== transactionCode) {
      throw createHttpError('Transaction code mismatch', 400);
    }

    const isSuccess = responseCode === '00';

    if (isSuccess && booking.payment.status !== 'PAID') {
      await tx.payment.update({
        where: { booking_id: booking.id },
        data: {
          status: 'PAID',
          paid_at: new Date(),
          transaction_code: booking.payment.transaction_code || transactionCode || generateCode('VNPAY')
        }
      });

      await issueTicketIfEligible(tx, booking.id);
    }

    if (!isSuccess && ['PENDING', 'UNPAID'].includes(booking.payment.status)) {
      await tx.payment.update({
        where: { booking_id: booking.id },
        data: {
          status: 'FAILED',
          transaction_code: booking.payment.transaction_code || transactionCode || null
        }
      });
    }

    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude
    });
  });
};

const cancelBooking = async (bookingId, userId, reason) => {
  await syncBookingLifecycle();

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude
    });

    if (!booking || booking.user_id !== userId) {
      throw createHttpError('Booking not found', 404);
    }

    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
      throw createHttpError('Only pending or accepted bookings can be cancelled', 400);
    }

    if (new Date(booking.end_date) < new Date()) {
      throw createHttpError('Past bookings can no longer be cancelled', 400);
    }

    const refundAmount = calculateRefundAmount(booking);

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CANCELLED',
        cancelled_at: new Date(),
        cancellation_reason: reason || null,
        refund_amount: refundAmount
      }
    });

    await releaseDepartureCapacity(tx, booking);
    await adjustVoucherUsage(tx, booking.voucher_id, -1);

    if (booking.payment && booking.payment.status === 'PAID') {
      const nextStatus = refundAmount >= Number(booking.payment.amount) ? 'REFUNDED' : refundAmount > 0 ? 'PARTIALLY_REFUNDED' : 'PAID';

      await tx.payment.update({
        where: { booking_id: booking.id },
        data: {
          status: nextStatus,
          refunded_at: refundAmount > 0 ? new Date() : booking.payment.refunded_at
        }
      });
    }

    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingInclude
    });
  });
};

const getBookingTicket = async (bookingId, user) => {
  await syncBookingLifecycle();

  return prisma.$transaction(async (tx) => {
    let booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        ...adminBookingInclude
      }
    });

    if (!booking) {
      throw createHttpError('Booking not found', 404);
    }

    if (user.role !== 'ADMIN' && booking.user_id !== user.id) {
      throw createHttpError('Forbidden', 403);
    }

    if (!['ACCEPTED', 'COMPLETED'].includes(booking.status)) {
      throw createHttpError('Ticket is only available after booking confirmation', 400);
    }

    if (booking.payment_method !== 'PAY_AT_DESTINATION' && booking.payment?.status !== 'PAID') {
      throw createHttpError('Ticket is only available after payment', 400);
    }

    await issueTicketIfEligible(tx, booking.id);
    booking = await tx.booking.findUnique({
      where: { id: booking.id },
      include: adminBookingInclude
    });

    return {
      booking_id: booking.id,
      booking_code: booking.booking_code,
      ticket_code: booking.ticket_code,
      qr_value: booking.qr_value,
      status: booking.status,
      tour_days: booking.tour_days,
      end_date: booking.end_date,
      traveler: booking.user ? booking.user.full_name : undefined,
      spot: booking.spot.name,
      departure: booking.departure,
      meeting_point: booking.meeting_point_snapshot,
      pickup_requested: booking.pickup_requested,
      pickup_address: booking.pickup_address,
      payment_status: booking.payment?.status || null
    };
  });
};

module.exports = {
  createBooking,
  getUserBookings,
  getAdminBookings,
  updateBookingStatus,
  payBooking,
  finalizeVnpayPayment,
  cancelBooking,
  getBookingTicket
};
