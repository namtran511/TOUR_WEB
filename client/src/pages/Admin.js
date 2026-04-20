import { api } from '../api.js';
import { attachImageFallbacks, resolveImageUrl } from '../image.js';
import { showToast } from '../router.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=800&q=80';

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return 'Chưa rõ';
  return `${parseInt(value, 10).toLocaleString('vi-VN')} VND`;
}

function bookingStatusBadge(status) {
  if (status === 'ACCEPTED') return '<span class="status-badge accepted">Đã xác nhận</span>';
  if (status === 'COMPLETED') return '<span class="status-badge completed">Hoàn thành</span>';
  if (status === 'REJECTED') return '<span class="status-badge rejected">Từ chối</span>';
  if (status === 'CANCELLED') return '<span class="status-badge rejected">Đã hủy</span>';
  if (status === 'NO_SHOW') return '<span class="status-badge rejected">No-show</span>';
  return '<span class="status-badge pending">ChĐã xác nhận</span>';
}

function paymentStatusBadge(payment) {
  if (!payment) return '<span class="status-badge pending">Chưa tạo payment</span>';
  if (payment.status === 'PAID') return '<span class="status-badge accepted">Đã thanh toán</span>';
  if (payment.status === 'REFUNDED') return '<span class="status-badge completed">Đã hoàn tiền</span>';
  if (payment.status === 'PARTIALLY_REFUNDED') return '<span class="status-badge pending">Hoàn tiền 1 phần</span>';
  if (payment.status === 'FAILED') return '<span class="status-badge rejected">Payment lỗi</span>';
  if (payment.method === 'PAY_AT_DESTINATION') return '<span class="status-badge pending">Trả tại nơi đến</span>';
  return '<span class="status-badge pending">ChaĐã thanh toán</span>';
}

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
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
          <h1>Qun l departure, booking vĐã xác nhận dch v.</h1>
          <p class="lede" style="margin-top:12px;">Khu vực này dùng để tạo lịch khởi hành, cấu hình gói tour và xử lý booking lifecycle.</p>
        </div>
        <div class="button-row">
          <button id="tab-spots-btn" class="button">Địa điểm</button>
          <button id="tab-bookings-btn" class="button-secondary">Bookings</button>
        </div>
      </div>

      <section id="tab-spots" class="page">
        <div class="panel">
          <div class="filter-row">
            <input type="text" id="admin-search-input" class="form-control" placeholder="T?m t?n Địa điểm, th?nh ph?..." style="flex:1; min-width:240px;" />
            <select id="admin-sort-select" class="form-control" style="width:220px;">
              <option value="created_at,desc">Mới nhất</option>
              <option value="name,asc">Tên A-Z</option>
              <option value="city,asc">Thành phố A-Z</option>
              <option value="average_rating,desc">Đánh giá cao nhất</option>
            </select>
            <button id="admin-search-btn" class="button-secondary">Lọc</button>
            <button id="toggle-form-btn" class="button">Th?m Địa điểm</button>
          </div>
        </div>

        <div id="create-spot-form" class="panel" style="display:none;">
          <div class="section-header">
            <div>
              <p class="eyebrow">Biên tập</p>
              <h2 id="form-title">Th?m Địa điểm mi.</h2>
            </div>
          </div>
          <form id="spot-form" class="form-grid">
            <input type="hidden" id="spot-id" />
            <div class="form-grid two">
              <div class="form-group">
                <label class="form-label" for="spot-name">T?n Địa điểm</label>
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
                  <button type="button" id="add-package-btn" class="button-secondary">Thêm gói</button>
                </div>
                <div id="packages-container" class="list-stack"></div>
              </div>

              <div class="card">
                <div class="section-header">
                  <div>
                    <p class="eyebrow">Lưu trú</p>
                    <h3>Hạng phòng</h3>
                  </div>
                  <button type="button" id="add-room-btn" class="button-secondary">Thêm phòng</button>
                </div>
                <div id="rooms-container" class="list-stack"></div>
              </div>
            </div>

            <div class="card">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Departure</p>
                  <h3>Lọch kh?i h?nh</h3>
                </div>
                <button type="button" id="add-departure-btn" class="button-secondary">Thêm departure</button>
              </div>
              <div id="departures-container" class="list-stack"></div>
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
                <th>Th?nh ph?</th>
                <th>Departure</th>
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
                <th>Địa điểm</th>
                <th>Departure</th>
                <th>Tổng tiền</th>
                <th>Booking</th>
                <th>Payment</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="admin-bookings-list">
              <tr><td colspan="7"><div class="loader"></div></td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <div id="booking-modal" style="display:none; position:fixed; inset:0; background:rgba(20,20,19,0.5); z-index:120; padding:20px;">
        <div class="auth-shell" style="max-width:760px; margin:40px auto; position:relative;">
          <button id="close-booking-modal" class="button-ghost" style="position:absolute; top:16px; right:16px; width:auto;">Đóng</button>
          <div class="card-body">
            <p class="eyebrow">Chi tiết booking</p>
            <h2>Qun lĐã xác nhận v trng thi.</h2>
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
  const departuresContainer = document.getElementById('departures-container');
  const tbodySpots = document.getElementById('admin-spots-list');
  const tbodyBookings = document.getElementById('admin-bookings-list');
  const bookingModal = document.getElementById('booking-modal');
  const bookingModalContent = document.getElementById('booking-modal-content');
  const bookingModalActions = document.getElementById('booking-modal-actions');

  let localSpots = [];
  let localBookings = [];

  const packageRow = (pkg = {}) => `
    <div class="card package-item">
      <input type="hidden" class="pkg-id" value="${pkg.id || ''}" />
      <div class="form-grid two">
        <input type="text" class="pkg-name form-control" placeholder="Tên gói" value="${pkg.name || ''}" />
        <input type="number" class="pkg-price form-control" placeholder="Gi" value="${pkg.price || ''}" />
        <input type="number" class="pkg-duration form-control" placeholder="Th?i lĐóng (ph?t)" value="${pkg.duration_minutes || ''}" />
        <input type="text" class="pkg-meeting form-control" placeholder="Điểm gặp" value="${pkg.meeting_point || ''}" />
        <input type="text" class="pkg-pickup-note form-control" placeholder="Ghi chú pickup" value="${pkg.pickup_note || ''}" />
        <input type="text" class="pkg-pickup-area form-control" placeholder="Khu vực pickup" value="${pkg.pickup_area || ''}" />
        <input type="number" class="pkg-cancel-hours form-control" placeholder="Hủy mi?n ph? tr??c (gi?)" value="${pkg.free_cancel_before_hours ?? 48}" />
        <input type="number" class="pkg-refund-before form-control" placeholder="% hoàn trước hạn" value="${pkg.refund_percent_before ?? 100}" />
        <input type="number" class="pkg-refund-after form-control" placeholder="% hoàn sau hạn" value="${pkg.refund_percent_after ?? 0}" />
        <label class="chip"><input type="checkbox" class="pkg-pickup-enabled" ${pkg.pickup_included ? 'checked' : ''} style="margin-right:8px;" /> Có pickup</label>
      </div>
      <textarea class="pkg-desc form-control" placeholder="Mô tả" style="margin-top:12px;">${pkg.description || ''}</textarea>
      <div class="button-row" style="margin-top:12px; justify-content:flex-end;">
        <button type="button" class="button-danger remove-item-btn">Xóa</button>
      </div>
    </div>
  `;

  const roomRow = (room = {}) => `
    <div class="card room-item">
      <input type="hidden" class="room-id" value="${room.id || ''}" />
      <div class="form-grid two">
        <input type="text" class="room-name form-control" placeholder="Tên phòng" value="${room.name || ''}" />
        <input type="number" class="room-price form-control" placeholder="Giá / đêm" value="${room.price || ''}" />
        <input type="number" class="room-qty form-control" placeholder="S? lĐóng" value="${room.quantity || 1}" />
        <input type="number" class="room-cancel-hours form-control" placeholder="Hủy mi?n ph? tr??c (gi?)" value="${room.free_cancel_before_hours ?? 48}" />
        <input type="number" class="room-refund-before form-control" placeholder="% hoàn trước hạn" value="${room.refund_percent_before ?? 100}" />
        <input type="number" class="room-refund-after form-control" placeholder="% hoàn sau hạn" value="${room.refund_percent_after ?? 0}" />
      </div>
      <textarea class="room-desc form-control" placeholder="Mô tả" style="margin-top:12px;">${room.description || ''}</textarea>
      <div class="button-row" style="margin-top:12px; justify-content:flex-end;">
        <button type="button" class="button-danger remove-item-btn">Xóa</button>
      </div>
    </div>
  `;

  const departureRow = (departure = {}) => `
    <div class="card departure-item">
      <input type="hidden" class="departure-id" value="${departure.id || ''}" />
      <div class="form-grid two">
        <input type="text" class="departure-label form-control" placeholder="Tên departure" value="${departure.label || ''}" />
        <input type="number" class="departure-capacity form-control" placeholder="Sức chứa" value="${departure.capacity || ''}" />
        <input type="datetime-local" class="departure-start form-control" value="${toDatetimeLocal(departure.start_time)}" />
        <input type="datetime-local" class="departure-end form-control" value="${toDatetimeLocal(departure.end_time)}" />
        <select class="departure-confirmation form-control">
          <option value="MANUAL" ${departure.confirmation_type === 'MANUAL' ? 'selected' : ''}>MANUAL</option>
          <option value="INSTANT" ${departure.confirmation_type === 'INSTANT' ? 'selected' : ''}>INSTANT</option>
        </select>
        <label class="chip"><input type="checkbox" class="departure-active" ${departure.is_active ?? true ? 'checked' : ''} style="margin-right:8px;" /> Ho?t Đóng</label>
      </div>
      <div class="button-row" style="margin-top:12px; justify-content:flex-end;">
        <button type="button" class="button-danger remove-item-btn">Xóa</button>
      </div>
    </div>
  `;

  const bindRemoveButtons = () => {
    document.querySelectorAll('.remove-item-btn').forEach((button) => {
      button.onclick = () => button.closest('.card').remove();
    });
  };

  document.getElementById('add-package-btn').addEventListener('click', () => {
    packagesContainer.insertAdjacentHTML('beforeend', packageRow());
    bindRemoveButtons();
  });

  document.getElementById('add-room-btn').addEventListener('click', () => {
    roomsContainer.insertAdjacentHTML('beforeend', roomRow());
    bindRemoveButtons();
  });

  document.getElementById('add-departure-btn').addEventListener('click', () => {
    departuresContainer.insertAdjacentHTML('beforeend', departureRow());
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
    departuresContainer.innerHTML = '';
    formTitle.textContent = 'Th?m Địa điểm mi.';
  };

  const showForm = () => {
    formSection.style.display = 'block';
  };

  toggleBtn.addEventListener('click', () => {
    hideForm();
    showForm();
  });

  cancelBtn.addEventListener('click', hideForm);

  document.getElementById('close-booking-modal').addEventListener('click', () => {
    bookingModal.style.display = 'none';
  });

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
    departuresContainer.innerHTML = (spot.departures || []).map((departure) => departureRow(departure)).join('');
    bindRemoveButtons();

    formTitle.textContent = 'C?p nh?t Địa điểm.';
    showForm();
  };

  window.deleteAdminSpot = async (id) => {
    if (!confirm('B?n ch?c ch?n mu?n x?a Địa điểm n?y?')) return;

    try {
      await api.deleteSpot(id);
      showToast('?? x?a Địa điểm.');
      loadSpots();
    } catch (error) {
      showToast(error.message, 'danger');
    }
  };

  window.viewBooking = (id) => {
    const booking = localBookings.find((item) => item.id == id);
    if (!booking) return;

    bookingModalContent.innerHTML = `
      <div class="card">
        <h3>${booking.spot.name}</h3>
        <p style="margin-top:10px;">Khách hng: ${booking.user.full_name} (${booking.user.email})</p>
        <p>Mã booking: ${booking.booking_code}</p>
        <p>Khung giờ: ${booking.departure ? `${booking.departure.label} - ${new Date(booking.departure.start_time).toLocaleString('vi-VN')}` : 'Không có'}</p>
        <p>Số khách: ${booking.guests}</p>
        ${booking.package ? `<p>Gói tour: ${booking.package.name}</p>` : ''}
        ${booking.room ? `<p>Ph?ng: ${booking.room.name} x${booking.room_count}</p>` : ''}
        ${booking.voucher ? `<p>Voucher: ${booking.voucher.code}</p>` : ''}
        ${booking.meeting_point_snapshot ? `<p>Điểm gặp: ${booking.meeting_point_snapshot}</p>` : ''}
        ${booking.pickup_requested ? `<p>Pickup: ${booking.pickup_address || 'Đã yêu cầu'}</p>` : ''}
        <p>Ghi chú: ${booking.notes || 'Khng c'}</p>
        <p style="margin-top:10px;">Booking: ${bookingStatusBadge(booking.status)}</p>
        <p style="margin-top:10px;">Payment: ${paymentStatusBadge(booking.payment)}</p>
        <p class="price-tag" style="margin-top:10px;">Tổng tiền: ${formatCurrency(booking.total_price)}</p>
      </div>
    `;

    const actions = [];
    if (booking.status === 'PENDING') {
      actions.push(`<button class="button" onclick="updateStatus(${booking.id}, 'ACCEPTED')">Duyệt</button>`);
      actions.push(`<button class="button-danger" onclick="updateStatus(${booking.id}, 'REJECTED')">Từ chối</button>`);
    }
    if (booking.status === 'ACCEPTED') {
      actions.push(`<button class="button-secondary" onclick="updateStatus(${booking.id}, 'COMPLETED')">Hoàn tất</button>`);
      actions.push(`<button class="button-danger" onclick="updateStatus(${booking.id}, 'NO_SHOW')">No-show</button>`);
    }

    bookingModalActions.innerHTML = actions.length ? actions.join('') : bookingStatusBadge(booking.status);
    bookingModal.style.display = 'block';
  };

  window.updateStatus = async (id, status) => {
    if (!confirm(`Xác nhận chuyển đơn sang trạng thái ${status}?`)) return;

    try {
      await api.updateBookingStatus(id, status);
      showToast('Đã cập nhật trạng thái.');
      bookingModal.style.display = 'none';
      loadBookings();
    } catch (error) {
      showToast(error.message, 'danger');
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
              <img class="thumb" src="${resolveImageUrl(spot, FALLBACK_IMAGE)}" data-fallback-src="${FALLBACK_IMAGE}" alt="${spot.name}" />
              <div>
                <strong>${spot.name}</strong>
                <div class="meta">${spot.address || 'Cha cp nht Địa chỉ'}</div>
              </div>
            </div>
          </td>
          <td>${spot.city}</td>
          <td>${spot.departures?.length || 0}</td>
          <td>
            <div class="table-actions">
              <button class="button-secondary" onclick="editSpot(${spot.id})">Sửa</button>
              <button class="button-danger" onclick="deleteAdminSpot(${spot.id})">Xóa</button>
            </div>
          </td>
        </tr>
      `).join('');
      attachImageFallbacks(tbodySpots);
    } catch (error) {
      showToast(error.message, 'danger');
    }
  };

  const loadBookings = async () => {
    try {
      tbodyBookings.innerHTML = '<tr><td colspan="7"><div class="loader"></div></td></tr>';
      const bookings = await api.getAdminBookings();
      localBookings = bookings;

      if (!bookings.length) {
        tbodyBookings.innerHTML = '<tr><td colspan="7">Không có booking n?o.</td></tr>';
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
          <td>
            ${booking.departure ? `
              <strong>${booking.departure.label}</strong>
              <div class="meta">${new Date(booking.departure.start_time).toLocaleString('vi-VN')}</div>
            ` : 'Không có'}
          </td>
          <td>${formatCurrency(booking.total_price)}</td>
          <td>${bookingStatusBadge(booking.status)}</td>
          <td>${paymentStatusBadge(booking.payment)}</td>
          <td>
            <div class="table-actions">
              <button class="button-secondary" onclick="viewBooking(${booking.id})">Xem</button>
              ${booking.status === 'PENDING' ? `<button class="button" onclick="updateStatus(${booking.id}, 'ACCEPTED')">Duyệt</button>` : ''}
            </div>
          </td>
        </tr>
      `).join('');
    } catch (error) {
      showToast(error.message, 'danger');
    }
  };

  spotForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = document.getElementById('spot-id').value;
    const packages = Array.from(document.querySelectorAll('.package-item')).map((row) => ({
      id: parseInt(row.querySelector('.pkg-id').value, 10) || undefined,
      name: row.querySelector('.pkg-name').value.trim(),
      price: parseFloat(row.querySelector('.pkg-price').value),
      duration_minutes: parseInt(row.querySelector('.pkg-duration').value, 10) || undefined,
      meeting_point: row.querySelector('.pkg-meeting').value.trim() || undefined,
      pickup_included: row.querySelector('.pkg-pickup-enabled').checked,
      pickup_note: row.querySelector('.pkg-pickup-note').value.trim() || undefined,
      pickup_area: row.querySelector('.pkg-pickup-area').value.trim() || undefined,
      free_cancel_before_hours: parseInt(row.querySelector('.pkg-cancel-hours').value, 10) || 48,
      refund_percent_before: parseInt(row.querySelector('.pkg-refund-before').value, 10) || 100,
      refund_percent_after: parseInt(row.querySelector('.pkg-refund-after').value, 10) || 0,
      description: row.querySelector('.pkg-desc').value.trim() || undefined,
    })).filter((pkg) => pkg.name && !Number.isNaN(pkg.price));

    const rooms = Array.from(document.querySelectorAll('.room-item')).map((row) => ({
      id: parseInt(row.querySelector('.room-id').value, 10) || undefined,
      name: row.querySelector('.room-name').value.trim(),
      price: parseFloat(row.querySelector('.room-price').value),
      quantity: parseInt(row.querySelector('.room-qty').value, 10),
      free_cancel_before_hours: parseInt(row.querySelector('.room-cancel-hours').value, 10) || 48,
      refund_percent_before: parseInt(row.querySelector('.room-refund-before').value, 10) || 100,
      refund_percent_after: parseInt(row.querySelector('.room-refund-after').value, 10) || 0,
      description: row.querySelector('.room-desc').value.trim() || undefined,
    })).filter((room) => room.name && !Number.isNaN(room.price));

    const departures = Array.from(document.querySelectorAll('.departure-item')).map((row) => ({
      id: parseInt(row.querySelector('.departure-id').value, 10) || undefined,
      label: row.querySelector('.departure-label').value.trim(),
      capacity: parseInt(row.querySelector('.departure-capacity').value, 10),
      start_time: row.querySelector('.departure-start').value ? new Date(row.querySelector('.departure-start').value).toISOString() : '',
      end_time: row.querySelector('.departure-end').value ? new Date(row.querySelector('.departure-end').value).toISOString() : '',
      confirmation_type: row.querySelector('.departure-confirmation').value,
      is_active: row.querySelector('.departure-active').checked,
    })).filter((departure) => departure.label && departure.start_time && departure.end_time && !Number.isNaN(departure.capacity));

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
      departures,
    };

    if (!document.getElementById('spot-ticket-price').value) {
      delete payload.ticket_price;
    }

    try {
      if (id) {
        await api.updateSpot(id, payload);
        showToast('?? c?p nh?t Địa điểm.');
      } else {
        await api.createSpot(payload);
        showToast('?? t?o Địa điểm m?i.');
      }

      hideForm();
      loadSpots();
    } catch (error) {
      showToast(error.message, 'danger');
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
