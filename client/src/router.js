import { renderNavbar } from './components/Navbar.js';
import { renderHome } from './pages/Home.js';
import { renderLogin } from './pages/Login.js';
import { renderRegister } from './pages/Register.js';
import { renderSpotDetail } from './pages/SpotDetail.js';
import { renderAdmin } from './pages/Admin.js';
import { renderBookings } from './pages/Bookings.js';
import { api } from './api.js';

window.currentUser = null;

export async function initRouter() {
  try {
    const data = await api.getMe();
    if (data && data.data) {
      window.currentUser = data.data;
    }
  } catch (err) {
    window.currentUser = null;
    localStorage.removeItem('token');
  }

  window.addEventListener('hashchange', route);
  route();
}

function route() {
  const hash = window.location.hash || '#/';
  const app = document.getElementById('app');
  const nav = document.getElementById('nav-container');

  nav.innerHTML = renderNavbar();
  app.className = '';

  if (hash === '#/') {
    renderHome(app);
  } else if (hash.startsWith('#/spot/')) {
    const id = hash.split('/')[2];
    renderSpotDetail(app, id);
  } else if (hash === '#/login') {
    renderLogin(app);
  } else if (hash === '#/register') {
    renderRegister(app);
  } else if (hash === '#/admin') {
    renderAdmin(app);
  } else if (hash === '#/bookings') {
    renderBookings(app);
  } else {
    app.innerHTML = `
      <section class="page">
        <div class="empty-state">
          <p class="eyebrow">Not Found</p>
          <h2>Trang bạn tìm không tồn tại.</h2>
          <p>Hãy quay lại trang khám phá để tiếp tục tìm điểm đến phù hợp.</p>
          <div class="button-row" style="justify-content:center; margin-top:20px;">
            <a href="#/"><button class="button">Về trang chủ</button></a>
          </div>
        </div>
      </section>
    `;
  }
}

export function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const colorMap = {
    success: 'var(--color-success)',
    danger: 'var(--color-danger)',
    error: 'var(--color-danger)',
    info: 'var(--color-info)',
  };

  toast.textContent = message;
  toast.style.borderLeft = `4px solid ${colorMap[type] || 'var(--color-brand)'}`;
  toast.className = 'toast show';

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

export function logout() {
  localStorage.removeItem('token');
  window.currentUser = null;
  window.location.hash = '#/login';
}

window.logout = logout;
