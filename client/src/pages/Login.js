import { api } from '../api.js';
import { showToast } from '../router.js';

export function renderLogin(container) {
  container.innerHTML = `
    <section class="page">
      <div class="auth-shell">
        <div class="card-body">
          <p class="eyebrow">Tài khoản</p>
          <h1>Đăng nhập để lưu hành trình và quản lý đặt chỗ.</h1>
          <p class="lede" style="margin-top:14px;">Tài khoản giúp bạn lưu yêu thích, viết đánh giá và theo dõi lịch sử book tour hoặc phòng.</p>
          <form id="login-form" class="form-grid" style="margin-top:28px;">
            <div class="form-group">
              <label class="form-label" for="email">Email</label>
              <input type="email" id="email" class="form-control" required placeholder="ban@example.com" />
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Mật khẩu</label>
              <input type="password" id="password" class="form-control" required placeholder="Nhập mật khẩu" />
            </div>
            <div class="form-actions">
              <button type="submit" class="button full-width"><i class='bx bx-log-in-circle'></i> Đăng nhập</button>
            </div>
          </form>
          <p style="margin-top:18px;">Chưa có tài khoản? <a href="#/register">Tạo tài khoản mới</a></p>
        </div>
      </div>
    </section>
  `;

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const data = await api.login(email, password);
      localStorage.setItem('token', data.data.token);
      const user = await api.getMe();
      if (user) window.currentUser = user.data;
      showToast('Đăng nhập thành công.');
      window.location.hash = '#/';
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}
