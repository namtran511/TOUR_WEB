# Báo Cáo Tóm Tắt - Travel Spot Finder API

## 1. Giới thiệu đề tài
Travel Spot Finder là REST API phục vụ ứng dụng tìm kiếm địa điểm du lịch. Hệ thống hỗ trợ người dùng tra cứu địa điểm, tìm địa điểm gần vị trí hiện tại, lưu yêu thích, đánh giá địa điểm và lấy gợi ý tuyến đường bằng Mapbox.

## 2. Mục tiêu
- Xây dựng REST API theo kiến trúc rõ ràng, dễ mở rộng.
- Tích hợp xác thực JWT và phân quyền USER / ADMIN.
- Quản lý dữ liệu bằng MySQL và Prisma ORM.
- Hỗ trợ truy vấn không gian cơ bản bằng công thức Haversine.
- Tích hợp API bên thứ ba (Mapbox Directions API).

## 3. Công nghệ sử dụng
- Backend: Node.js, Express.js
- Database: MySQL
- ORM: Prisma
- Authentication: JWT, bcrypt
- Validation: Zod
- Upload middleware: Multer
- API docs: Swagger UI

## 4. Chức năng chính
### 4.1 Auth
- Đăng ký tài khoản
- Đăng nhập
- Lấy thông tin cá nhân

### 4.2 Category
- Thêm / sửa / xóa category (Admin)
- Xem danh sách category
- Xem chi tiết category

### 4.3 Spot
- CRUD spot
- Tìm kiếm spot theo từ khóa, category, city
- Tìm nearby spot theo lat/lng và radius
- Xem chi tiết spot và reviews

### 4.4 Review
- Viết review
- Cập nhật review
- Xóa review
- Tự động cập nhật average_rating

### 4.5 Favorite
- Thêm favorite
- Xóa favorite
- Xem danh sách favorite của user

### 4.6 Map
- Lấy directions từ Mapbox

## 5. Kiến trúc dự án
- Controller: nhận request, trả response
- Service: xử lý business logic
- Route: khai báo endpoint
- Middleware: auth, role, validation, upload, error
- Validation: schema Zod

## 6. Điểm nổi bật
- Có phân quyền rõ ràng giữa USER và ADMIN
- Có pagination, sorting ở list API
- Có xử lý logic nearby search bằng Haversine
- Có tích hợp Mapbox thực tế
- Có Swagger docs và Postman collection

## 7. Hướng phát triển thêm
- Upload ảnh lên Cloudinary
- Thêm dashboard thống kê
- Thêm gợi ý địa điểm theo lịch sử tìm kiếm
- Thêm frontend cho người dùng cuối
