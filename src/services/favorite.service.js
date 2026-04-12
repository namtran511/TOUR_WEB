const prisma = require('../config/prisma');
const { getPagination } = require('../utils/pagination');

const listFavorites = async (userId, query) => {
  const { page, limit, skip } = getPagination(query);

  const [items, total] = await Promise.all([
    prisma.favorite.findMany({
      where: { user_id: userId },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        spot: {
          include: {
            category: true,
            images: true,
            _count: {
              select: {
                reviews: true,
                favorites: true
              }
            }
          }
        }
      }
    }),
    prisma.favorite.count({ where: { user_id: userId } })
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  };
};

const addFavorite = async (userId, spotId) => {
  const spot = await prisma.spot.findUnique({ where: { id: spotId } });
  if (!spot) {
    const error = new Error('Spot not found');
    error.statusCode = 404;
    throw error;
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      user_id_spot_id: {
        user_id: userId,
        spot_id: spotId
      }
    }
  });

  if (existing) {
    const error = new Error('Spot already in favorites');
    error.statusCode = 409;
    throw error;
  }

  return prisma.favorite.create({
    data: {
      user_id: userId,
      spot_id: spotId
    },
    include: {
      spot: true
    }
  });
};

const removeFavorite = async (userId, spotId) => {
  const favorite = await prisma.favorite.findUnique({
    where: {
      user_id_spot_id: {
        user_id: userId,
        spot_id: spotId
      }
    }
  });

  if (!favorite) {
    const error = new Error('Favorite not found');
    error.statusCode = 404;
    throw error;
  }

  await prisma.favorite.delete({ where: { id: favorite.id } });
  return null;
};

module.exports = {
  listFavorites,
  addFavorite,
  removeFavorite
};
