# Travel Spot Finder API

Backend của project này đang chạy bằng `ASP.NET Core 8 + Entity Framework Core + SQL Server`.

Frontend nằm trong thư mục `client/` và dùng `Vite`. Phần frontend là tùy chọn nếu bạn chỉ muốn chạy API.

## Stack hiện tại

- Backend: `ASP.NET Core 8`
- ORM: `Entity Framework Core`
- Database: `SQL Server`
- Authentication: `JWT`, `BCrypt`
- API docs: `Swagger UI`
- Frontend: `Vite`
- Bản đồ: `Mapbox`
- Thanh toán giả lập: `VNPAY simulator`

## Cấu trúc chính

- `Controllers/`: API controllers
- `Services/`: business logic
- `Data/`: `DbContext`, entities, migrations, seeder
- `Dtos/`: request models
- `Configuration/`: cấu hình env, JWT, database URL parser
- `client/`: frontend Vite
- `docs/`: tài liệu dự án
- `postman/`: Postman collection

## Yêu cầu cài đặt

- .NET 8 SDK
- SQL Server hoặc SQL Server Express
- Visual Studio Code Insiders, Visual Studio, hoặc IDE khác hỗ trợ .NET
- Node.js chỉ cần khi chạy frontend trong `client/`

Nếu chưa có EF Core CLI:

```powershell
dotnet tool install --global dotnet-ef
```

## Biến môi trường

Project dùng file `.env` ở root.

Nếu chưa có `.env`, copy file mẫu:

```powershell
Copy-Item .env.example .env
```

Ví dụ cấu hình SQL Server Express:

```env
PORT=5000
DATABASE_URL="Server=localhost\SQLEXPRESS;Database=travel_spot_finder;Trusted_Connection=True;TrustServerCertificate=True"
JWT_SECRET="your_super_secret_key"
MAPBOX_ACCESS_TOKEN="your_mapbox_token"
APP_BASE_URL="http://localhost:5000"
CLIENT_BASE_URL="http://localhost:5173"
VNPAY_TMN_CODE="SIMULATOR"
VNPAY_HASH_SECRET="replace_with_strong_secret"
VNPAY_RETURN_URL="http://localhost:5000/api/payments/vnpay/return"
```

Nếu dùng instance SQL Server khác, sửa `DATABASE_URL` cho đúng máy của bạn.

## Khởi tạo database

Đảm bảo SQL Server đang chạy, sau đó tạo database/schema bằng EF Core migrations:

```powershell
dotnet restore
dotnet ef database update
```

Connection string sẽ được đọc từ biến `DATABASE_URL` trong file `.env`.

## Seed dữ liệu

Chạy seeder:

```powershell
dotnet run -- --seed
```

Seeder tạo dữ liệu mẫu, bao gồm:

- Admin: `admin@travelspot.com` / `admin123`
- User test: `namtest@example.com` / `123456`
- Categories mẫu
- Vouchers mẫu
- Packages và departures demo cho các spot hiện có

## Chạy backend

```powershell
dotnet restore
dotnet build
dotnet run --launch-profile http
```

Backend mặc định:

- API: `http://localhost:5000`
- Swagger UI: `http://localhost:5000/api-docs`

## Chạy trong VS Code Insiders

Mở project:

```powershell
cd C:\Users\namtr\Downloads\TravelSpotFinder-API
code-insiders .
```

Trong terminal của VS Code Insiders:

```powershell
dotnet run --launch-profile http
```

Sau đó mở:

```text
http://localhost:5000/api-docs
```

## Chạy frontend

Mở terminal khác:

```powershell
cd client
npm install
npm run dev
```

Frontend mặc định:

- `http://localhost:5173`

Frontend gọi backend qua `/api`.

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

## Ghi chú

- Backend chạy chính thức từ `TravelSpotFinder.Api.csproj`
- Database runtime hiện tại là SQL Server thông qua `Microsoft.EntityFrameworkCore.SqlServer`
- Schema được quản lý bằng EF Core migrations trong `Data/Migrations`
- Node.js chỉ cần cho frontend Vite trong `client/`, không cần cho backend API
