const prisma = require('../config/prisma');

const createBooking = async (userId, payload) => {
  const spot = await prisma.spot.findUnique({ where: { id: payload.spot_id } });
  if (!spot) {
    const error = new Error('Spot not found');
    error.statusCode = 404;
    throw error;
  }

  const startDate = new Date(payload.date);
  const endDate = new Date(payload.end_date);
  
  if (endDate <= startDate) {
    const error = new Error('Ngày kết thúc phải lớn hơn ngày bắt đầu');
    error.statusCode = 400;
    throw error;
  }

  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  let total_price = 0;

  if(payload.package_id) {
    const spotPackage = await prisma.spotPackage.findUnique({ where: { id: payload.package_id } });
    if(spotPackage) {
      total_price += Number(spotPackage.price) * (payload.guests || 1) * daysDiff;
    }
  }

  if(payload.room_id) {
    const spaceRoom = await prisma.spotRoom.findUnique({ where: { id: payload.room_id } });
    if (!spaceRoom) {
      const error = new Error('Hạng phòng không tồn tại');
      error.statusCode = 404;
      throw error;
    }
    if (spaceRoom.quantity <= 0) {
      const error = new Error('Hạng phòng này hiện đã HẾT (Số lượng phòng trống = 0). Vui lòng chọn hạng phòng khác.');
      error.statusCode = 400;
      throw error;
    }
    if (payload.room_count && payload.room_count > spaceRoom.quantity) {
      const error = new Error(`Số lượng phòng bạn đặt (${payload.room_count}) vượt quá số phòng trống hiện đại (${spaceRoom.quantity}). Vui lòng giảm bớt.`);
      error.statusCode = 400;
      throw error;
    }
    total_price += Number(spaceRoom.price) * (payload.room_count || 1) * daysDiff;
  }

  return prisma.booking.create({
    data: {
      user_id: userId,
      spot_id: payload.spot_id,
      package_id: payload.package_id || null,
      room_id: payload.room_id || null,
      date: startDate,
      end_date: endDate,
      guests: payload.guests || 1,
      room_count: payload.room_count || 1,
      total_price,
      notes: payload.notes || null,
      status: 'PENDING'
    },
    include: {
      spot: { select: { name: true, city: true, image_url: true } },
      package: true,
      room: true
    }
  });
};

const autoUpdateCompletedBookings = async () => {
  await prisma.booking.updateMany({
    where: { status: 'ACCEPTED', end_date: { lt: new Date() } },
    data: { status: 'COMPLETED' }
  });
};

const getUserBookings = async (userId) => {
  await autoUpdateCompletedBookings();
  return prisma.booking.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      spot: { select: { name: true, city: true, image_url: true } },
      package: true,
      room: true
    }
  });
};

const getAdminBookings = async () => {
  await autoUpdateCompletedBookings();
  return prisma.booking.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      user: { select: { full_name: true, email: true } },
      spot: { select: { name: true, city: true } },
      package: true,
      room: true
    }
  });
};

const updateBookingStatus = async (bookingId, status) => {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    throw error;
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status }
  });
};

module.exports = {
  createBooking,
  getUserBookings,
  getAdminBookings,
  updateBookingStatus
};
