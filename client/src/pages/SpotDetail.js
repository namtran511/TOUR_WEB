import { api } from '../api.js';
import { showToast } from '../router.js';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function formatMoney(value, suffix = ' VND') {
  if (value === null || value === undefined || value === '') return 'Liên hệ';
  return `${parseInt(value, 10).toLocaleString('vi-VN')}${suffix}`;
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
      ${review.trip_duration ? `<p class="meta" style="margin-top:6px;">Đã trải nghiệm ${review.trip_duration}</p>` : ''}
      <p style="margin-top:10px;">${review.comment}</p>
    </div>
  `).join('');
}

function packageMarkup(spot) {
  if (spot.packages && spot.packages.length) {
    return `
      <div class="list-stack">
        ${spot.packages.map((pkg) => `
          <article class="card">
            <div class="inline-actions" style="justify-content:space-between;">
              <div>
                <h4>${pkg.name}</h4>
                <p class="meta" style="margin-top:6px;">${pkg.description || 'Gói dịch vụ dành cho khách muốn có lịch trình trọn vẹn.'}</p>
              </div>
              <span class="price-tag">${formatMoney(pkg.price)}</span>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  return `<div class="card"><p>Giá cơ bản: <span class="price-tag">${formatMoney(spot.ticket_price)}</span></p></div>`;
}

function roomMarkup(spot) {
  if (spot.rooms && spot.rooms.length) {
    return `
      <div class="list-stack">
        ${spot.rooms.map((room) => `
          <article class="card">
            <div class="inline-actions" style="justify-content:space-between; align-items:flex-start;">
              <div>
                <h4>${room.name}</h4>
                <p class="meta" style="margin-top:6px;">${room.description || 'Hạng phòng được quản lý theo tồn kho.'}</p>
              </div>
              <div style="text-align:right;">
                <div class="price-tag">${formatMoney(room.price, ' VND / đêm')}</div>
                <div class="meta" style="margin-top:6px;">${room.quantity > 0 ? `Còn ${room.quantity} phòng` : 'Hết phòng'}</div>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  return '<div class="card"><p>Không có dữ liệu hạng phòng cho địa điểm này.</p></div>';
}

export async function renderSpotDetail(container, id) {
  container.innerHTML = '<div class="loader"></div>';

  try {
    const spot = await api.getSpotById(id);
    const reviews = await api.getReviews(id);
    const favorites = window.currentUser ? await api.getFavorites() : [];
    const isFavorite = favorites.some((favorite) => favorite.spot_id == id);
    const imageUrl = spot.images && spot.images[0] ? spot.images[0] : spot.image_url || FALLBACK_IMAGE;
    const averageRating = spot.averageRating || spot.average_rating || 'Chưa có';

    container.innerHTML = `
      <section class="page">
        <article class="card detail-hero">
          <img src="${imageUrl}" class="detail-hero-image" alt="${spot.name}" />
          <div class="detail-hero-copy">
            <p class="eyebrow">Hồ sơ điểm đến</p>
            <div class="page-header">
              <div>
                <h1>${spot.name}</h1>
                <p class="lede" style="margin-top:12px;">${spot.description || 'Điểm đến này hiện đã có vị trí bản đồ, thông tin đặt chỗ và khu vực đánh giá từ cộng đồng.'}</p>
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
                  <p>${spot.country || 'Việt Nam'}</p>
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
                      <button id="submit-review-btn" class="button"><i class='bx bx-message-square-dots'></i> Gửi đánh giá</button>
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
              <section class="panel sticky-panel">
                <div class="section-header">
                  <div>
                    <p class="eyebrow">Đặt chỗ</p>
                    <h2>Đặt tour hoặc phòng.</h2>
                  </div>
                  <button type="submit" form="booking-form" id="booking-submit-btn" class="button" disabled>Chọn tour hoặc phòng</button>
                </div>
                <form id="booking-form" class="form-grid">
                  ${spot.packages && spot.packages.length ? `
                    <div class="form-group">
                      <label class="form-label" for="booking-package">Gói tour</label>
                      <select id="booking-package" class="form-control">
                        <option value="">Không chọn tour</option>
                        ${spot.packages.map((pkg) => `<option value="${pkg.id}" data-price="${pkg.price}">${pkg.name} - ${formatMoney(pkg.price)}</option>`).join('')}
                      </select>
                    </div>
                  ` : ''}

                  ${spot.rooms && spot.rooms.length ? `
                    <div class="form-group">
                      <label class="form-label" for="booking-room">Hạng phòng</label>
                      <select id="booking-room" class="form-control">
                        <option value="">Không đặt phòng</option>
                        ${spot.rooms.map((room) => `<option value="${room.id}" data-price="${room.price}" data-qty="${room.quantity}" ${room.quantity <= 0 ? 'disabled' : ''}>${room.name} - ${formatMoney(room.price, ' VND / đêm')} ${room.quantity <= 0 ? '(Hết)' : `(Còn ${room.quantity})`}</option>`).join('')}
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label" for="booking-room-count">Số lượng phòng</label>
                      <input type="number" id="booking-room-count" min="1" max="20" value="1" class="form-control" />
                    </div>
                  ` : ''}

                  <div class="form-group">
                    <label class="form-label" for="booking-date">Ngày đi</label>
                    <input type="datetime-local" id="booking-date" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="booking-end-date">Ngày về</label>
                    <input type="datetime-local" id="booking-end-date" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="booking-guests">Số khách</label>
                    <input type="number" id="booking-guests" min="1" value="1" class="form-control" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="booking-notes">Ghi chú</label>
                    <textarea id="booking-notes" class="form-control" placeholder="Ví dụ: ăn chay, nhận phòng sớm..."></textarea>
                  </div>
                  <div class="card">
                    <p class="eyebrow">Tổng tạm tính</p>
                    <div class="metric-value" id="booking-total-price">0 VND</div>
                  </div>
                </form>
              </section>
            ` : ''}

            <section class="panel sticky-panel">
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

    if (window.currentUser && window.currentUser.role !== 'ADMIN') {
      const bookingForm = document.getElementById('booking-form');
      const bookingPackage = document.getElementById('booking-package');
      const bookingRoom = document.getElementById('booking-room');
      const bookingGuests = document.getElementById('booking-guests');
      const bookingRoomCount = document.getElementById('booking-room-count');
      const bookingTotal = document.getElementById('booking-total-price');
      const bookingDate = document.getElementById('booking-date');
      const bookingEndDate = document.getElementById('booking-end-date');
      const submitButton = document.getElementById('booking-submit-btn');

      const calcTotal = () => {
        let days = 1;
        if (bookingDate?.value && bookingEndDate?.value) {
          const start = new Date(bookingDate.value);
          const end = new Date(bookingEndDate.value);
          if (end > start) {
            days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          }
        }

        let packageTotal = 0;
        if (bookingPackage?.value) {
          const option = bookingPackage.options[bookingPackage.selectedIndex];
          packageTotal = (parseFloat(option.dataset.price) || 0) * (parseInt(bookingGuests.value, 10) || 1) * days;
        }

        let roomTotal = 0;
        if (bookingRoom?.value) {
          const option = bookingRoom.options[bookingRoom.selectedIndex];
          roomTotal = (parseFloat(option.dataset.price) || 0) * (parseInt(bookingRoomCount?.value || 1, 10) || 1) * days;
        }

        bookingTotal.textContent = `${(packageTotal + roomTotal).toLocaleString('vi-VN')} VND`;

        const hasSelection = (bookingPackage && bookingPackage.value) || (bookingRoom && bookingRoom.value);
        submitButton.disabled = !hasSelection;
        submitButton.textContent = hasSelection ? 'Xác nhận đặt chỗ' : 'Chọn tour hoặc phòng để đặt chỗ';
      };

      bookingPackage?.addEventListener('change', calcTotal);
      bookingGuests?.addEventListener('input', calcTotal);
      bookingDate?.addEventListener('change', calcTotal);
      bookingEndDate?.addEventListener('change', calcTotal);
      bookingRoomCount?.addEventListener('input', calcTotal);
      bookingRoom?.addEventListener('change', () => {
        if (bookingRoom.value && bookingRoomCount) {
          const option = bookingRoom.options[bookingRoom.selectedIndex];
          const maxQty = parseInt(option.dataset.qty, 10) || 20;
          bookingRoomCount.max = maxQty;
          if (parseInt(bookingRoomCount.value, 10) > maxQty) {
            bookingRoomCount.value = maxQty;
          }
        }
        calcTotal();
      });

      bookingForm?.addEventListener('submit', async (event) => {
        event.preventDefault();

        const payload = {
          spot_id: parseInt(id, 10),
          date: new Date(document.getElementById('booking-date').value).toISOString(),
          end_date: new Date(document.getElementById('booking-end-date').value).toISOString(),
          guests: parseInt(bookingGuests.value, 10),
          notes: document.getElementById('booking-notes').value,
        };

        if (bookingPackage?.value) payload.package_id = parseInt(bookingPackage.value, 10);
        if (bookingRoom?.value) {
          payload.room_id = parseInt(bookingRoom.value, 10);
          payload.room_count = parseInt(bookingRoomCount?.value || 1, 10);
        }

        if (!payload.package_id && !payload.room_id) {
          showToast('Hãy chọn ít nhất một gói tour hoặc hạng phòng.', 'danger');
          return;
        }

        try {
          await api.createBooking(payload);
          showToast('Đặt chỗ thành công. Đơn của bạn đang chờ duyệt.');
          bookingForm.reset();
          calcTotal();
        } catch (err) {
          showToast(err.message, 'danger');
        }
      });
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
