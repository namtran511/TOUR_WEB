import { api } from '../api.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=800&q=80';

function getStatusMeta(status) {
  if (status === 'ACCEPTED') {
    return {
      ticket: ['accepted', 'Đã duyệt'],
      progress: ['pending', 'Đang chờ ngày đi'],
    };
  }
  if (status === 'COMPLETED') {
    return {
      ticket: ['accepted', 'Đã duyệt'],
      progress: ['completed', 'Đã hoàn thành'],
    };
  }
  if (status === 'REJECTED') {
    return {
      ticket: ['rejected', 'Từ chối'],
      progress: ['rejected', 'Ngừng phục vụ'],
    };
  }
  return {
    ticket: ['pending', 'Chờ duyệt'],
    progress: ['pending', 'Chưa khởi hành'],
  };
}

export async function renderBookings(container) {
  if (!window.currentUser) {
    window.location.hash = '#/login';
    return;
  }

  container.innerHTML = `
    <section class="page">
      <div class="page-header">
        <div>
          <p class="eyebrow">Đơn đặt</p>
          <h1>Sổ tay đặt chỗ của bạn.</h1>
          <p class="lede" style="margin-top:12px;">Theo dõi tình trạng duyệt, ngày đi và tổng chi phí cho mỗi hành trình đã lưu.</p>
        </div>
      </div>
      <div id="bookings-list" class="list-stack">
        <div class="loader"></div>
      </div>
    </section>
  `;

  const listContainer = document.getElementById('bookings-list');

  try {
    const bookings = await api.getUserBookings();

    if (!bookings.length) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <h3>Bạn chưa có đơn đặt nào.</h3>
          <p>Hãy bắt đầu từ trang khám phá và chọn một điểm đến phù hợp.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = bookings.map((booking) => {
      const status = getStatusMeta(booking.status);

      return `
        <article class="booking-card">
          <div class="media-inline" style="align-items:flex-start; justify-content:space-between; flex-wrap:wrap;">
            <div class="media-inline" style="align-items:flex-start;">
              <img class="thumb" src="${booking.spot.image_url || FALLBACK_IMAGE}" alt="${booking.spot.name}" />
              <div>
                <h3>${booking.spot.name}</h3>
                <p class="meta" style="margin-top:6px;"><i class='bx bx-map'></i> ${booking.spot.city}</p>
                <div class="chip-row" style="margin-top:12px;">
                  <span class="chip"><i class='bx bx-calendar'></i> ${new Date(booking.date).toLocaleDateString('vi-VN')} - ${new Date(booking.end_date).toLocaleDateString('vi-VN')}</span>
                  <span class="chip"><i class='bx bx-group'></i> ${booking.guests} khách</span>
                  ${booking.package ? `<span class="chip"><i class='bx bx-package'></i> ${booking.package.name}</span>` : ''}
                  ${booking.room ? `<span class="chip"><i class='bx bx-bed'></i> ${booking.room.name} x${booking.room_count}</span>` : ''}
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              ${booking.total_price ? `<div class="metric-value" style="font-size:1.8rem;">${parseInt(booking.total_price, 10).toLocaleString('vi-VN')}đ</div>` : ''}
              <div class="chip-row" style="justify-content:flex-end; margin-top:12px;">
                <span class="status-badge ${status.ticket[0]}">${status.ticket[1]}</span>
                <span class="status-badge ${status.progress[0]}">${status.progress[1]}</span>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  } catch (error) {
    listContainer.innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
  }
}
