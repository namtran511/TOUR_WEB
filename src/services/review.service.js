const prisma = require('../config/prisma');

const recalculateAverageRating = async (spotId) => {
  const aggregate = await prisma.review.aggregate({
    where: { spot_id: spotId },
    _avg: { rating: true }
  });

  await prisma.spot.update({
    where: { id: spotId },
    data: { average_rating: Number((aggregate._avg.rating || 0).toFixed(2)) }
  });
};

const ensureSpotExists = async (spotId) => {
  const spot = await prisma.spot.findUnique({ where: { id: spotId } });
  if (!spot) {
    const error = new Error('Spot not found');
    error.statusCode = 404;
    throw error;
  }
};

const getReviewsBySpot = async (spotId) => {
  await ensureSpotExists(spotId);

  const reviews = await prisma.review.findMany({
    where: { spot_id: spotId },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          role: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  for (let r of reviews) {
    const trip = await prisma.booking.findFirst({
      where: { user_id: r.user_id, spot_id: spotId, status: 'COMPLETED' },
      orderBy: { end_date: 'desc' }
    });
    if (trip) {
      const ms = new Date(trip.end_date).getTime() - new Date(trip.date).getTime();
      const days = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)) + 1);
      if (days === 1) {
         r.trip_duration = `1 ngày`;
      } else {
         r.trip_duration = `${days} ngày ${days - 1} đêm`;
      }
    }
  }

  return reviews;
};

const createReview = async (spotId, userId, payload) => {
  await ensureSpotExists(spotId);

  // Tự động đẩy các chuyến đi quá hạn sang COMPLETED trước khi xét duyệt quyền
  await prisma.booking.updateMany({
    where: { user_id: userId, spot_id: spotId, status: 'ACCEPTED', end_date: { lt: new Date() } },
    data: { status: 'COMPLETED' }
  });

  const completedTrip = await prisma.booking.findFirst({
    where: { user_id: userId, spot_id: spotId, status: 'COMPLETED' }
  });

  if (!completedTrip) {
    const error = new Error('Bạn cần trải nghiệm/hoàn tất chuyến đi trước khi đánh giá.');
    error.statusCode = 403;
    throw error;
  }

  const existing = await prisma.review.findUnique({
    where: {
      user_id_spot_id: {
        user_id: userId,
        spot_id: spotId
      }
    }
  });

  if (existing) {
    const error = new Error('You have already reviewed this spot');
    error.statusCode = 409;
    throw error;
  }

  const review = await prisma.review.create({
    data: {
      user_id: userId,
      spot_id: spotId,
      rating: payload.rating,
      comment: payload.comment || null
    },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          role: true
        }
      }
    }
  });

  await recalculateAverageRating(spotId);
  return review;
};

const updateReview = async (reviewId, user, payload) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    const error = new Error('Review not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== 'ADMIN' && review.user_id !== user.id) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(payload.rating !== undefined && { rating: payload.rating }),
      ...(payload.comment !== undefined && { comment: payload.comment || null })
    },
    include: {
      user: {
        select: {
          id: true,
          full_name: true,
          avatar_url: true,
          role: true
        }
      }
    }
  });

  await recalculateAverageRating(review.spot_id);
  return updated;
};

const deleteReview = async (reviewId, user) => {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });

  if (!review) {
    const error = new Error('Review not found');
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== 'ADMIN' && review.user_id !== user.id) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  await prisma.review.delete({ where: { id: reviewId } });
  await recalculateAverageRating(review.spot_id);
  return null;
};

module.exports = {
  getReviewsBySpot,
  createReview,
  updateReview,
  deleteReview
};
