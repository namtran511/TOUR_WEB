export function renderNavbar() {
  const user = window.currentUser;

  return `
    <nav class="app-nav">
      <div class="brand-mark" onclick="window.location.hash='#/'" role="button" tabindex="0">
        <div class="brand-glyph"><i class='bx bx-compass'></i></div>
        <div class="brand-wordmark">
          <strong>TravelSpot</strong>
          <span>Bản đồ Việt Nam</span>
        </div>
      </div>

      <div class="nav-links">
        <a class="nav-link" href="#/"><i class='bx bx-home-alt'></i> Khám phá</a>
        ${user && user.role !== 'ADMIN' ? `<a class="nav-link" href="#/bookings"><i class='bx bx-receipt'></i> Vé của tôi</a>` : ''}
        ${user && user.role === 'ADMIN' ? `<a class="nav-link" href="#/admin"><i class='bx bx-briefcase-alt-2'></i> Quản lý</a>` : ''}
      </div>

      <div class="nav-actions">
        ${user ? `
          <span class="badge">
            <i class='bx bx-user-circle'></i>
            ${user.full_name}
            ${user.role === 'ADMIN' ? '<span class="status-badge danger">ADMIN</span>' : ''}
          </span>
          <button class="button-danger" onclick="logout()"><i class='bx bx-log-out'></i> Đăng xuất</button>
        ` : `
          <a href="#/login"><button class="button-secondary"><i class='bx bx-log-in-circle'></i> Đăng nhập</button></a>
          <a href="#/register"><button class="button"><i class='bx bx-user-plus'></i> Tạo tài khoản</button></a>
        `}
      </div>
    </nav>
  `;
}
