import { api } from '../api.js';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80';
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

function formatRating(spot) {
  return spot.averageRating || spot.average_rating || 'Chưa có';
}

function renderIllustration() {
  return `
    <div class="illustration-panel">
      <p class="eyebrow">Hành trình tuyển chọn</p>
      <svg viewBox="0 0 520 420" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M43 318C103 223 186 157 266 135C349 112 406 140 475 85" stroke="#141413" stroke-width="10" stroke-linecap="round"/>
        <path d="M60 339C132 266 191 253 247 257C326 262 374 320 463 294" stroke="#C96442" stroke-width="16" stroke-linecap="round"/>
        <path d="M82 108C111 61 167 37 221 51C270 64 310 112 339 161" stroke="#4B7B57" stroke-width="10" stroke-linecap="round"/>
        <circle cx="93" cy="109" r="26" fill="#C96442"/>
        <circle cx="248" cy="257" r="34" fill="#141413"/>
        <circle cx="463" cy="294" r="22" fill="#4B7B57"/>
        <path d="M370 93C388 70 428 70 446 92C463 115 448 150 420 168C390 150 353 118 370 93Z" fill="#C96442"/>
      </svg>
      <p class="caption">Bản đồ, danh sách và bộ lọc được đặt trong một bố cục editorial để hành trình tìm kiếm cảm thấy chậm rãi và rõ ràng hơn.</p>
    </div>
  `;
}

export async function renderHome(container) {
  container.innerHTML = `
    <section class="page">
      <section class="hero-grid">
        <div class="hero-spotlight">
          <p class="eyebrow">Người bạn đồng hành</p>
          <h1 class="hero-title">Khám phá điểm đến Việt Nam với nhịp đọc chậm, ấm và rõ ràng.</h1>
          <p class="lede" style="margin-top:18px;">
            Tìm địa điểm du lịch, so sánh đánh giá, xem vị trí trên bản đồ và đặt chỗ trong cùng một giao diện mang tính biên tập thay vì giao diện công nghệ lạnh.
          </p>
          <div class="stats-row" style="margin-top:28px;">
            <span class="chip"><i class='bx bx-map'></i> Bản đồ trực quan</span>
            <span class="chip"><i class='bx bx-filter-alt'></i> Tìm kiếm theo thành phố</span>
            <span class="chip"><i class='bx bx-star'></i> Đánh giá và yêu thích</span>
          </div>
          <div class="button-row" style="margin-top:28px;">
            <a href="#spots-section"><button class="button"><i class='bx bx-compass'></i> Xem bộ sưu tập</button></a>
            <a href="#/bookings"><button class="button-secondary"><i class='bx bx-receipt'></i> Đơn đặt của tôi</button></a>
          </div>
        </div>
        ${renderIllustration()}
      </section>

      <section class="stat-grid">
        <div class="stat-card">
          <p class="eyebrow">01</p>
          <div class="metric-value">Bản đồ</div>
          <p>Xem nhanh vị trí từng điểm đến và canh chỉnh khung nhìn theo kết quả tìm kiếm.</p>
        </div>
        <div class="stat-card">
          <p class="eyebrow">02</p>
          <div class="metric-value">Danh sách</div>
          <p>Thẻ đọc mô tả, xếp hạng theo tên, thành phố hoặc điểm đánh giá trung bình.</p>
        </div>
        <div class="stat-card">
          <p class="eyebrow">03</p>
          <div class="metric-value">Đặt chỗ</div>
          <p>Từ giao diện chi tiết, người dùng có thể đặt tour, phòng và gửi đánh giá.</p>
        </div>
      </section>

      <section class="panel section-block">
        <div class="section-header">
          <div>
            <p class="eyebrow">Tìm kiếm</p>
            <h2>Lọc và xem địa điểm theo đúng nguyên tắc đọc dễ hiểu.</h2>
          </div>
        </div>

        <div class="filter-row" style="margin-bottom:20px;">
          <input type="text" id="search-input" class="form-control" placeholder="Tìm tên địa điểm, thành phố..." style="flex:1; min-width:220px;" />
          <select id="sort-select" class="form-control" style="width:240px;">
            <option value="created_at,desc">Mới nhất</option>
            <option value="name,asc">Tên A-Z</option>
            <option value="name,desc">Tên Z-A</option>
            <option value="city,asc">Thành phố A-Z</option>
            <option value="average_rating,desc">Đánh giá cao nhất</option>
          </select>
          <button id="search-btn" class="button-secondary"><i class='bx bx-search'></i> Lọc kết quả</button>
        </div>

        <div id="home-map" class="map-frame"></div>
      </section>

      <section id="spots-section" class="dark-band">
        <div class="section-header">
          <div>
            <p class="eyebrow" style="color: var(--color-dark-muted);">Điểm đến nổi bật</p>
            <h2>Những điểm đến đang chờ bạn mở ra.</h2>
          </div>
        </div>
        <div id="spots-grid" class="grid-cards">
          <div class="loader"></div>
        </div>
      </section>
    </section>
  `;

  const spotsGrid = document.getElementById('spots-grid');
  let currentMarkers = [];
  let map = null;

  if (!MAPBOX_TOKEN) {
    document.getElementById('home-map').innerHTML = `
      <div class="empty-state" style="height:100%; display:grid; place-items:center;">
        <div>
          <h3>Thiếu cấu hình Mapbox</h3>
          <p>Thêm <code>VITE_MAPBOX_TOKEN</code> vào môi trường của client để hiển thị bản đồ.</p>
        </div>
      </div>
    `;
    spotsGrid.innerHTML = '<div class="loader"></div>';
    loadSpots();
    return;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;
  map = new mapboxgl.Map({
    container: 'home-map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [105.8342, 18.0],
    zoom: 5,
  });

  async function loadSpots(query = '', sortBy = '', sortOrder = '') {
    spotsGrid.innerHTML = '<div class="loader"></div>';

    try {
      const spots = await api.getSpots(query, sortBy, sortOrder);

      currentMarkers.forEach((marker) => marker.remove());
      currentMarkers = [];

      if (!spots.length) {
        spotsGrid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1;">
            <h3>Không tìm thấy địa điểm phù hợp.</h3>
            <p>Thử đổi từ khóa hoặc sắp xếp theo một tiêu chí khác.</p>
          </div>
        `;
        return;
      }

      const bounds = new mapboxgl.LngLatBounds();
      let hasValidCoords = false;

      spotsGrid.innerHTML = spots.map((spot) => {
        if (map && spot.longitude && spot.latitude) {
          hasValidCoords = true;
          bounds.extend([spot.longitude, spot.latitude]);

          const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(`
            <div style="padding:4px 2px; color:#141413;">
              <strong style="display:block; margin-bottom:4px;">${spot.name}</strong>
              <span style="color:#5e5d59;">${spot.city}</span>
            </div>
          `);

          const marker = new mapboxgl.Marker({ color: '#c96442' })
            .setLngLat([spot.longitude, spot.latitude])
            .setPopup(popup)
            .addTo(map);

          currentMarkers.push(marker);
        }

        return `
          <article class="card spot-card">
            <img src="${spot.images && spot.images[0] ? spot.images[0] : spot.image_url || FALLBACK_IMAGE}" class="spot-image" alt="${spot.name}" />
            <div class="spot-info">
              <div class="chip-row">
                <span class="chip"><i class='bx bx-map-pin'></i> ${spot.city}</span>
                <span class="chip"><i class='bx bxs-star'></i> ${formatRating(spot)}</span>
              </div>
              <h3 class="spot-title">${spot.name}</h3>
              <p class="spot-summary">${spot.description || 'Điểm đến này chưa có mô tả chi tiết, nhưng vẫn có thể xem vị trí, đánh giá và thông tin đặt chỗ.'}</p>
              <div class="inline-actions" style="justify-content:space-between; margin-top:auto;">
                <span class="meta">${spot.country || 'Việt Nam'}</span>
                <div class="button-row">
                  ${window.currentUser && window.currentUser.role === 'ADMIN' ? `<button class="button-secondary" onclick="localStorage.setItem('editSpotId', ${spot.id}); window.location.hash='#/admin';"><i class='bx bx-edit'></i> Sửa</button>` : ''}
                  <a href="#/spot/${spot.id}"><button class="button"><i class='bx bx-right-arrow-alt'></i> Chi tiết</button></a>
                </div>
              </div>
            </div>
          </article>
        `;
      }).join('');

      if (map && hasValidCoords) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 13 });
      }
    } catch (error) {
      spotsGrid.innerHTML = `<div class="error-state" style="grid-column:1/-1;"><p>${error.message}</p></div>`;
    }
  }

  setTimeout(() => map.resize(), 120);
  loadSpots();

  const executeFilter = () => {
    const q = document.getElementById('search-input').value;
    const [sortBy, sortOrder] = document.getElementById('sort-select').value.split(',');
    loadSpots(q, sortBy, sortOrder);
  };

  document.getElementById('search-btn').addEventListener('click', executeFilter);
  document.getElementById('sort-select').addEventListener('change', executeFilter);
  document.getElementById('search-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      executeFilter();
    }
  });
}
