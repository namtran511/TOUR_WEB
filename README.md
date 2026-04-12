# Travel Spot Finder API

REST API cho dự án **Travel Spot Finder** - ứng dụng tìm kiếm địa điểm du lịch, hỗ trợ tìm kiếm theo khu vực, lưu yêu thích, đánh giá địa điểm và lấy tuyến đường qua Mapbox.

## Công nghệ sử dụng
- **Backend:** Node.js + Express.js
- **Database:** MySQL
- **ORM:** Prisma
- **Authentication:** JWT + bcrypt
- **Validation:** Zod
- **Upload middleware:** Multer
- **API Documentation:** Swagger UI

## Cấu trúc dự án
- `src/controllers` - xử lý request/response
- `src/services` - business logic
- `src/routes` - khai báo route
- `src/middlewares` - auth, role, validation, error
- `src/validations` - schema Zod
- `prisma` - schema + seed
- `docs` - tài liệu demo, checklist, báo cáo
- `postman` - Postman collection

## Cách chạy project
```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

## Biến môi trường
Tạo file `.env`:

```env
PORT=5000
DATABASE_URL="mysql://travel_app:travel123@localhost:3306/travel_spot_finder"
JWT_SECRET="your_super_secret_key"
MAPBOX_ACCESS_TOKEN="your_mapbox_token"
```

## Tài liệu đi kèm
- Swagger UI: `http://localhost:5000/api-docs`
- Demo guide: `docs/DEMO.md`
- Checklist bảo vệ: `docs/CHECKLIST.md`
- Endpoint summary: `docs/ENDPOINTS.md`
- Báo cáo tóm tắt: `docs/REPORT.md`
- Postman collection: `postman/TravelSpotFinder.postman_collection.json`

## Tài khoản mặc định
### Admin seed
- Email: `admin@travelspot.com`
- Password: `admin123`

### User test
- Email: `namtest@example.com`
- Password: `123456`

## Endpoint chính
- Auth: `/api/auth/*`
- Categories: `/api/categories`
- Spots: `/api/spots`
- Reviews: `/api/reviews`
- Favorites: `/api/favorites`
- Map: `/api/map/directions`

## Ghi chú
- Hệ thống đã được test với dữ liệu thật trên MySQL local.
- Nearby search sử dụng công thức Haversine.
- Directions sử dụng Mapbox Directions API.
