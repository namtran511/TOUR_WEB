const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function parseResponse(res, fallbackMessage) {
  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  let data = null;
  if (rawText) {
    if (!contentType.includes('application/json')) {
      throw new Error('Backend không trả về JSON hợp lệ.');
    }

    try {
      data = JSON.parse(rawText);
    } catch {
      throw new Error('Không đọc được phản hồi từ server.');
    }
  }

  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

async function request(path, options = {}, fallbackMessage = 'Request failed') {
  let res;

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Không kết nối được tới backend. Hãy kiểm tra server local.');
  }

  return parseResponse(res, fallbackMessage);
}

export const api = {
  login: async (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, 'Đăng nhập thất bại'),

  register: async (name, email, password) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ full_name: name, email, password }),
  }, 'Đăng ký thất bại'),

  getMe: async () => {
    try {
      return await request('/auth/me', {}, 'Không lấy được thông tin người dùng');
    } catch {
      return null;
    }
  },

  getSpots: async (query = '', sortBy = '', sortOrder = 'asc') => {
    let url = query
      ? `/spots/search?keyword=${encodeURIComponent(query)}&limit=100`
      : '/spots?limit=100';

    if (sortBy) {
      url += `&sort_by=${sortBy}&sort_order=${sortOrder}`;
    }

    const data = await request(url, {}, 'Không tải được danh sách địa điểm');
    return data?.data?.items || [];
  },

  getSpotById: async (id) => {
    const data = await request(`/spots/${id}`, {}, 'Không tìm thấy địa điểm');
    return data.data;
  },

  getReviews: async (spotId) => {
    const data = await request(`/reviews/spot/${spotId}`, {}, 'Không tải được đánh giá');
    return data.data || [];
  },

  postReview: async (spotId, rating, comment) => request(`/reviews/spot/${spotId}`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  }, 'Gửi đánh giá thất bại'),

  getFavorites: async () => {
    const data = await request('/favorites', {}, 'Không tải được danh sách yêu thích');
    return data.data?.items || [];
  },

  addFavorite: async (spotId) => request(`/favorites/${spotId}`, { method: 'POST' }, 'Thêm yêu thích thất bại'),
  removeFavorite: async (spotId) => request(`/favorites/${spotId}`, { method: 'DELETE' }, 'Bỏ yêu thích thất bại'),

  getCategories: async () => {
    const data = await request('/categories', {}, 'Không tải được danh mục');
    return data.data?.items || [];
  },

  createSpot: async (payload) => {
    const data = await request('/spots', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 'Tạo địa điểm thất bại');
    return data.data;
  },

  updateSpot: async (id, payload) => {
    const data = await request(`/spots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, 'Cập nhật địa điểm thất bại');
    return data.data;
  },

  deleteSpot: async (id) => request(`/spots/${id}`, { method: 'DELETE' }, 'Xóa địa điểm thất bại'),

  createBooking: async (payload) => {
    const data = await request('/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, 'Tạo booking thất bại');
    return data.data;
  },

  getUserBookings: async () => {
    const data = await request('/bookings/me', {}, 'Không tải được booking');
    return data.data || [];
  },

  getAdminBookings: async () => {
    const data = await request('/bookings/admin', {}, 'Không tải được booking admin');
    return data.data || [];
  },

  updateBookingStatus: async (id, status) => request(`/bookings/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, 'Cập nhật trạng thái thất bại'),

  payBooking: async (id) => {
    const data = await request(`/bookings/${id}/pay`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, 'Thanh toán booking thất bại');
    return data.data;
  },

  cancelBooking: async (id, reason = '') => {
    const data = await request(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || undefined }),
    }, 'Hủy booking thất bại');
    return data.data;
  },

  getBookingTicket: async (id) => {
    const data = await request(`/bookings/${id}/ticket`, {}, 'Không lấy được ticket');
    return data.data;
  },
};
