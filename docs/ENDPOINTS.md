# Danh Sách Endpoint Chính

## Auth
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/auth/me`

## Categories
- GET `/api/categories`
- GET `/api/categories/:id`
- POST `/api/categories`
- PUT `/api/categories/:id`
- DELETE `/api/categories/:id`

## Spots
- GET `/api/spots`
- GET `/api/spots/:id`
- POST `/api/spots`
- PUT `/api/spots/:id`
- DELETE `/api/spots/:id`
- GET `/api/spots/search`
- GET `/api/spots/nearby`

## Reviews
- GET `/api/reviews/spot/:spotId`
- POST `/api/reviews/spot/:spotId`
- PUT `/api/reviews/:id`
- DELETE `/api/reviews/:id`

## Favorites
- GET `/api/favorites`
- POST `/api/favorites/:spotId`
- DELETE `/api/favorites/:spotId`

## Map
- GET `/api/map/directions`

## Bookings
- POST `/api/bookings`
- GET `/api/bookings/me`
- GET `/api/bookings/admin`
- POST `/api/bookings/:id/pay`
- POST `/api/bookings/:id/cancel`
- GET `/api/bookings/:id/ticket`
- PATCH `/api/bookings/:id/status`

## Payments (VNPAY Simulator)
- GET `/api/payments/vnpay/simulate`
- GET `/api/payments/vnpay/return`
