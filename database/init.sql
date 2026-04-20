-- SQL Server schema for Travel Spot Finder
-- Target: Microsoft SQL Server 2019+ (supports NVARCHAR(MAX), DATETIME2, IDENTITY)

IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.users (
        id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        full_name       NVARCHAR(100)     NOT NULL,
        email           NVARCHAR(150)     NOT NULL,
        password_hash   NVARCHAR(255)     NOT NULL,
        role            NVARCHAR(20)      NOT NULL CONSTRAINT DF_users_role DEFAULT 'USER'
                                          CONSTRAINT CK_users_role CHECK (role IN ('USER','ADMIN')),
        avatar_url      NVARCHAR(255)     NULL,
        created_at      DATETIME2(3)      NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
        updated_at      DATETIME2(3)      NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME()
    );
    CREATE UNIQUE INDEX users_email_key ON dbo.users(email);
END;
GO

IF OBJECT_ID('dbo.categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.categories (
        id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        name            NVARCHAR(100)     NOT NULL,
        description     NVARCHAR(MAX)     NULL,
        icon            NVARCHAR(255)     NULL,
        created_at      DATETIME2(3)      NOT NULL CONSTRAINT DF_categories_created_at DEFAULT SYSUTCDATETIME()
    );
    CREATE UNIQUE INDEX categories_name_key ON dbo.categories(name);
END;
GO

IF OBJECT_ID('dbo.spots', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.spots (
        id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        name            NVARCHAR(150)     NOT NULL,
        description     NVARCHAR(MAX)     NULL,
        address         NVARCHAR(255)     NOT NULL,
        city            NVARCHAR(100)     NOT NULL,
        latitude        FLOAT             NOT NULL,
        longitude       FLOAT             NOT NULL,
        category_id     INT               NOT NULL,
        image_url       NVARCHAR(255)     NULL,
        opening_hours   NVARCHAR(100)     NULL,
        ticket_price    DECIMAL(10, 2)    NULL,
        average_rating  FLOAT             NOT NULL CONSTRAINT DF_spots_average_rating DEFAULT 0,
        created_by      INT               NOT NULL,
        created_at      DATETIME2(3)      NOT NULL CONSTRAINT DF_spots_created_at DEFAULT SYSUTCDATETIME(),
        updated_at      DATETIME2(3)      NOT NULL CONSTRAINT DF_spots_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT spots_category_id_fkey FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE NO ACTION,
        CONSTRAINT spots_created_by_fkey  FOREIGN KEY (created_by)  REFERENCES dbo.users(id)      ON DELETE NO ACTION
    );
    CREATE INDEX spots_category_id_idx        ON dbo.spots(category_id);
    CREATE INDEX spots_created_by_idx         ON dbo.spots(created_by);
    CREATE INDEX spots_city_idx               ON dbo.spots(city);
    CREATE INDEX spots_latitude_longitude_idx ON dbo.spots(latitude, longitude);
END;
GO

IF OBJECT_ID('dbo.favorites', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.favorites (
        id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id     INT               NOT NULL,
        spot_id     INT               NOT NULL,
        created_at  DATETIME2(3)      NOT NULL CONSTRAINT DF_favorites_created_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
        CONSTRAINT favorites_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES dbo.spots(id) ON DELETE CASCADE
    );
    CREATE INDEX        favorites_user_id_idx          ON dbo.favorites(user_id);
    CREATE INDEX        favorites_spot_id_idx          ON dbo.favorites(spot_id);
    CREATE UNIQUE INDEX favorites_user_id_spot_id_key  ON dbo.favorites(user_id, spot_id);
END;
GO

IF OBJECT_ID('dbo.reviews', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.reviews (
        id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id     INT               NOT NULL,
        spot_id     INT               NOT NULL,
        rating      INT               NOT NULL,
        comment     NVARCHAR(MAX)     NULL,
        created_at  DATETIME2(3)      NOT NULL CONSTRAINT DF_reviews_created_at DEFAULT SYSUTCDATETIME(),
        updated_at  DATETIME2(3)      NOT NULL CONSTRAINT DF_reviews_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
        CONSTRAINT reviews_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES dbo.spots(id) ON DELETE CASCADE
    );
    CREATE INDEX        reviews_user_id_idx         ON dbo.reviews(user_id);
    CREATE INDEX        reviews_spot_id_idx         ON dbo.reviews(spot_id);
    CREATE UNIQUE INDEX reviews_user_id_spot_id_key ON dbo.reviews(user_id, spot_id);
END;
GO

IF OBJECT_ID('dbo.spot_images', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.spot_images (
        id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        spot_id     INT               NOT NULL,
        image_url   NVARCHAR(255)     NOT NULL,
        is_primary  BIT               NOT NULL CONSTRAINT DF_spot_images_is_primary DEFAULT 0,
        CONSTRAINT spot_images_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES dbo.spots(id) ON DELETE CASCADE
    );
    CREATE INDEX spot_images_spot_id_idx ON dbo.spot_images(spot_id);
END;
GO

IF OBJECT_ID('dbo.search_histories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.search_histories (
        id          INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id     INT               NOT NULL,
        keyword     NVARCHAR(150)     NULL,
        latitude    FLOAT             NULL,
        longitude   FLOAT             NULL,
        searched_at DATETIME2(3)      NOT NULL CONSTRAINT DF_search_histories_searched_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT search_histories_user_id_fkey FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
    );
    CREATE INDEX search_histories_user_id_idx ON dbo.search_histories(user_id);
    CREATE INDEX search_histories_keyword_idx ON dbo.search_histories(keyword);
END;
GO

IF OBJECT_ID('dbo.spot_packages', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.spot_packages (
        id                         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        spot_id                    INT               NOT NULL,
        name                       NVARCHAR(150)     NOT NULL,
        description                NVARCHAR(MAX)     NULL,
        price                      DECIMAL(10, 2)    NOT NULL,
        duration_minutes           INT               NULL,
        meeting_point              NVARCHAR(255)     NULL,
        pickup_included            BIT               NOT NULL CONSTRAINT DF_spot_packages_pickup_included DEFAULT 0,
        pickup_note                NVARCHAR(255)     NULL,
        pickup_area                NVARCHAR(255)     NULL,
        free_cancel_before_hours   INT               NOT NULL CONSTRAINT DF_spot_packages_free_cancel_hours DEFAULT 48,
        refund_percent_before      INT               NOT NULL CONSTRAINT DF_spot_packages_refund_before      DEFAULT 100,
        refund_percent_after       INT               NOT NULL CONSTRAINT DF_spot_packages_refund_after       DEFAULT 0,
        created_at                 DATETIME2(3)      NOT NULL CONSTRAINT DF_spot_packages_created_at         DEFAULT SYSUTCDATETIME(),
        updated_at                 DATETIME2(3)      NOT NULL CONSTRAINT DF_spot_packages_updated_at         DEFAULT SYSUTCDATETIME(),
        CONSTRAINT spot_packages_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES dbo.spots(id) ON DELETE CASCADE
    );
    CREATE INDEX spot_packages_spot_id_idx ON dbo.spot_packages(spot_id);
END;
GO

IF OBJECT_ID('dbo.spot_rooms', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.spot_rooms (
        id                         INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        spot_id                    INT               NOT NULL,
        name                       NVARCHAR(150)     NOT NULL,
        description                NVARCHAR(MAX)     NULL,
        price                      DECIMAL(10, 2)    NOT NULL,
        quantity                   INT               NOT NULL CONSTRAINT DF_spot_rooms_quantity                 DEFAULT 0,
        free_cancel_before_hours   INT               NOT NULL CONSTRAINT DF_spot_rooms_free_cancel_hours        DEFAULT 48,
        refund_percent_before      INT               NOT NULL CONSTRAINT DF_spot_rooms_refund_before            DEFAULT 100,
        refund_percent_after       INT               NOT NULL CONSTRAINT DF_spot_rooms_refund_after             DEFAULT 0,
        created_at                 DATETIME2(3)      NOT NULL CONSTRAINT DF_spot_rooms_created_at               DEFAULT SYSUTCDATETIME(),
        updated_at                 DATETIME2(3)      NOT NULL CONSTRAINT DF_spot_rooms_updated_at               DEFAULT SYSUTCDATETIME(),
        CONSTRAINT spot_rooms_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES dbo.spots(id) ON DELETE CASCADE
    );
    CREATE INDEX spot_rooms_spot_id_idx ON dbo.spot_rooms(spot_id);
END;
GO

IF OBJECT_ID('dbo.spot_departures', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.spot_departures (
        id                INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        spot_id           INT               NOT NULL,
        label             NVARCHAR(120)     NOT NULL,
        start_time        DATETIME2(3)      NOT NULL,
        end_time          DATETIME2(3)      NOT NULL,
        capacity          INT               NOT NULL CONSTRAINT DF_spot_departures_capacity     DEFAULT 0,
        booked_count      INT               NOT NULL CONSTRAINT DF_spot_departures_booked_count DEFAULT 0,
        confirmation_type NVARCHAR(20)      NOT NULL CONSTRAINT DF_spot_departures_conf_type    DEFAULT 'MANUAL'
                                           CONSTRAINT CK_spot_departures_conf_type CHECK (confirmation_type IN ('INSTANT','MANUAL')),
        is_active         BIT               NOT NULL CONSTRAINT DF_spot_departures_is_active    DEFAULT 1,
        created_at        DATETIME2(3)      NOT NULL CONSTRAINT DF_spot_departures_created_at   DEFAULT SYSUTCDATETIME(),
        updated_at        DATETIME2(3)      NOT NULL CONSTRAINT DF_spot_departures_updated_at   DEFAULT SYSUTCDATETIME(),
        CONSTRAINT spot_departures_spot_id_fkey FOREIGN KEY (spot_id) REFERENCES dbo.spots(id) ON DELETE CASCADE
    );
    CREATE INDEX spot_departures_spot_id_idx    ON dbo.spot_departures(spot_id);
    CREATE INDEX spot_departures_start_time_idx ON dbo.spot_departures(start_time);
END;
GO

IF OBJECT_ID('dbo.vouchers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.vouchers (
        id                  INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        code                NVARCHAR(50)      NOT NULL,
        name                NVARCHAR(120)     NOT NULL,
        description         NVARCHAR(MAX)     NULL,
        type                NVARCHAR(20)      NOT NULL CONSTRAINT CK_vouchers_type CHECK (type IN ('PERCENT','FIXED')),
        value               DECIMAL(10, 2)    NOT NULL,
        max_discount        DECIMAL(10, 2)    NULL,
        min_booking_amount  DECIMAL(10, 2)    NULL,
        usage_limit         INT               NULL,
        used_count          INT               NOT NULL CONSTRAINT DF_vouchers_used_count DEFAULT 0,
        expires_at          DATETIME2(3)      NULL,
        is_active           BIT               NOT NULL CONSTRAINT DF_vouchers_is_active  DEFAULT 1,
        created_at          DATETIME2(3)      NOT NULL CONSTRAINT DF_vouchers_created_at DEFAULT SYSUTCDATETIME(),
        updated_at          DATETIME2(3)      NOT NULL CONSTRAINT DF_vouchers_updated_at DEFAULT SYSUTCDATETIME()
    );
    CREATE UNIQUE INDEX vouchers_code_key ON dbo.vouchers(code);
END;
GO

IF OBJECT_ID('dbo.bookings', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.bookings (
        id                       INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        user_id                  INT               NOT NULL,
        spot_id                  INT               NOT NULL,
        package_id               INT               NULL,
        room_id                  INT               NULL,
        departure_id             INT               NULL,
        voucher_id               INT               NULL,
        [date]                   DATETIME2(3)      NOT NULL,
        end_date                 DATETIME2(3)      NOT NULL,
        guests                   INT               NOT NULL CONSTRAINT DF_bookings_guests      DEFAULT 1,
        tour_days                INT               NOT NULL CONSTRAINT DF_bookings_tour_days   DEFAULT 1,
        room_count               INT               NOT NULL CONSTRAINT DF_bookings_room_count  DEFAULT 1,
        subtotal_price           DECIMAL(12, 2)    NULL,
        discount_amount          DECIMAL(12, 2)    NULL,
        total_price              DECIMAL(12, 2)    NULL,
        refund_amount            DECIMAL(12, 2)    NULL,
        status                   NVARCHAR(20)      NOT NULL CONSTRAINT DF_bookings_status         DEFAULT 'PENDING'
                                                    CONSTRAINT CK_bookings_status CHECK (status IN ('PENDING','ACCEPTED','REJECTED','COMPLETED','CANCELLED','NO_SHOW')),
        payment_method           NVARCHAR(30)      NOT NULL CONSTRAINT DF_bookings_payment_method DEFAULT 'PAY_NOW'
                                                    CONSTRAINT CK_bookings_payment_method CHECK (payment_method IN ('PAY_NOW','PAY_LATER','PAY_AT_DESTINATION')),
        confirmation_type        NVARCHAR(20)      NOT NULL CONSTRAINT DF_bookings_conf_type      DEFAULT 'MANUAL'
                                                    CONSTRAINT CK_bookings_conf_type CHECK (confirmation_type IN ('INSTANT','MANUAL')),
        expires_at               DATETIME2(3)      NULL,
        confirmed_at             DATETIME2(3)      NULL,
        cancelled_at             DATETIME2(3)      NULL,
        rejection_reason         NVARCHAR(MAX)     NULL,
        cancellation_reason      NVARCHAR(MAX)     NULL,
        notes                    NVARCHAR(MAX)     NULL,
        booking_code             NVARCHAR(40)      NOT NULL,
        ticket_code              NVARCHAR(60)      NULL,
        qr_value                 NVARCHAR(120)     NULL,
        pickup_requested         BIT               NOT NULL CONSTRAINT DF_bookings_pickup_requested DEFAULT 0,
        pickup_address           NVARCHAR(255)     NULL,
        meeting_point_snapshot   NVARCHAR(255)     NULL,
        created_at               DATETIME2(3)      NOT NULL CONSTRAINT DF_bookings_created_at DEFAULT SYSUTCDATETIME(),
        updated_at               DATETIME2(3)      NOT NULL CONSTRAINT DF_bookings_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT bookings_user_id_fkey      FOREIGN KEY (user_id)      REFERENCES dbo.users(id)            ON DELETE CASCADE,
        CONSTRAINT bookings_spot_id_fkey      FOREIGN KEY (spot_id)      REFERENCES dbo.spots(id)            ON DELETE NO ACTION,
        CONSTRAINT bookings_package_id_fkey   FOREIGN KEY (package_id)   REFERENCES dbo.spot_packages(id)    ON DELETE SET NULL,
        CONSTRAINT bookings_room_id_fkey      FOREIGN KEY (room_id)      REFERENCES dbo.spot_rooms(id)       ON DELETE SET NULL,
        CONSTRAINT bookings_departure_id_fkey FOREIGN KEY (departure_id) REFERENCES dbo.spot_departures(id)  ON DELETE SET NULL,
        CONSTRAINT bookings_voucher_id_fkey   FOREIGN KEY (voucher_id)   REFERENCES dbo.vouchers(id)         ON DELETE SET NULL
    );
    CREATE INDEX        bookings_user_id_idx          ON dbo.bookings(user_id);
    CREATE INDEX        bookings_spot_id_idx          ON dbo.bookings(spot_id);
    CREATE INDEX        bookings_package_id_idx       ON dbo.bookings(package_id);
    CREATE INDEX        bookings_room_id_idx          ON dbo.bookings(room_id);
    CREATE INDEX        bookings_departure_id_idx     ON dbo.bookings(departure_id);
    CREATE INDEX        bookings_voucher_id_idx       ON dbo.bookings(voucher_id);
    CREATE UNIQUE INDEX bookings_booking_code_key     ON dbo.bookings(booking_code);
    CREATE UNIQUE INDEX bookings_ticket_code_key      ON dbo.bookings(ticket_code) WHERE ticket_code IS NOT NULL;
END;
GO

IF OBJECT_ID('dbo.payments', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.payments (
        id                INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        booking_id        INT               NOT NULL,
        amount            DECIMAL(12, 2)    NOT NULL,
        method            NVARCHAR(30)      NOT NULL CONSTRAINT CK_payments_method CHECK (method IN ('PAY_NOW','PAY_LATER','PAY_AT_DESTINATION')),
        status            NVARCHAR(30)      NOT NULL CONSTRAINT DF_payments_status DEFAULT 'UNPAID'
                                            CONSTRAINT CK_payments_status CHECK (status IN ('UNPAID','PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
        due_at            DATETIME2(3)      NULL,
        paid_at           DATETIME2(3)      NULL,
        refunded_at       DATETIME2(3)      NULL,
        transaction_code  NVARCHAR(80)      NULL,
        created_at        DATETIME2(3)      NOT NULL CONSTRAINT DF_payments_created_at DEFAULT SYSUTCDATETIME(),
        updated_at        DATETIME2(3)      NOT NULL CONSTRAINT DF_payments_updated_at DEFAULT SYSUTCDATETIME(),
        CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES dbo.bookings(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX payments_booking_id_key       ON dbo.payments(booking_id);
    CREATE UNIQUE INDEX payments_transaction_code_key ON dbo.payments(transaction_code) WHERE transaction_code IS NOT NULL;
END;
GO
