# Checklist Bảo Vệ / Nộp Bài

## 1. Chuẩn bị trước khi demo
- [ ] MySQL service đang chạy
- [ ] Đã vào đúng thư mục project
- [ ] Chạy `npm run dev`
- [ ] Mở Swagger: `http://localhost:5000/api-docs`
- [ ] Có sẵn Postman collection

## 2. Luồng demo đề xuất
- [ ] Giới thiệu stack công nghệ
- [ ] Giới thiệu database schema
- [ ] Demo login admin
- [ ] Demo tạo category/spot
- [ ] Demo search / nearby
- [ ] Demo register user
- [ ] Demo review + favorite
- [ ] Demo Mapbox directions

## 3. Tài khoản có sẵn
### Admin
- Email: `admin@travelspot.com`
- Password: `admin123`

### User test
- Email: `namtest@example.com`
- Password: `123456`

## 4. Nếu lỗi khi demo
- Kiểm tra port 5000 có bị chiếm không
- Kiểm tra MySQL service `MySQL84`
- Kiểm tra file `.env`
- Chạy lại `npm run dev`
