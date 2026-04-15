# Sơ Đồ Hoạt Động Project

Tài liệu này mô tả luồng hoạt động chính của project `TravelSpotFinder-API` theo code hiện tại.

## 1. Kiến trúc tổng thể

```mermaid
flowchart LR
    U[Người dùng / Admin] --> FE[Frontend Vite<br/>client/]
    FE -->|fetch /api| API[Express API<br/>src/app.js + src/routes/*]

    API --> MW[Middleware<br/>auth / role / validate / error]
    MW --> CTL[Controller]
    CTL --> SVC[Service Layer]
    SVC --> PRISMA[Prisma Client]
    PRISMA --> DB[(MySQL)]

    SVC --> MAPBOX[Mapbox Directions API]
    SVC --> VNPAY[VNPAY Simulator]

    DB --> DATA[User / Spot / Review / Favorite<br/>Booking / Payment]
```

## 2. Luồng request backend

```mermaid
flowchart TD
    A[Client gọi API] --> B[src/app.js]
    B --> C[/api]
    C --> D[src/routes/index.js]
    D --> E[Route module]
    E --> F[authenticate?]
    F --> G[authorizeRoles?]
    G --> H[validate Zod?]
    H --> I[Controller]
    I --> J[Service]
    J --> K[Prisma / External API]
    K --> L[successResponse / JSON]
    J --> M[throw Error]
    M --> N[globalErrorHandler]
    N --> O[JSON error]
```

## 3. Luồng người dùng chính

```mermaid
flowchart TD
    U[User] --> H[Home / Search Spots]
    H --> S[Spot Detail]
    S --> R1[Xem review / lịch khởi hành / package / room]
    S --> B1[Tạo booking]
    B1 --> API1[POST /api/bookings]
    API1 --> BK[booking.service.createBooking]
    BK --> DB1[(Booking + Payment)]

    DB1 --> P{Payment method}
    P -->|PAY_NOW| V1[Thanh toán ngay]
    P -->|PAY_LATER| V2[Thanh toán sau]
    P -->|PAY_AT_DESTINATION| V3[Trả tại điểm đến]

    V1 --> MY[Trang My Bookings]
    V2 --> MY
    V3 --> MY

    MY -->|Thanh toán VNPAY| PAY[POST /api/bookings/:id/pay]
    PAY --> SIM[VNPAY Simulator]
    SIM --> RET[GET /api/payments/vnpay/return]
    RET --> FP[finalizeVnpayPayment]
    FP --> DB2[(Payment updated)]
    DB2 --> MY2[Quay lại My Bookings]
```

## 4. Luồng booking chi tiết

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant BookingAPI as /api/bookings
    participant BookingService
    participant DB as MySQL

    User->>Frontend: Chọn spot / package / room / departure
    Frontend->>BookingAPI: POST /bookings
    BookingAPI->>BookingService: createBooking(userId, payload)
    BookingService->>DB: Kiểm tra spot, departure, package, room
    BookingService->>DB: Tính subtotal / discount / total
    BookingService->>DB: Tạo Booking
    BookingService->>DB: Tạo Payment tương ứng
    BookingService-->>Frontend: Booking + payment status + due_at

    Note over BookingService,DB: confirmation_type có thể là INSTANT hoặc MANUAL
    Note over BookingService,DB: payment_method có thể là PAY_NOW / PAY_LATER / PAY_AT_DESTINATION
```

## 5. Luồng thanh toán VNPAY giả lập

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend Bookings
    participant API as Booking API
    participant PaySvc as booking.service.payBooking
    participant VNP as vnpay.service
    participant Sim as VNPAY Simulator Page
    participant Return as /api/payments/vnpay/return
    participant DB as MySQL

    User->>FE: Bấm "Thanh toán VNPAY"
    FE->>API: POST /api/bookings/:id/pay { provider: VNPAY }
    API->>PaySvc: payBooking(...)
    PaySvc->>DB: Update payment.status = PENDING
    PaySvc->>VNP: createSimulationPaymentUrl(...)
    VNP-->>FE: payment_url
    FE->>Sim: redirect payment_url

    User->>Sim: Chọn phương thức + XÁC THỰC
    Sim->>Return: GET /api/payments/vnpay/return?signed_params
    Return->>DB: finalizeVnpayPayment(...)
    DB-->>Return: payment.status = PAID hoặc FAILED
    Return-->>User: Trang kết quả thanh toán
    User->>FE: Mở lại #/bookings
```

## 6. Luồng admin duyệt booking

```mermaid
flowchart TD
    A[Admin Login] --> B[Admin Page]
    B --> C[GET /api/bookings/admin]
    C --> D[Xem danh sách booking]
    D --> E{Hành động}

    E -->|ACCEPTED| F[PATCH /api/bookings/:id/status]
    F --> G[booking.service.updateBookingStatus]
    G --> H[booking.status = ACCEPTED]
    H --> I{Đủ điều kiện xuất vé?}
    I -->|Có| J[Tạo ticket_code + qr_value]

    E -->|REJECTED| K[booking.status = REJECTED]
    K --> L[Giải phóng capacity]
    K --> M[Giảm used_count voucher]
    K --> N{Đã thanh toán?}
    N -->|Có| O[payment.status = REFUNDED]

    E -->|COMPLETED| P[booking.status = COMPLETED]
    E -->|NO_SHOW| Q[booking.status = NO_SHOW]
```

## 7. Luồng lifecycle tự động của booking

```mermaid
flowchart TD
    A[syncBookingLifecycle] --> B[Kiểm tra booking PENDING quá hạn xác nhận]
    B --> C[status = REJECTED]
    C --> D[Nếu đã trả tiền -> REFUNDED]
    C --> E[Giải phóng departure capacity]
    C --> F[Giảm voucher used_count]

    A --> G[Kiểm tra payment quá hạn]
    G --> H{payment_method}
    H -->|PAY_AT_DESTINATION| I[Bỏ qua]
    H -->|PAY_NOW / PAY_LATER| J[payment.status = FAILED]
```

## 8. Quan hệ dữ liệu chính

```mermaid
erDiagram
    USER ||--o{ BOOKING : creates
    USER ||--o{ REVIEW : writes
    USER ||--o{ FAVORITE : saves
    USER ||--o{ SPOT : creates

    CATEGORY ||--o{ SPOT : groups
    SPOT ||--o{ REVIEW : has
    SPOT ||--o{ FAVORITE : has
    SPOT ||--o{ BOOKING : receives
    SPOT ||--o{ SPOTPACKAGE : offers
    SPOT ||--o{ SPOTROOM : offers
    SPOT ||--o{ SPOTDEPARTURE : schedules

    SPOTPACKAGE ||--o{ BOOKING : selected_in
    SPOTROOM ||--o{ BOOKING : selected_in
    SPOTDEPARTURE ||--o{ BOOKING : selected_in
    VOUCHER ||--o{ BOOKING : applies_to

    BOOKING ||--|| PAYMENT : owns
```

## 9. Thành phần chính theo thư mục

```text
client/
  main.js
  src/router.js
  src/api.js
  src/pages/Home.js
  src/pages/SpotDetail.js
  src/pages/Bookings.js
  src/pages/Admin.js

src/
  app.js
  server.js
  routes/
  controllers/
  services/
  middlewares/
  validations/
  config/

prisma/
  schema.prisma
  migrations/
  seed.js
```

## 10. Gợi ý đọc project theo thứ tự

1. `README.md`
2. `src/app.js`
3. `src/routes/index.js`
4. `src/services/spot.service.js`
5. `src/services/booking.service.js`
6. `src/controllers/payment.controller.js`
7. `client/src/router.js`
8. `client/src/api.js`
9. `client/src/pages/SpotDetail.js`
10. `client/src/pages/Bookings.js`
11. `client/src/pages/Admin.js`
