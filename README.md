# Travel Spot Finder API

Backend của project này đã được chuyển sang `ASP.NET Core 8 + EF Core + MySQL`.

Frontend vẫn là `Vite` trong thư mục `client/`.

## Stack hiện tại
- Backend: `ASP.NET Core 8`, `EF Core`, `Pomelo MySQL`
- Authentication: `JWT`, `BCrypt`
- API docs: `Swagger UI`
- Database: `MySQL`
- Frontend: `Vite`
- Bản đồ: `Mapbox`
- Thanh toán giả lập: `VNPAY simulator`

## Cấu trúc chính
- `Controllers/`: API controllers ASP.NET Core
- `Services/`: business logic
- `Data/`: `DbContext`, entities, seeder
- `Dtos/`: request models
- `database/init.sql`: SQL bootstrap schema MySQL
- `client/`: frontend Vite
- `docs/`: tài liệu dự án
- `postman/`: Postman collection

## Biến môi trường
Project tiếp tục dùng file [`.env`](./.env) ở root.

Copy file mẫu:

```powershell
Copy-Item .env.example .env
```

Nội dung mẫu:

```env
PORT=5000
DATABASE_URL="mysql://travel_app:travel123@localhost:3306/travel_spot_finder"
JWT_SECRET="your_super_secret_key"
MAPBOX_ACCESS_TOKEN="your_mapbox_token"
APP_BASE_URL="http://localhost:5000"
CLIENT_BASE_URL="http://localhost:5173"
VNPAY_TMN_CODE="SIMULATOR"
VNPAY_HASH_SECRET="replace_with_strong_secret"
VNPAY_RETURN_URL="http://localhost:5000/api/payments/vnpay/return"
```

`DATABASE_URL` có thể giữ nguyên format cũ kiểu Prisma (`mysql://...`). Backend ASP.NET Core sẽ tự chuyển sang connection string MySQL.

## Khởi tạo database
Nếu database chưa có schema, chạy file SQL bootstrap:

```powershell
mysql -u root -p travel_spot_finder < database/init.sql
```

Hoặc import file [`database/init.sql`](./database/init.sql) bằng MySQL Workbench.

## Seed dữ liệu
Seeder đã được chuyển sang .NET:

```powershell
dotnet run -- --seed
```

Seeder sẽ tạo:
- Admin: `admin@travelspot.com` / `admin123`
- User test: `namtest@example.com` / `123456`
- Category mẫu
- Voucher mẫu
- Packages và departures demo cho các spot hiện có

## Chạy backend
```powershell
dotnet restore
dotnet build
dotnet run
```

Backend mặc định:
- API: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/api-docs`

## Chạy frontend
Mở terminal khác:

```powershell
cd client
npm install
npm run dev
```

Frontend mặc định:
- `http://localhost:5173`

Frontend vẫn gọi backend qua `/api`.

## Endpoint chính
- Auth: `/api/auth/*`
- Categories: `/api/categories`
- Spots: `/api/spots`
- Reviews: `/api/reviews`
- Favorites: `/api/favorites`
- Map: `/api/map/directions`
- Bookings: `/api/bookings/*`
- Payments: `/api/payments/vnpay/*`

## VNPAY simulator
- Tạo phiên thanh toán: `POST /api/bookings/{id}/pay`
- Trang giả lập thanh toán: `GET /api/payments/vnpay/simulate`
- Callback gateway: `GET /api/payments/vnpay/return`

## Mapbox
- Backend dùng `MAPBOX_ACCESS_TOKEN`
- Frontend dùng `client/.env` với `VITE_MAPBOX_TOKEN`

## Ghi chú chuyển đổi
- Backend chạy chính thức từ [`TravelSpotFinder.Api.csproj`](./TravelSpotFinder.Api.csproj)
- Response contract `/api/*` được giữ nguyên để frontend hiện tại vẫn dùng được
- Một số file Node/Prisma cũ vẫn còn trong repo như dữ liệu tham chiếu lịch sử, nhưng không còn là runtime backend chính
