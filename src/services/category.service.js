const prisma = require('../config/prisma');
const { getPagination, getSort } = require('../utils/pagination');

const listCategories = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const orderBy = getSort(query, ['id', 'name', 'created_at'], 'created_at', 'desc');

  const [items, total] = await Promise.all([
    prisma.category.findMany({
      skip,
      take: limit,
      orderBy,
      include: {
        _count: {
          select: { spots: true }
        }
      }
    }),
    prisma.category.count()
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

const getCategoryById = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { spots: true }
      }
    }
  });

  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  return category;
};

const createCategory = async (payload) => {
  const existing = await prisma.category.findUnique({ where: { name: payload.name } });
  if (existing) {
    const error = new Error('Category name already exists');
    error.statusCode = 409;
    throw error;
  }

  return prisma.category.create({
    data: {
      name: payload.name,
      description: payload.description || null,
      icon: payload.icon || null
    }
  });
};

const updateCategory = async (id, payload) => {
  await getCategoryById(id);

  if (payload.name) {
    const existing = await prisma.category.findFirst({
      where: {
        name: payload.name,
        NOT: { id }
      }
    });

    if (existing) {
      const error = new Error('Category name already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  return prisma.category.update({
    where: { id },
    data: {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.description !== undefined && { description: payload.description || null }),
      ...(payload.icon !== undefined && { icon: payload.icon || null })
    }
  });
};

const deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      _count: {
        select: { spots: true }
      }
    }
  });

  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  if (category._count.spots > 0) {
    const error = new Error('Cannot delete category that still has spots');
    error.statusCode = 400;
    throw error;
  }

  await prisma.category.delete({ where: { id } });
  return null;
};

module.exports = {
  listCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};
