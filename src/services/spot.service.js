const prisma = require('../config/prisma');
const { getPagination, getSort } = require('../utils/pagination');
const { haversineDistanceKm } = require('../utils/haversine');

const spotInclude = {
  category: true,
  packages: true,
  rooms: true,
  departures: {
    orderBy: { start_time: 'asc' }
  },
  creator: {
    select: {
      id: true,
      full_name: true,
      email: true,
      role: true
    }
  },
  images: true,
  _count: {
    select: {
      favorites: true,
      reviews: true
    }
  }
};

const ensureCategoryExists = async (categoryId) => {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }
};

const listSpots = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const orderBy = getSort(query, ['id', 'name', 'city', 'average_rating', 'created_at'], 'created_at', 'desc');

  const [items, total] = await Promise.all([
    prisma.spot.findMany({
      skip,
      take: limit,
      orderBy,
      include: spotInclude
    }),
    prisma.spot.count()
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

const getSpotById = async (id) => {
  const spot = await prisma.spot.findUnique({
    where: { id },
    include: {
      ...spotInclude,
      reviews: {
        include: {
          user: {
            select: {
              id: true,
              full_name: true,
              avatar_url: true
            }
          }
        },
        orderBy: { created_at: 'desc' }
      }
    }
  });

  if (!spot) {
    const error = new Error('Spot not found');
    error.statusCode = 404;
    throw error;
  }

  return spot;
};

const createSpot = async (payload, userId) => {
  await ensureCategoryExists(payload.category_id);

  const packagesData = Array.isArray(payload.packages) && payload.packages.length > 0
    ? {
        create: payload.packages.map((p) => ({
          name: p.name,
          description: p.description,
          price: p.price,
          duration_minutes: p.duration_minutes ?? null,
          meeting_point: p.meeting_point || null,
          pickup_included: p.pickup_included ?? false,
          pickup_note: p.pickup_note || null,
          pickup_area: p.pickup_area || null,
          free_cancel_before_hours: p.free_cancel_before_hours ?? 48,
          refund_percent_before: p.refund_percent_before ?? 100,
          refund_percent_after: p.refund_percent_after ?? 0
        }))
      }
    : undefined;

  const roomsData = Array.isArray(payload.rooms) && payload.rooms.length > 0
    ? {
        create: payload.rooms.map((r) => ({
          name: r.name,
          description: r.description,
          price: r.price,
          quantity: r.quantity,
          free_cancel_before_hours: r.free_cancel_before_hours ?? 48,
          refund_percent_before: r.refund_percent_before ?? 100,
          refund_percent_after: r.refund_percent_after ?? 0
        }))
      }
    : undefined;

  const departuresData = Array.isArray(payload.departures) && payload.departures.length > 0
    ? {
        create: payload.departures.map((d) => ({
          label: d.label,
          start_time: new Date(d.start_time),
          end_time: new Date(d.end_time),
          capacity: d.capacity,
          confirmation_type: d.confirmation_type || 'MANUAL',
          is_active: d.is_active ?? true
        }))
      }
    : undefined;

  return prisma.spot.create({
    data: {
      name: payload.name,
      description: payload.description || null,
      address: payload.address,
      city: payload.city,
      latitude: payload.latitude,
      longitude: payload.longitude,
      category_id: payload.category_id,
      image_url: payload.image_url || null,
      opening_hours: payload.opening_hours || null,
      ticket_price: payload.ticket_price ?? null,
      average_rating: payload.average_rating ?? 0,
      created_by: userId,
      ...(packagesData && { packages: packagesData }),
      ...(roomsData && { rooms: roomsData }),
      ...(departuresData && { departures: departuresData })
    },
    include: spotInclude
  });
};

const updateSpot = async (id, payload) => {
  await getSpotById(id);

  if (payload.category_id !== undefined) {
    await ensureCategoryExists(payload.category_id);
  }

  let packagesData = undefined;
  if (Array.isArray(payload.packages)) {
    await prisma.spotPackage.deleteMany({ where: { spot_id: id } });
    if (payload.packages.length > 0) {
      packagesData = {
        create: payload.packages.map((p) => ({
          name: p.name,
          description: p.description,
          price: p.price,
          duration_minutes: p.duration_minutes ?? null,
          meeting_point: p.meeting_point || null,
          pickup_included: p.pickup_included ?? false,
          pickup_note: p.pickup_note || null,
          pickup_area: p.pickup_area || null,
          free_cancel_before_hours: p.free_cancel_before_hours ?? 48,
          refund_percent_before: p.refund_percent_before ?? 100,
          refund_percent_after: p.refund_percent_after ?? 0
        }))
      };
    }
  }

  let roomsData = undefined;
  if (Array.isArray(payload.rooms)) {
    await prisma.spotRoom.deleteMany({ where: { spot_id: id } });
    if (payload.rooms.length > 0) {
      roomsData = {
        create: payload.rooms.map((r) => ({
          name: r.name,
          description: r.description,
          price: r.price,
          quantity: r.quantity,
          free_cancel_before_hours: r.free_cancel_before_hours ?? 48,
          refund_percent_before: r.refund_percent_before ?? 100,
          refund_percent_after: r.refund_percent_after ?? 0
        }))
      };
    }
  }

  let departuresData = undefined;
  if (Array.isArray(payload.departures)) {
    await prisma.spotDeparture.deleteMany({ where: { spot_id: id } });
    if (payload.departures.length > 0) {
      departuresData = {
        create: payload.departures.map((d) => ({
          label: d.label,
          start_time: new Date(d.start_time),
          end_time: new Date(d.end_time),
          capacity: d.capacity,
          confirmation_type: d.confirmation_type || 'MANUAL',
          is_active: d.is_active ?? true
        }))
      };
    }
  }

  return prisma.spot.update({
    where: { id },
    data: {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.description !== undefined && { description: payload.description || null }),
      ...(payload.address !== undefined && { address: payload.address }),
      ...(payload.city !== undefined && { city: payload.city }),
      ...(payload.latitude !== undefined && { latitude: payload.latitude }),
      ...(payload.longitude !== undefined && { longitude: payload.longitude }),
      ...(payload.category_id !== undefined && { category_id: payload.category_id }),
      ...(payload.image_url !== undefined && { image_url: payload.image_url || null }),
      ...(payload.opening_hours !== undefined && { opening_hours: payload.opening_hours || null }),
      ...(payload.ticket_price !== undefined && { ticket_price: payload.ticket_price }),
      ...(payload.average_rating !== undefined && { average_rating: payload.average_rating }),
      ...(packagesData && { packages: packagesData }),
      ...(roomsData && { rooms: roomsData }),
      ...(departuresData && { departures: departuresData })
    },
    include: spotInclude
  });
};

const deleteSpot = async (id) => {
  await getSpotById(id);
  await prisma.spot.delete({ where: { id } });
  return null;
};

const getNearbySpots = async (query) => {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const radius = Number(query.radius || 10);
  const { page, limit } = getPagination(query);
  const sortBy = query.sort_by || 'distance_km';
  const sortOrder = String(query.sort_order || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

  const spots = await prisma.spot.findMany({ include: spotInclude });

  let items = spots
    .map((spot) => ({
      ...spot,
      distance_km: Number(haversineDistanceKm(lat, lng, spot.latitude, spot.longitude).toFixed(2))
    }))
    .filter((spot) => spot.distance_km <= radius);

  items.sort((a, b) => {
    const aValue = a[sortBy] ?? 0;
    const bValue = b[sortBy] ?? 0;
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const total = items.length;
  const start = (page - 1) * limit;
  items = items.slice(start, start + limit);

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

const searchSpots = async (query, userId = null) => {
  const { page, limit, skip } = getPagination(query);
  const orderBy = getSort(query, ['id', 'name', 'city', 'average_rating', 'created_at'], 'created_at', 'desc');

  const where = {
    AND: [
      query.keyword
        ? {
            OR: [
              { name: { contains: query.keyword } },
              { description: { contains: query.keyword } },
              { address: { contains: query.keyword } },
              { city: { contains: query.keyword } }
            ]
          }
        : {},
      query.category ? { category_id: Number(query.category) } : {},
      query.city ? { city: { contains: query.city } } : {}
    ]
  };

  const [items, total] = await Promise.all([
    prisma.spot.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: spotInclude
    }),
    prisma.spot.count({ where })
  ]);

  if (userId && (query.keyword || query.city)) {
    await prisma.searchHistory.create({
      data: {
        user_id: userId,
        keyword: query.keyword || query.city || null,
        latitude: null,
        longitude: null
      }
    });
  }

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

module.exports = {
  listSpots,
  getSpotById,
  createSpot,
  updateSpot,
  deleteSpot,
  getNearbySpots,
  searchSpots
};
