import { api } from '../api.js';
import { showToast } from '../router.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=800&q=80';

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return 'Chưa rõ';
  return `${parseInt(value, 10).toLocaleString('vi-VN')} VND`;
}

function bookingStatusBadge(status) {
  if (status === 'ACCEPTED') return '<span class="status-badge accepted">Đã duyệt</span>';
  if (status === 'COMPLETED') return '<span class="status-badge completed">Đã hoàn thành</span>';
  if (status === 'REJECTED') return '<span class="status-badge rejected">Từ chối</span>';
  return '<span class="status-badge pending">Chờ duyệt</span>';
}

export async function renderAdmin(container) {
  if (!window.currentUser || window.currentUser.role !== 'ADMIN') {
    showToast('Bạn không có quyền truy cập trang này.', 'danger');
    window.location.hash = '#/';
    return;
  }

  container.innerHTML = `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Quản trị</p>
          <h1>Quản lý điểm đến và đơn đặt.</h1>
          <p class="lede" style="margin-top:12px;">Bộ giao diện này đặt việc cập nhật nội dung và duyệt booking vào cùng một không gian biên tập thống nhất.</p>
        </div>
        <div class="button-row">
          <button id="tab-spots-btn" class="button">Địa điểm</button>
          <button id="tab-bookings-btn" class="button-secondary">Bookings</button>
        </div>
      </div>

      <section id="tab-spots" class="page">
        <div class="panel">
          <div class="filter-row">
            <input type="text" id="admin-search-input" class="form-control" placeholder="Tìm tên địa điểm, thành phố..." style="flex:1; min-width:240px;" />
            <select id="admin-sort-select" class="form-control" style="width:220px;">
              <option value="created_at,desc">Mới nhất</option>
              <option value="name,asc">Tên A-Z</option>
              <option value="name,desc">Tên Z-A</option>
              <option value="city,asc">Thành phố A-Z</option>
              <option value="average_rating,desc">Đánh giá cao nhất</option>
            </select>
            <button id="admin-search-btn" class="button-secondary"><i class='bx bx-search'></i> Lọc</button>
            <button id="toggle-form-btn" class="button"><i class='bx bx-plus'></i> Thêm địa điểm</button>
          </div>
        </div>

        <div id="create-spot-form" class="panel" style="display:none;">
          <div class="section-header">
            <div>
              <p class="eyebrow">Biên tập</p>
              <h2 id="form-title">Thêm địa điểm mới.</h2>
            </div>
          </div>
          <form id="spot-form" class="form-grid">
            <input type="hidden" id="spot-id" />
            <div class="form-grid two">
              <div class="form-group">
                <label class="form-label" for="spot-name">Tên địa điểm</label>
                <input type="text" id="spot-name" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="spot-image">URL hình ảnh</label>
                <input type="text" id="spot-image" class="form-control" placeholder="https://..." />
              </div>
              <div class="form-group">
                <label class="form-label" for="spot-city">Tỉnh / thành phố</label>
                <input type="text" id="spot-city" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="spot-address">Địa chỉ</label>
                <input type="text" id="spot-address" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="spot-ticket-price">Giá cơ bản</label>
                <input type="number" id="spot-ticket-price" class="form-control" />
              </div>
              <div class="form-group">
                <label class="form-label" for="spot-category">Danh mục</label>
                <select id="spot-category" class="form-control" required></select>
              </div>
              <div class="form-group">
                <label class="form-label" for="spot-lng">Longitude</label>
                <input type="number" step="any" id="spot-lng" class="form-control" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="spot-lat">Latitude</label>
                <input type="number" step="any" id="spot-lat" class="form-control" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="spot-description">Mô tả</label>
              <textarea id="spot-description" class="form-control"></textarea>
            </div>

            <div class="admin-grid">
              <div class="card">
                <div class="section-header">
                  <div>
                    <p class="eyebrow">Gói dịch vụ</p>
                    <h3>Gói tour</h3>
                  </div>
                  <button type="button" id="add-package-btn" class="button-secondary"><i class='bx bx-plus'></i> Thêm gói</button>
                </div>
                <div id="packages-container" class="list-stack"></div>
              </div>

              <div class="card">
                <div class="section-header">
                  <div>
                    <p class="eyebrow">Lưu trú</p>
                    <h3>Hạng phòng</h3>
                  </div>
                  <button type="button" id="add-room-btn" class="button-secondary"><i class='bx bx-plus'></i> Thêm phòng</button>
                </div>
                <div id="rooms-container" class="list-stack"></div>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" id="cancel-form-btn" class="button-ghost">Hủy</button>
              <button type="submit" class="button">Lưu thông tin</button>
            </div>
          </form>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Địa điểm</th>
                <th>Thành phố</th>
                <th>Đánh giá</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="admin-spots-list">
              <tr><td colspan="5"><div class="loader"></div></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="tab-bookings" class="page" style="display:none;">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Khách</th>
                <th>Điểm đến</th>
                <th>Lịch</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="admin-bookings-list">
              <tr><td colspan="6"><div class="loader"></div></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div id="booking-modal" style="display:none; position:fixed; inset:0; background:rgba(20,20,19,0.5); z-index:120; padding:20px;">
        <div class="auth-shell" style="max-width:720px; margin:40px auto; position:relative;">
          <button id="close-booking-modal" class="button-ghost" style="position:absolute; top:16px; right:16px; width:auto;"><i class='bx bx-x'></i></button>
          <div class="card-body">
            <p class="eyebrow">Chi tiết booking</p>
            <h2>Chi tiết đơn đặt.</h2>
            <div id="booking-modal-content" class="list-stack" style="margin-top:20px;"></div>
            <div id="booking-modal-actions" class="button-row" style="margin-top:24px;"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  const tabSpotsBtn = document.getElementById('tab-spots-btn');
  const tabBookingsBtn = document.getElementById('tab-bookings-btn');
  const tabSpots = document.getElementById('tab-spots');
  const tabBookings = document.getElementById('tab-bookings');
  const formSection = document.getElementById('create-spot-form');
  const toggleBtn = document.getElementById('toggle-form-btn');
  const cancelBtn = document.getElementById('cancel-form-btn');
  const spotForm = document.getElementById('spot-form');
  const formTitle = document.getElementById('form-title');
  const categorySelect = document.getElementById('spot-category');
  const packagesContainer = document.getElementById('packages-container');
  const roomsContainer = document.getElementById('rooms-container');
  const addPackageBtn = document.getElementById('add-package-btn');
  const addRoomBtn = document.getElementById('add-room-btn');
  const tbodySpots = document.getElementById('admin-spots-list');
  const tbodyBookings = document.getElementById('admin-bookings-list');
  const bookingModal = document.getElementById('booking-modal');
  const closeBookingModalBtn = document.getElementById('close-booking-modal');
  const bookingModalContent = document.getElementById('booking-modal-content');
  const bookingModalActions = document.getElementById('booking-modal-actions');

  let localSpots = [];
  let localBookings = [];

  const packageRow = (pkg = { name: '', price: '', description: '' }) => `
    <div class="card package-item">
      <div class="form-grid">
        <input type="text" class="pkg-name form-control" placeholder="Tên gói" value="${pkg.name || ''}" />
        <input type="number" class="pkg-price form-control" placeholder="Giá" value="${pkg.price || ''}" />
        <input type="text" class="pkg-desc form-control" placeholder="Mô tả" value="${pkg.description || ''}" />
        <button type="button" class="button-danger remove-item-btn"><i class='bx bx-trash'></i> Xóa</button>
      </div>
    </div>
  `;

  const roomRow = (room = { name: '', price: '', quantity: 1, description: '' }) => `
    <div class="card room-item">
      <div class="form-grid">
        <input type="text" class="room-name form-control" placeholder="Tên phòng" value="${room.name || ''}" />
        <input type="number" class="room-price form-control" placeholder="Giá / đêm" value="${room.price || ''}" />
        <input type="number" class="room-qty form-control" placeholder="Số lượng" value="${room.quantity || 1}" />
        <input type="text" class="room-desc form-control" placeholder="Mô tả" value="${room.description || ''}" />
        <button type="button" class="button-danger remove-item-btn"><i class='bx bx-trash'></i> Xóa</button>
      </div>
    </div>
  `;

  const bindRemoveButtons = () => {
    document.querySelectorAll('.remove-item-btn').forEach((button) => {
      button.onclick = () => button.closest('.card').remove();
    });
  };

  addPackageBtn.addEventListener('click', () => {
    packagesContainer.insertAdjacentHTML('beforeend', packageRow());
    bindRemoveButtons();
  });

  addRoomBtn.addEventListener('click', () => {
    roomsContainer.insertAdjacentHTML('beforeend', roomRow());
    bindRemoveButtons();
  });

  tabSpotsBtn.addEventListener('click', () => {
    tabSpots.style.display = 'flex';
    tabBookings.style.display = 'none';
    tabSpotsBtn.className = 'button';
    tabBookingsBtn.className = 'button-secondary';
  });

  tabBookingsBtn.addEventListener('click', () => {
    tabSpots.style.display = 'none';
    tabBookings.style.display = 'flex';
    tabSpotsBtn.className = 'button-secondary';
    tabBookingsBtn.className = 'button';
    loadBookings();
  });

  const hideForm = () => {
    formSection.style.display = 'none';
    spotForm.reset();
    document.getElementById('spot-id').value = '';
    packagesContainer.innerHTML = '';
    roomsContainer.innerHTML = '';
    formTitle.textContent = 'Thêm địa điểm mới.';
  };

  const showForm = () => {
    formSection.style.display = 'block';
  };

  toggleBtn.addEventListener('click', () => {
    hideForm();
    showForm();
  });

  cancelBtn.addEventListener('click', hideForm);

  window.editSpot = (id) => {
    const spot = localSpots.find((item) => item.id == id);
    if (!spot) return;

    document.getElementById('spot-id').value = spot.id;
    document.getElementById('spot-name').value = spot.name || '';
    document.getElementById('spot-image').value = spot.image_url || '';
    document.getElementById('spot-city').value = spot.city || '';
    document.getElementById('spot-address').value = spot.address || '';
    document.getElementById('spot-lng').value = spot.longitude || '';
    document.getElementById('spot-lat').value = spot.latitude || '';
    document.getElementById('spot-category').value = spot.category_id || '';
    document.getElementById('spot-description').value = spot.description || '';
    document.getElementById('spot-ticket-price').value = spot.ticket_price || '';

    packagesContainer.innerHTML = (spot.packages || []).map((pkg) => packageRow(pkg)).join('');
    roomsContainer.innerHTML = (spot.rooms || []).map((room) => roomRow(room)).join('');
    bindRemoveButtons();

    formTitle.textContent = 'Cập nhật địa điểm.';
    showForm();
  };

  window.deleteAdminSpot = async (id) => {
    if (!confirm('Bạn chắc chắn muốn xóa địa điểm này?')) return;

    try {
      await api.deleteSpot(id);
      showToast('Đã xóa địa điểm.');
      loadSpots();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  closeBookingModalBtn.addEventListener('click', () => {
    bookingModal.style.display = 'none';
  });

  window.viewBooking = (id) => {
    const booking = localBookings.find((item) => item.id == id);
    if (!booking) return;

    bookingModalContent.innerHTML = `
      <div class="card">
        <h3>${booking.spot.name}</h3>
        <p style="margin-top:10px;">Khách hàng: ${booking.user.full_name} (${booking.user.email})</p>
        <p>Thời gian: ${new Date(booking.date).toLocaleDateString('vi-VN')} - ${new Date(booking.end_date).toLocaleDateString('vi-VN')}</p>
        <p>Số khách: ${booking.guests}</p>
        ${booking.package ? `<p>Gói tour: ${booking.package.name}</p>` : ''}
        ${booking.room ? `<p>Phòng: ${booking.room.name} x${booking.room_count}</p>` : ''}
        <p>Ghi chú: ${booking.notes || 'Không có'}</p>
        <p class="price-tag" style="margin-top:10px;">Tổng tiền: ${formatCurrency(booking.total_price)}</p>
      </div>
    `;

    if (['PENDING', 'ACCEPTED'].includes(booking.status)) {
      bookingModalActions.innerHTML = `
        ${booking.status !== 'ACCEPTED' ? `<button class="button" onclick="updateStatus(${booking.id}, 'ACCEPTED'); document.getElementById('booking-modal').style.display='none';">Duyệt đơn</button>` : ''}
        <button class="button-secondary" onclick="updateStatus(${booking.id}, 'COMPLETED'); document.getElementById('booking-modal').style.display='none';">Hoàn tất</button>
        <button class="button-danger" onclick="updateStatus(${booking.id}, 'REJECTED'); document.getElementById('booking-modal').style.display='none';">Từ chối</button>
      `;
    } else {
      bookingModalActions.innerHTML = bookingStatusBadge(booking.status);
    }

    bookingModal.style.display = 'block';
  };

  window.updateStatus = async (id, status) => {
    if (!confirm(`Xác nhận chuyển đơn sang trạng thái ${status}?`)) return;

    try {
      await api.updateBookingStatus(id, status);
      showToast('Đã cập nhật trạng thái.');
      loadBookings();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const loadSpots = async () => {
    try {
      const search = document.getElementById('admin-search-input').value;
      const [sortBy, sortOrder] = document.getElementById('admin-sort-select').value.split(',');

      const [spots, categories] = await Promise.all([
        api.getSpots(search, sortBy, sortOrder),
        api.getCategories(),
      ]);

      localSpots = spots;
      categorySelect.innerHTML = categories.map((category) => `<option value="${category.id}">${category.name}</option>`).join('');

      if (!spots.length) {
        tbodySpots.innerHTML = '<tr><td colspan="5">Chưa có dữ liệu.</td></tr>';
        return;
      }

      tbodySpots.innerHTML = spots.map((spot) => `
        <tr>
          <td>${spot.id}</td>
          <td>
            <div class="media-inline">
              <img class="thumb" src="${spot.image_url || FALLBACK_IMAGE}" alt="${spot.name}" />
              <div>
                <strong>${spot.name}</strong>
                <div class="meta">${spot.address || 'Chưa cập nhật địa chỉ'}</div>
              </div>
            </div>
          </td>
          <td>${spot.city}</td>
          <td>${spot.average_rating || spot.averageRating || 'Chưa có'}</td>
          <td>
            <div class="table-actions">
              <button class="button-secondary" onclick="editSpot(${spot.id})"><i class='bx bx-edit'></i> Sửa</button>
              <button class="button-danger" onclick="deleteAdminSpot(${spot.id})"><i class='bx bx-trash'></i> Xóa</button>
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const loadBookings = async () => {
    try {
      tbodyBookings.innerHTML = '<tr><td colspan="6"><div class="loader"></div></td></tr>';
      const bookings = await api.getAdminBookings();
      localBookings = bookings;

      if (!bookings.length) {
        tbodyBookings.innerHTML = '<tr><td colspan="6">Không có booking nào.</td></tr>';
        return;
      }

      tbodyBookings.innerHTML = bookings.map((booking) => `
        <tr>
          <td>
            <strong>${booking.user.full_name}</strong>
            <div class="meta">${booking.user.email}</div>
          </td>
          <td>
            <strong>${booking.spot.name}</strong>
            <div class="meta">${booking.spot.city}</div>
          </td>
          <td>${new Date(booking.date).toLocaleDateString('vi-VN')} - ${new Date(booking.end_date).toLocaleDateString('vi-VN')}</td>
          <td>${formatCurrency(booking.total_price)}</td>
          <td>${bookingStatusBadge(booking.status)}</td>
          <td>
            <div class="table-actions">
              <button class="button-secondary" onclick="viewBooking(${booking.id})"><i class='bx bx-show'></i> Xem</button>
              ${booking.status !== 'COMPLETED' && booking.status !== 'REJECTED' ? `<button class="button" onclick="updateStatus(${booking.id}, 'ACCEPTED')"><i class='bx bx-check'></i> Duyệt</button>` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  spotForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = document.getElementById('spot-id').value;
    const packages = Array.from(document.querySelectorAll('.package-item')).map((row) => ({
      name: row.querySelector('.pkg-name').value,
      price: parseFloat(row.querySelector('.pkg-price').value),
      description: row.querySelector('.pkg-desc').value,
    })).filter((pkg) => pkg.name && !Number.isNaN(pkg.price));

    const rooms = Array.from(document.querySelectorAll('.room-item')).map((row) => ({
      name: row.querySelector('.room-name').value,
      price: parseFloat(row.querySelector('.room-price').value),
      quantity: parseInt(row.querySelector('.room-qty').value, 10),
      description: row.querySelector('.room-desc').value,
    })).filter((room) => room.name && !Number.isNaN(room.price));

    const payload = {
      name: document.getElementById('spot-name').value,
      description: document.getElementById('spot-description').value,
      city: document.getElementById('spot-city').value,
      address: document.getElementById('spot-address').value,
      latitude: parseFloat(document.getElementById('spot-lat').value),
      longitude: parseFloat(document.getElementById('spot-lng').value),
      category_id: parseInt(document.getElementById('spot-category').value, 10),
      image_url: document.getElementById('spot-image').value,
      ticket_price: parseFloat(document.getElementById('spot-ticket-price').value) || undefined,
      packages,
      rooms,
    };

    if (!document.getElementById('spot-ticket-price').value) {
      delete payload.ticket_price;
    }

    try {
      if (id) {
        await api.updateSpot(id, payload);
        showToast('Đã cập nhật địa điểm.');
      } else {
        await api.createSpot(payload);
        showToast('Đã tạo địa điểm mới.');
      }

      hideForm();
      loadSpots();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  document.getElementById('admin-sort-select').addEventListener('change', loadSpots);
  document.getElementById('admin-search-btn').addEventListener('click', loadSpots);
  document.getElementById('admin-search-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') loadSpots();
  });

  await loadSpots();

  const editId = localStorage.getItem('editSpotId');
  if (editId) {
    localStorage.removeItem('editSpotId');
    window.editSpot(editId);
  }
}
