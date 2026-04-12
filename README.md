# Travel Spot Finder API

Ứng dụng tìm kiếm địa điểm du lịch gồm:
- Backend `Node.js + Express + Prisma + MySQL`
- Frontend `Vite`
- Tích hợp `Mapbox` cho bản đồ và directions

## Công nghệ sử dụng
- Backend: `Node.js`, `Express.js`
- Database: `MySQL`
- ORM: `Prisma`
- Authentication: `JWT`, `bcrypt`
- Validation: `Zod`
- API docs: `Swagger UI`
- Frontend: `Vite`, `Mapbox GL JS`

## Cấu trúc project
- `src/`: backend source
- `prisma/`: schema, migration, seed
- `client/`: frontend source
- `docs/`: tài liệu demo và báo cáo
- `postman/`: Postman collection

## Clone và cài đặt
### 1. Cài dependencies
```bash
npm install
cd client
npm install
cd ..
```

### 2. Cấu hình biến môi trường
Project này dùng **2 file env khác nhau**:

- Backend: [`.env`](./.env)
- Frontend: [`client/.env`](./client/.env)

Bạn có thể copy từ file mẫu:

```bash
copy .env.example .env
copy client\.env.example client\.env
```

Nếu dùng PowerShell:

```powershell
Copy-Item .env.example .env
Copy-Item client/.env.example client/.env
```

## Cấu hình Mapbox đầy đủ
Project này dùng **2 loại token Mapbox** khác nhau:

### 1. Backend token: `MAPBOX_ACCESS_TOKEN`
Dùng cho API directions ở backend.

File: [`.env`](./.env)

```env
PORT=5000
DATABASE_URL="mysql://travel_app:travel123@localhost:3306/travel_spot_finder"
JWT_SECRET="your_super_secret_key"
MAPBOX_ACCESS_TOKEN="your_mapbox_token"
```

Ghi chú:
- Biến này được backend dùng trong route directions.
- Nên dùng token phù hợp với nhu cầu server của bạn.
- Không commit token thật lên GitHub.

### 2. Frontend token: `VITE_MAPBOX_TOKEN`
Dùng để hiển thị bản đồ ở giao diện người dùng.

File: [`client/.env`](./client/.env)

```env
VITE_MAPBOX_TOKEN="your_mapbox_public_token"
```

Ghi chú:
- Đây là biến dành cho Vite nên **phải bắt đầu bằng** `VITE_`.
- Nếu thiếu biến này, frontend **không crash**, nhưng phần bản đồ sẽ hiện thông báo thiếu cấu hình Mapbox.
- Sau khi sửa `client/.env`, hãy chạy lại frontend dev server.

## Chạy backend
```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Backend chạy mặc định tại:
- API: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/api-docs`

## Chạy frontend
Mở terminal khác:

```bash
cd client
npm run dev
```

Frontend chạy mặc định tại:
- `http://localhost:5173`

Frontend đã cấu hình proxy `/api` sang:
- `http://localhost:5000`

## Nếu clone về mà chưa có Mapbox token thì sao?
### Thiếu `MAPBOX_ACCESS_TOKEN`
- API directions ở backend sẽ không hoạt động đúng.

### Thiếu `VITE_MAPBOX_TOKEN`
- Danh sách địa điểm, auth, booking, admin vẫn có thể chạy.
- Riêng phần bản đồ trên frontend sẽ hiện trạng thái:
  `Thiếu cấu hình Mapbox`

## Tài khoản mặc định sau khi seed
### Admin
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

## Tài liệu đi kèm
- Swagger UI: `http://localhost:5000/api-docs`
- Demo guide: [`docs/DEMO.md`](./docs/DEMO.md)
- Checklist: [`docs/CHECKLIST.md`](./docs/CHECKLIST.md)
- Endpoint summary: [`docs/ENDPOINTS.md`](./docs/ENDPOINTS.md)
- Report: [`docs/REPORT.md`](./docs/REPORT.md)
- Postman collection: [`postman/TravelSpotFinder.postman_collection.json`](./postman/TravelSpotFinder.postman_collection.json)

## Lưu ý
- Không commit `.env` hoặc token thật lên GitHub.
- Backend và frontend dùng env riêng, đừng chỉ cấu hình một bên.
- Nearby search dùng công thức Haversine.
- Directions dùng Mapbox Directions API.
