import { api } from '../api.js';
import { showToast } from '../router.js';

export function renderRegister(container) {
  container.innerHTML = `
    <section class="page">
      <div class="auth-shell">
        <div class="card-body">
          <p class="eyebrow">Đăng ký</p>
          <h1>Tạo tài khoản để bắt đầu một cuốn sổ du lịch riêng.</h1>
          <p class="lede" style="margin-top:14px;">Sau khi đăng ký, bạn có thể yêu thích địa điểm, đặt tour và theo dõi đơn đặt trong một nơi duy nhất.</p>
          <form id="register-form" class="form-grid" style="margin-top:28px;">
            <div class="form-group">
              <label class="form-label" for="name">Họ tên</label>
              <input type="text" id="name" class="form-control" required placeholder="Nhập họ tên" />
            </div>
            <div class="form-group">
              <label class="form-label" for="email">Email</label>
              <input type="email" id="email" class="form-control" required placeholder="ban@example.com" />
            </div>
            <div class="form-group">
              <label class="form-label" for="password">Mật khẩu</label>
              <input type="password" id="password" class="form-control" required placeholder="Tối thiểu 6 ký tự" />
            </div>
            <div class="form-actions">
              <button type="submit" class="button full-width"><i class='bx bx-user-plus'></i> Tạo tài khoản</button>
            </div>
          </form>
          <p style="margin-top:18px;">Đã có tài khoản? <a href="#/login">Đăng nhập ngay</a></p>
        </div>
      </div>
    </section>
  `;

  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      await api.register(name, email, password);
      showToast('Đăng ký thành công. Mời bạn đăng nhập.');
      window.location.hash = '#/login';
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });
}
