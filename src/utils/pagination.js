const getPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const getSort = (query = {}, allowedFields = [], defaultField = 'created_at', defaultOrder = 'desc') => {
  const sortBy = allowedFields.includes(query.sort_by) ? query.sort_by : defaultField;
  const sortOrder = String(query.sort_order || defaultOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

  return { [sortBy]: sortOrder };
};

module.exports = {
  getPagination,
  getSort
};
