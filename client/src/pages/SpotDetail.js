import { api } from '../api.js';
import { attachImageFallbacks, resolveImageUrl } from '../image.js';
import { showToast } from '../router.js';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function formatMoney(value, suffix = ' VND') {
  if (value === null || value === undefined || value === '') return 'Liên hệ';
  return `${parseInt(value, 10).toLocaleString('vi-VN')}${suffix}`;
}

function toDatetimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function toDateInputValue(value) {
  if (!value) return '';
  return toDatetimeLocalValue(value).slice(0, 10);
}

function formatCalendarDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  return `${date.getDate()}-${date.getMonth() + 1}`;
}

function formatCalendarWeekday(value) {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'short',
  });
}

function formatTimeRange(start, end) {
  if (!start || !end) return '';
  return `${new Date(start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(end).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function formatDateTimeDisplay(value) {
  if (!value) return 'Chưa chọn';
  return new Date(value).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function reviewList(reviews) {
  if (!reviews.length) {
    return '<div class="empty-state"><p>Chưa có đánh giá nào cho điểm đến này.</p></div>';
  }

  return reviews.map((review) => `
    <div class="list-item">
      <div class="inline-actions" style="justify-content:space-between;">
        <strong>${review.user.full_name || 'Khách'}</strong>
        <span class="chip"><i class='bx bxs-star'></i> ${review.rating}</span>
      </div>
      <p style="margin-top:10px;">${review.comment || 'Không có nhận xét.'}</p>
    </div>
  `).join('');
}

function packageMarkup(spot) {
  if (!spot.packages?.length) {
    return `<div class="card"><p>Giá cơ bản: <span class="price-tag">${formatMoney(spot.ticket_price)}</span></p></div>`;
  }

  return `
    <div class="list-stack">
      ${spot.packages.map((pkg) => `
        <article class="card">
          <div class="inline-actions" style="justify-content:space-between; align-items:flex-start; gap:24px;">
            <div>
              <h4>${pkg.name}</h4>
              <p class="meta" style="margin-top:6px;">${pkg.description || 'Gói tour dành cho khách muốn có lịch trình trọn vẹn.'}</p>
              <div class="chip-row" style="margin-top:12px;">
                ${pkg.duration_minutes ? `<span class="chip"><i class='bx bx-time-five'></i> ${pkg.duration_minutes} phút</span>` : ''}
                ${pkg.meeting_point ? `<span class="chip"><i class='bx bx-map-pin'></i> ${pkg.meeting_point}</span>` : ''}
                <span class="chip"><i class='bx bx-undo'></i> Hủy miễn phí trước ${pkg.free_cancel_before_hours}h</span>
                ${pkg.pickup_included ? `<span class="chip"><i class='bx bx-car'></i> Có pickup</span>` : ''}
              </div>
              ${pkg.pickup_note ? `<p class="meta" style="margin-top:10px;">Pickup: ${pkg.pickup_note}</p>` : ''}
            </div>
            <span class="price-tag">${formatMoney(pkg.price, ' VND / khách / ngày')}</span>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function roomMarkup(spot) {
  if (!spot.rooms?.length) {
    return '<div class="card"><p>Không có dữ liệu hạng phòng cho địa điểm này.</p></div>';
  }

  return `
    <div class="list-stack">
      ${spot.rooms.map((room) => `
        <article class="card">
          <div class="inline-actions" style="justify-content:space-between; align-items:flex-start; gap:24px;">
            <div>
              <h4>${room.name}</h4>
              <p class="meta" style="margin-top:6px;">${room.description || 'Hạng phòng được quản lý theo tồn kho.'}</p>
              <div class="chip-row" style="margin-top:12px;">
                <span class="chip"><i class='bx bx-bed'></i> Còn ${room.quantity} phòng</span>
                <span class="chip"><i class='bx bx-undo'></i> Hủy miễn phí trước ${room.free_cancel_before_hours}h</span>
              </div>
            </div>
            <div style="text-align:right;">
              <div class="price-tag">${formatMoney(room.price, ' VND / đêm')}</div>
            </div>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

export async function renderSpotDetail(container, id) {
  container.innerHTML = '<div class="loader"></div>';

  try {
    const spot = await api.getSpotById(id);
    const reviews = await api.getReviews(id);
    const favorites = window.currentUser ? await api.getFavorites() : [];
    const isFavorite = favorites.some((favorite) => favorite.spot_id == id);
    const imageUrl = resolveImageUrl(spot, FALLBACK_IMAGE);
    const averageRating = spot.averageRating || spot.average_rating || 'Chưa có';
    const departures = (spot.departures || []).filter((item) => item.is_active);

    container.innerHTML = `
      <section class="page">
        <article class="card detail-hero">
          <img src="${imageUrl}" data-fallback-src="${FALLBACK_IMAGE}" class="detail-hero-image" alt="${spot.name}" />
          <div class="detail-hero-copy">
            <p class="eyebrow">Hồ sơ điểm đến</p>
            <div class="page-header">
              <div>
                <h1>${spot.name}</h1>
                <p class="lede" style="margin-top:12px;">${spot.description || 'Điểm đến này đã có thông tin tour, lịch khởi hành và khu vực đánh giá từ cộng đồng.'}</p>
              </div>
              <div class="chip-row" style="justify-content:flex-end;">
                <span class="chip"><i class='bx bx-map-pin'></i> ${spot.address}, ${spot.city}</span>
                <span class="chip"><i class='bx bxs-star'></i> ${averageRating}</span>
              </div>
            </div>
            <div class="button-row" style="margin-top:24px;">
              ${window.currentUser ? `<button id="fav-btn" class="${isFavorite ? 'button-danger' : 'button-secondary'}"><i class='bx bxs-heart'></i> ${isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}</button>` : ''}
              ${window.currentUser && window.currentUser.role === 'ADMIN' ? `<button class="button-dark" onclick="localStorage.setItem('editSpotId', ${spot.id}); window.location.hash='#/admin';"><i class='bx bx-edit'></i> Sửa địa điểm</button>` : ''}
            </div>
          </div>
        </article>

        <section class="detail-grid">
          <div class="page">
            <section class="panel">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Tổng quan</p>
                  <h2>Thông tin chuyến đi và dịch vụ.</h2>
                </div>
              </div>
              <div class="info-grid">
                <div class="card">
                  <p class="eyebrow">Thành phố</p>
                  <h3>${spot.city}</h3>
                  <p>Việt Nam</p>
                </div>
                <div class="card">
                  <p class="eyebrow">Giá cơ bản</p>
                  <h3>${formatMoney(spot.ticket_price)}</h3>
                  <p>Mức giá tham khảo nếu không chọn thêm gói tour.</p>
                </div>
                <div class="card">
                  <p class="eyebrow">Đánh giá</p>
                  <h3>${averageRating}</h3>
                  <p>Được tổng hợp từ người dùng đã trải nghiệm.</p>
                </div>
              </div>
            </section>

            <section class="panel">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Gói dịch vụ</p>
                  <h2>Gói tour và dịch vụ.</h2>
                </div>
              </div>
              ${packageMarkup(spot)}
            </section>

            <section class="panel">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Lưu trú</p>
                  <h2>Hạng phòng lưu trú.</h2>
                </div>
              </div>
              ${roomMarkup(spot)}
            </section>

            <section class="panel">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Đánh giá</p>
                  <h2>Đánh giá từ khách đã đến.</h2>
                </div>
              </div>

              ${window.currentUser ? `
                <div class="card" style="margin-bottom:20px;">
                  <h3>Viết đánh giá của bạn</h3>
                  <div class="form-grid" style="margin-top:16px;">
                    <div class="form-group">
                      <label class="form-label" for="review-rating">Điểm đánh giá</label>
                      <select id="review-rating" class="form-control">
                        <option value="5">5 sao</option>
                        <option value="4">4 sao</option>
                        <option value="3">3 sao</option>
                        <option value="2">2 sao</option>
                        <option value="1">1 sao</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="review-comment">Nhận xét</label>
                      <textarea id="review-comment" class="form-control" placeholder="Bạn ấn tượng điều gì ở điểm đến này?"></textarea>
                    </div>
                    <div class="form-actions">
                      <button id="submit-review-btn" class="button"><i class='bx bx-message-square-dots'></i> Gi Đánh giá</button>
                    </div>
                  </div>
                </div>
              ` : '<p>Đăng nhập để viết đánh giá và lưu điểm đến yêu thích.</p>'}

              <div class="list-stack" id="reviews-list">
                ${reviewList(reviews)}
              </div>
            </section>
          </div>

          <aside class="page">
            ${window.currentUser && window.currentUser.role !== 'ADMIN' ? `
              <section class="panel">
                <div class="section-header">
                  <div>
                    <p class="eyebrow">Đặt chỗ</p>
                    <h2>Đặt tour hoặc phòng.</h2>
                    <p class="meta" style="margin-top:8px;">Chọn thời gian đi trước, hệ thống sẽ hiển thời gian kết thúc và tính giá tương ứng.</p>
                  </div>
                  <button type="submit" form="booking-form" id="booking-submit-btn" class="button" disabled>Tạo booking</button>
                </div>

                ${departures.length ? `
                  <form id="booking-form" class="form-grid">
                    <div class="form-group">
                      <span class="form-label">Chọn ngày đi</span>
                      <div id="booking-date-grid" class="booking-choice-grid booking-date-grid"></div>
                      <p class="form-hint" id="booking-date-hint">Chọn ngày để xem các khung giờ còn chỗ.</p>
                    </div>

                    <div class="form-group">
                      <span class="form-label">Chọn khung giờ khởi hành</span>
                      <div id="booking-slot-grid" class="booking-choice-grid booking-slot-grid"></div>
                      <p class="form-hint" id="booking-slot-hint">Bấm vào một slot giờ để khóa lịch trình.</p>
                    </div>

                    <div class="card booking-summary">
                      <div class="booking-summary-item">
                        <p class="eyebrow">Khởi hành</p>
                        <strong id="booking-start-display">Chưa chọn</strong>
                      </div>
                      <div class="booking-summary-item">
                        <p class="eyebrow">Kết thúc dự kiến</p>
                        <strong id="booking-end-display">Chưa chọn</strong>
                      </div>
                    </div>

                    <div class="form-group" id="booking-end-group" style="display:none;">
                      <label class="form-label" for="booking-end-date">Trả phòng / kết thúc</label>
                      <input type="datetime-local" id="booking-end-date" class="form-control" />
                      <p class="form-hint">Chỉ hiện khi bạn chọn phòng hoặc combo tour + phòng. Giá lưu trú sẽ tính theo mốc này.</p>
                    </div>

                    ${spot.packages?.length ? `
                      <div class="form-group">
                        <label class="form-label" for="booking-package">Gói tour</label>
                        <select id="booking-package" class="form-control">
                          <option value="">Không chọn tour</option>
                          ${spot.packages.map((pkg) => `
                            <option
                              value="${pkg.id}"
                              data-price="${pkg.price}"
                              data-pickup="${pkg.pickup_included}"
                              data-meeting="${pkg.meeting_point || ''}"
                              data-cancel="${pkg.free_cancel_before_hours}"
                            >
                              ${pkg.name} - ${formatMoney(pkg.price, ' VND / khách / ngày')}
                            </option>
                          `).join('')}
                        </select>
                      </div>
                      <div class="form-group" id="booking-tour-days-group" style="display:none;">
                        <label class="form-label" for="booking-tour-days">Số ngày tour</label>
                        <input type="number" id="booking-tour-days" min="1" max="30" value="1" class="form-control" />
                        <p class="form-hint">Giá tour sẽ tính theo số ngày x số khách.</p>
                      </div>
                    ` : ''}

                    ${spot.rooms?.length ? `
                      <div class="form-group">
                        <label class="form-label" for="booking-room">Hạng phòng</label>
                        <select id="booking-room" class="form-control">
                          <option value="">Không đặt phòng</option>
                          ${spot.rooms.map((room) => `
                            <option value="${room.id}" data-price="${room.price}" data-qty="${room.quantity}">
                              ${room.name} - ${formatMoney(room.price, ' VND / đêm')}
                            </option>
                          `).join('')}
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="form-label" for="booking-room-count">Số lượng phòng</label>
                        <input type="number" id="booking-room-count" min="1" max="20" value="1" class="form-control" />
                      </div>
                    ` : ''}

                    <div class="form-group">
                      <label class="form-label" for="booking-guests">Số khách</label>
                      <input type="number" id="booking-guests" min="1" value="1" class="form-control" required />
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="booking-payment-method">Thanh toán</label>
                      <select id="booking-payment-method" class="form-control">
                        <option value="PAY_NOW">Thanh toán ngay</option>
                        <option value="PAY_LATER">Thanh toán sau</option>
                        <option value="PAY_AT_DESTINATION">Thanh toán ti im n</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="booking-voucher">Voucher</label>
                      <input type="text" id="booking-voucher" class="form-control" placeholder="Ví dụ: SUMMER10" />
                    </div>

                    <div class="form-group">
                      <label class="form-label" for="booking-notes">Ghi chú</label>
                      <textarea id="booking-notes" class="form-control" placeholder="Ví dụ: ăn chay, cần hỗ trợ đặc biệt..."></textarea>
                    </div>

                    <label class="chip" style="width:max-content;">
                      <input type="checkbox" id="booking-pickup-requested" style="margin-right:8px;" />
                      Yêu cầu pickup
                    </label>

                    <div class="form-group" id="pickup-address-group" style="display:none;">
                      <label class="form-label" for="booking-pickup-address">Địa chỉ pickup</label>
                      <input type="text" id="booking-pickup-address" class="form-control" placeholder="Nhập địa chỉ đón" />
                    </div>

                    <div class="card">
                      <p class="eyebrow">Tổng tạm tính</p>
                      <div class="metric-value" id="booking-total-price">0 VND</div>
                      <p class="meta" id="booking-policy-note" style="margin-top:10px;">Chọn departure và ít nhất một dịch vụ để xem tổng giá.</p>
                    </div>
                  </form>
                ` : `
                  <div class="empty-state">
                    <h3>Chưa có lịch khởi hành</h3>
                    <p>Admin cần thêm departure trước khi người dùng có thể đặt chỗ.</p>
                  </div>
                `}
              </section>
            ` : ''}

            <section class="panel">
              <div class="section-header">
                <div>
                  <p class="eyebrow">Bản đồ</p>
                  <h2>Vị trí trên bản đồ.</h2>
                </div>
              </div>
              <div id="map" class="map-frame"></div>
            </section>
          </aside>
        </section>
      </section>
    `;
    attachImageFallbacks(container);

    const favBtn = document.getElementById('fav-btn');
    if (favBtn) {
      favBtn.addEventListener('click', async () => {
        try {
          if (favBtn.textContent.includes('Bỏ yêu thích')) {
            await api.removeFavorite(id);
            favBtn.className = 'button-secondary';
            favBtn.innerHTML = "<i class='bx bxs-heart'></i> Thêm vào yêu thích";
            showToast('Đã bỏ yêu thích.');
          } else {
            await api.addFavorite(id);
            favBtn.className = 'button-danger';
            favBtn.innerHTML = "<i class='bx bxs-heart'></i> Bỏ yêu thích";
            showToast('Đã thêm vào danh sách yêu thích.');
          }
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    }

    const submitReviewButton = document.getElementById('submit-review-btn');
    if (submitReviewButton) {
      submitReviewButton.addEventListener('click', async () => {
        const rating = parseInt(document.getElementById('review-rating').value, 10);
        const comment = document.getElementById('review-comment').value;

        if (!comment.trim()) {
          showToast('Vui lòng nhập nhận xét.', 'danger');
          return;
        }

        try {
          await api.postReview(id, rating, comment);
          showToast('Đã gửi đánh giá.');
          renderSpotDetail(container, id);
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
    }

    if (window.currentUser && window.currentUser.role !== 'ADMIN' && departures.length) {
      const bookingForm = document.getElementById('booking-form');
      const dateGrid = document.getElementById('booking-date-grid');
      const slotGrid = document.getElementById('booking-slot-grid');
      const packageSelect = document.getElementById('booking-package');
      const tourDaysGroup = document.getElementById('booking-tour-days-group');
      const tourDaysInput = document.getElementById('booking-tour-days');
      const roomSelect = document.getElementById('booking-room');
      const roomCountInput = document.getElementById('booking-room-count');
      const startDisplay = document.getElementById('booking-start-display');
      const endDisplay = document.getElementById('booking-end-display');
      const endGroup = document.getElementById('booking-end-group');
      const endDateInput = document.getElementById('booking-end-date');
      const guestsInput = document.getElementById('booking-guests');
      const paymentMethodSelect = document.getElementById('booking-payment-method');
      const voucherInput = document.getElementById('booking-voucher');
      const notesInput = document.getElementById('booking-notes');
      const pickupRequestedInput = document.getElementById('booking-pickup-requested');
      const pickupAddressGroup = document.getElementById('pickup-address-group');
      const pickupAddressInput = document.getElementById('booking-pickup-address');
      const totalNode = document.getElementById('booking-total-price');
      const policyNote = document.getElementById('booking-policy-note');
      const dateHintNode = document.getElementById('booking-date-hint');
      const slotHintNode = document.getElementById('booking-slot-hint');
      const submitButton = document.getElementById('booking-submit-btn');

      const availableDates = [...new Set(departures.map((departure) => toDateInputValue(departure.start_time)))].sort();
      let selectedDate = availableDates[0] || '';
      let selectedDepartureId = null;

      const getSelectedPackage = () => {
        if (!packageSelect?.value) return null;
        return spot.packages.find((item) => String(item.id) === String(packageSelect.value)) || null;
      };

      const getSelectedRoom = () => {
        if (!roomSelect?.value) return null;
        return spot.rooms.find((item) => String(item.id) === String(roomSelect.value)) || null;
      };

      const getSelectedTourDays = () => {
        if (!getSelectedPackage()) return 1;
        return Math.max(parseInt(tourDaysInput?.value || '1', 10) || 1, 1);
      };

      const getTourEndDate = (selectedDeparture, selectedPackage) => {
        if (!selectedDeparture) return null;
        const baseEnd = new Date(selectedDeparture.end_time);
        if (!selectedPackage) return baseEnd;

        const tourEnd = new Date(baseEnd);
        tourEnd.setDate(tourEnd.getDate() + Math.max(getSelectedTourDays() - 1, 0));
        return tourEnd;
      };

      const getFilteredDepartures = () => departures.filter((departure) => toDateInputValue(departure.start_time) === selectedDate);
      const getSelectedDeparture = () => departures.find((item) => String(item.id) === String(selectedDepartureId)) || null;

      const renderDateButtons = () => {
        dateGrid.innerHTML = availableDates.map((dateValue) => `
          <button
            type="button"
            class="booking-choice-button ${dateValue === selectedDate ? 'is-active' : ''}"
            data-role="departure-date"
            data-date="${dateValue}"
          >
            <span class="booking-choice-meta">${formatCalendarWeekday(dateValue)}</span>
            <span class="booking-choice-value">${formatCalendarDate(dateValue)}</span>
          </button>
        `).join('');
      };

      const renderSlotButtons = () => {
        const filtered = getFilteredDepartures();
        const hasSelectedDeparture = filtered.some((departure) => String(departure.id) === String(selectedDepartureId));
        selectedDepartureId = hasSelectedDeparture ? selectedDepartureId : (filtered[0]?.id ?? null);

        dateHintNode.textContent = filtered.length
          ? `Ngày ${formatCalendarDate(selectedDate)} có ${filtered.length} khung giờ khả dụng.`
          : 'Ngày này hiện chưa có khung giờ khả dụng.';

        slotHintNode.textContent = filtered.length
          ? 'Bấm vào một slot giờ để khóa lịch trình.'
          : 'Hãy chọn ngày khác hoặc liên hệ admin để mở thêm lịch.';

        slotGrid.innerHTML = filtered.map((departure) => {
          const seatsLeft = Math.max(Number(departure.capacity || 0) - Number(departure.booked_count || 0), 0);
          return `
            <button
              type="button"
              class="booking-choice-button ${String(departure.id) === String(selectedDepartureId) ? 'is-active' : ''}"
              data-role="departure-slot"
              data-id="${departure.id}"
            >
              <span class="booking-choice-value">${formatTimeRange(departure.start_time, departure.end_time)}</span>
              <span class="booking-choice-meta">${seatsLeft} chỗ · ${departure.confirmation_type === 'INSTANT' ? 'Xác nhận ngay' : 'Chờ duyệt'}</span>
            </button>
          `;
        }).join('');
      };

      const syncScheduleFields = () => {
        const selectedDeparture = getSelectedDeparture();
        const selectedPackage = getSelectedPackage();
        const selectedRoom = getSelectedRoom();

        if (!selectedDeparture) {
          startDisplay.textContent = 'Chưa chọn';
          endDisplay.textContent = 'Chưa chọn';
          endDateInput.value = '';
          endDateInput.min = '';
          endGroup.style.display = 'none';
          return;
        }

        const start = new Date(selectedDeparture.start_time);
        const tourEndDate = getTourEndDate(selectedDeparture, selectedPackage);
        startDisplay.textContent = formatDateTimeDisplay(start);
        endDateInput.min = toDatetimeLocalValue(tourEndDate);

        if (!selectedRoom) {
          endDateInput.value = toDatetimeLocalValue(tourEndDate);
          endGroup.style.display = 'none';
          endDisplay.textContent = formatDateTimeDisplay(tourEndDate);
          return;
        }

        endGroup.style.display = 'flex';
        if (!endDateInput.value || new Date(endDateInput.value) < tourEndDate) {
          const suggestedEnd = new Date(tourEndDate);
          suggestedEnd.setDate(suggestedEnd.getDate() + 1);
          endDateInput.value = toDatetimeLocalValue(suggestedEnd);
        }

        endDisplay.textContent = formatDateTimeDisplay(endDateInput.value);
      };

      const updatePolicyNote = () => {
        const selectedDeparture = getSelectedDeparture();
        const selectedPackage = getSelectedPackage();
        const selectedRoom = getSelectedRoom();

        if (!selectedDeparture) {
          policyNote.textContent = 'Chọn thời gian đi trước khi tạo booking.';
          return;
        }

        const availableSeats = Number(selectedDeparture.capacity || 0) - Number(selectedDeparture.booked_count || 0);
        const confirmationType = selectedDeparture.confirmation_type === 'INSTANT' ? 'Xác nhận ngay' : 'Chờ admin duyệt';
        const tourDays = getSelectedTourDays();
        const tourEndDate = getTourEndDate(selectedDeparture, selectedPackage);
        const scheduleEnd = selectedRoom ? endDateInput.value : tourEndDate;
        const departureWindow = `Từ ${formatDateTimeDisplay(selectedDeparture.start_time)} đến ${formatDateTimeDisplay(scheduleEnd)}.`;
        const servicePolicy = selectedPackage
          ? `Tour ${tourDays} ngày, hủy miễn phí trước ${selectedPackage.free_cancel_before_hours}h.`
          : selectedRoom
            ? `Phòng hủy miễn phí trước ${selectedRoom.free_cancel_before_hours}h.`
            : 'Chọn thêm tour hoặc phòng để hoàn tất booking.';

        policyNote.textContent = `${departureWindow} ${confirmationType}. Còn ${availableSeats} chỗ. ${servicePolicy}`;
      };

      const togglePickupFields = () => {
        const selectedPackage = getSelectedPackage();
        const pickupAvailable = Boolean(selectedPackage?.pickup_included);

        pickupRequestedInput.checked = pickupAvailable ? pickupRequestedInput.checked : false;
        pickupRequestedInput.disabled = !pickupAvailable;
        pickupAddressGroup.style.display = pickupAvailable && pickupRequestedInput.checked ? 'block' : 'none';
      };

      const toggleTourDaysField = () => {
        const selectedPackage = getSelectedPackage();
        if (!tourDaysGroup || !tourDaysInput) return;

        tourDaysGroup.style.display = selectedPackage ? 'flex' : 'none';
        if (!selectedPackage) {
          tourDaysInput.value = '1';
        }
      };

      const calcTotal = () => {
        syncScheduleFields();

        const selectedDeparture = getSelectedDeparture();
        const selectedPackage = getSelectedPackage();
        const selectedRoom = getSelectedRoom();
        const guests = parseInt(guestsInput?.value || '1', 10) || 1;
        const tourDays = getSelectedTourDays();
        const roomCount = parseInt(roomCountInput?.value || '1', 10) || 1;
        let total = 0;

        if (selectedPackage) {
          total += Number(selectedPackage.price) * guests * tourDays;
        }

        if (selectedRoom && endDateInput?.value && selectedDeparture) {
          const start = new Date(selectedDeparture.start_time);
          const end = new Date(endDateInput.value);
          if (end > start) {
            const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            total += Number(selectedRoom.price) * roomCount * nights;
          }
        }

        totalNode.textContent = `${total.toLocaleString('vi-VN')} VND`;

        const canSubmit = Boolean(selectedDeparture && (selectedPackage || selectedRoom));
        submitButton.disabled = !canSubmit;
        submitButton.textContent = canSubmit ? 'Tạo booking' : 'Chọn lịch và dịch vụ';

        updatePolicyNote();
        toggleTourDaysField();
        togglePickupFields();
      };

      dateGrid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-role="departure-date"]');
        if (!button || button.dataset.date === selectedDate) return;

        selectedDate = button.dataset.date;
        renderDateButtons();
        renderSlotButtons();
        calcTotal();
      });

      slotGrid.addEventListener('click', (event) => {
        const button = event.target.closest('[data-role="departure-slot"]');
        if (!button || button.dataset.id === String(selectedDepartureId)) return;

        selectedDepartureId = button.dataset.id;
        renderSlotButtons();
        calcTotal();
      });

      packageSelect?.addEventListener('change', calcTotal);
      tourDaysInput?.addEventListener('input', calcTotal);
      roomSelect?.addEventListener('change', calcTotal);
      roomCountInput?.addEventListener('input', calcTotal);
      endDateInput?.addEventListener('change', calcTotal);
      guestsInput?.addEventListener('input', calcTotal);
      paymentMethodSelect?.addEventListener('change', updatePolicyNote);
      pickupRequestedInput?.addEventListener('change', togglePickupFields);

      bookingForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const selectedPackage = getSelectedPackage();
        const selectedRoom = getSelectedRoom();
        const selectedDeparture = getSelectedDeparture();
        const tourEndDate = getTourEndDate(selectedDeparture, selectedPackage);

        if (!selectedPackage && !selectedRoom) {
          showToast('Hãy chọn ít nhất một gói tour hoặc hạng phòng.', 'danger');
          return;
        }

        if (!selectedDate) {
          showToast('Hãy chọn ngày đi.', 'danger');
          return;
        }

        if (!selectedDeparture) {
          showToast('Hãy chọn khung giờ khởi hành.', 'danger');
          return;
        }

        if (selectedRoom && !endDateInput?.value) {
          showToast('Hãy chọn thời gian kết thúc.', 'danger');
          return;
        }

        if (selectedRoom && new Date(endDateInput.value) < new Date(tourEndDate)) {
          showToast('Ngày trả phòng phải sau hoặc bằng thời gian tour kết thúc.', 'danger');
          return;
        }

        if (pickupRequestedInput.checked && !pickupAddressInput.value.trim()) {
          showToast('Hãy nhập địa chỉ pickup.', 'danger');
          return;
        }

        const payload = {
          spot_id: parseInt(id, 10),
          departure_id: parseInt(selectedDeparture.id, 10),
          guests: parseInt(guestsInput.value, 10) || 1,
          payment_method: paymentMethodSelect.value,
          voucher_code: voucherInput.value.trim() || undefined,
          notes: notesInput.value.trim() || undefined,
          pickup_requested: pickupRequestedInput.checked,
          pickup_address: pickupRequestedInput.checked ? pickupAddressInput.value.trim() : undefined,
        };

        if (selectedPackage) {
          payload.package_id = selectedPackage.id;
          payload.tour_days = getSelectedTourDays();
        }
        if (selectedRoom) {
          payload.room_id = selectedRoom.id;
          payload.room_count = parseInt(roomCountInput.value, 10) || 1;
          payload.end_date = new Date(endDateInput.value).toISOString();
        }

        try {
          const booking = await api.createBooking(payload);
          const baseMessage = booking.status === 'ACCEPTED'
            ? 'Booking đã được xác nhận.'
            : 'Booking đã được tạo và đang chờ xác nhận.';
          const paymentMessage = booking.payment_method === 'PAY_AT_DESTINATION'
            ? 'Bạn sẽ thanh toán tại điểm đến.'
            : booking.payment_method === 'PAY_NOW'
              ? booking.payment?.due_at
                ? `Đơn đã được tạo, vui lòng bấm thanh toán để hoàn tất trước ${new Date(booking.payment.due_at).toLocaleString('vi-VN')}.`
                : 'Đơn đã được tạo, vui lòng bấm thanh toán để hoàn tất.'
              : booking.payment?.due_at
                ? `Bạn có thể thanh toán sau trước ${new Date(booking.payment.due_at).toLocaleString('vi-VN')}.`
                : 'Bạn có thể thanh toán sau trên trang booking.';

          showToast(`${baseMessage} ${paymentMessage}`.trim());
          window.location.hash = '#/bookings';
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });

      renderDateButtons();
      renderSlotButtons();
      calcTotal();
    }

    if (!MAPBOX_TOKEN) {
      document.getElementById('map').innerHTML = `
        <div class="empty-state" style="height:100%; display:grid; place-items:center;">
          <div>
            <h3>Thiếu cấu hình Mapbox</h3>
            <p>Thêm <code>VITE_MAPBOX_TOKEN</code> vào môi trường của client để hiển thị bản đồ.</p>
          </div>
        </div>
      `;
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [spot.longitude, spot.latitude],
      zoom: 13,
    });

    new mapboxgl.Marker({ color: '#c96442' })
      .setLngLat([spot.longitude, spot.latitude])
      .addTo(map);
  } catch (err) {
    container.innerHTML = `<div class="error-state"><h2>Lỗi tải dữ liệu</h2><p>${err.message}</p></div>`;
  }
}
