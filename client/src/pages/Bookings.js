import { api } from '../api.js';
import { attachImageFallbacks, resolveImageUrl } from '../image.js';
import { showToast } from '../router.js';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=800&q=80';

function formatVnd(value) {
  if (value === null || value === undefined || value === '') return '0đ';
  return `${parseInt(value, 10).toLocaleString('vi-VN')}đ`;
}

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
  if (status === 'CANCELLED') {
    return {
      ticket: ['rejected', 'Đã hủy'],
      progress: ['rejected', 'Đã kết thúc'],
    };
  }
  if (status === 'NO_SHOW') {
    return {
      ticket: ['rejected', 'No-show'],
      progress: ['rejected', 'Không check-in'],
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

function getPaymentMeta(booking) {
  const payment = booking.payment;

  if (booking.payment_method === 'PAY_AT_DESTINATION') {
    return {
      tone: 'pending',
      label: 'Thanh toán tại điểm đến',
    };
  }

  if (!payment) {
    return {
      tone: 'rejected',
      label: 'Thiếu payment',
    };
  }

  if (payment.status === 'PAID') {
    return {
      tone: 'accepted',
      label: 'Đã thanh toán',
    };
  }

  if (payment.status === 'FAILED') {
    return {
      tone: 'rejected',
      label: 'Thanh toán lỗi',
    };
  }

  if (payment.status === 'REFUNDED' || payment.status === 'PARTIALLY_REFUNDED') {
    return {
      tone: 'completed',
      label: payment.status === 'REFUNDED' ? 'Đã hoàn tiền' : 'Hoàn tiền một phần',
    };
  }

  return {
    tone: 'pending',
    label: payment.status === 'PENDING' ? 'Chờ thanh toán' : 'Chưa thanh toán',
  };
}

function canPayNow(booking) {
  return booking.payment_method !== 'PAY_AT_DESTINATION'
    && ['PENDING', 'ACCEPTED'].includes(booking.status)
    && booking.payment
    && ['PENDING', 'UNPAID', 'FAILED'].includes(booking.payment.status);
}

function getPaymentMethodLabel(method) {
  if (method === 'PAY_NOW') return 'Thanh toán online';
  if (method === 'PAY_LATER') return 'Thanh toán sau';
  if (method === 'PAY_AT_DESTINATION') return 'Thanh toán tại điểm đến';
  return 'Chưa rõ hình thức';
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
      const payment = getPaymentMeta(booking);
      const payButtonLabel = booking.payment?.status === 'FAILED' ? 'Thanh toán lại' : 'Thanh toán ngay';

      return `
        <article class="booking-card">
          <div class="media-inline" style="align-items:flex-start; justify-content:space-between; flex-wrap:wrap;">
            <div class="media-inline" style="align-items:flex-start;">
              <img class="thumb" src="${resolveImageUrl(booking.spot, FALLBACK_IMAGE)}" data-fallback-src="${FALLBACK_IMAGE}" alt="${booking.spot.name}" />
              <div>
                <h3>${booking.spot.name}</h3>
                <p class="meta" style="margin-top:6px;"><i class='bx bx-map'></i> ${booking.spot.city}</p>
                <div class="chip-row" style="margin-top:12px;">
                  <span class="chip"><i class='bx bx-calendar'></i> ${new Date(booking.date).toLocaleDateString('vi-VN')} - ${new Date(booking.end_date).toLocaleDateString('vi-VN')}</span>
                  <span class="chip"><i class='bx bx-group'></i> ${booking.guests} khách</span>
                  ${booking.package ? `<span class="chip"><i class='bx bx-package'></i> ${booking.package.name}</span>` : ''}
                  ${booking.room ? `<span class="chip"><i class='bx bx-bed'></i> ${booking.room.name} x${booking.room_count}</span>` : ''}
                  <span class="chip"><i class='bx bx-wallet'></i> ${getPaymentMethodLabel(booking.payment_method)}</span>
                </div>
              </div>
            </div>
            <div style="text-align:right;">
              ${booking.total_price ? `<div class="metric-value" style="font-size:1.8rem;">${formatVnd(booking.total_price)}</div>` : ''}
              <p class="meta" style="margin-top:8px;">${booking.booking_code}</p>
              <div class="chip-row" style="justify-content:flex-end; margin-top:12px;">
                <span class="status-badge ${status.ticket[0]}">${status.ticket[1]}</span>
                <span class="status-badge ${status.progress[0]}">${status.progress[1]}</span>
                <span class="status-badge ${payment.tone}">${payment.label}</span>
              </div>
              ${booking.payment?.due_at && canPayNow(booking) ? `<p class="meta" style="margin-top:10px;">Hạn thanh toán: ${new Date(booking.payment.due_at).toLocaleString('vi-VN')}</p>` : ''}
              ${booking.payment_method === 'PAY_NOW' && booking.payment?.status !== 'PAID' ? `<p class="meta" style="margin-top:10px;">Booking đã tạo nhưng chưa thu tiền. Cần xác nhận thanh toán để hoàn tất.</p>` : ''}
              ${canPayNow(booking) ? `<div class="button-row" style="justify-content:flex-end; margin-top:14px;"><button class="button" data-action="pay-booking" data-id="${booking.id}">${payButtonLabel}</button></div>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
    attachImageFallbacks(listContainer);

    listContainer.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-action="pay-booking"]');
      if (!button) return;

      const bookingId = Number(button.dataset.id);
      if (!bookingId) return;

      button.dataset.originalLabel = button.textContent;

      const confirmed = window.confirm('Xác nhận thanh toán booking này?');
      if (!confirmed) {
        return;
      }

      button.disabled = true;
      button.textContent = 'Đang xử lý...';

      try {
        await api.payBooking(bookingId);
        showToast(`Thanh toán thành công cho booking #${bookingId}.`);
        await renderBookings(container);
      } catch (error) {
        button.disabled = false;
        button.textContent = button.dataset.originalLabel || 'Thanh toán ngay';
        showToast(error.message, 'danger');
      }
    });
  } catch (error) {
    listContainer.innerHTML = `<div class="error-state"><p>${error.message}</p></div>`;
  }
}
