CREATE TABLE IF NOT EXISTS `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `avatar_url` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `address` VARCHAR(255) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `category_id` INTEGER NOT NULL,
    `image_url` VARCHAR(255) NULL,
    `opening_hours` VARCHAR(100) NULL,
    `ticket_price` DECIMAL(10, 2) NULL,
    `average_rating` DOUBLE NOT NULL DEFAULT 0,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `spots_category_id_idx`(`category_id`),
    INDEX `spots_created_by_idx`(`created_by`),
    INDEX `spots_city_idx`(`city`),
    INDEX `spots_latitude_longitude_idx`(`latitude`, `longitude`),
    PRIMARY KEY (`id`),
    CONSTRAINT `spots_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `spots_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `favorites` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `spot_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `favorites_user_id_idx`(`user_id`),
    INDEX `favorites_spot_id_idx`(`spot_id`),
    UNIQUE INDEX `favorites_user_id_spot_id_key`(`user_id`, `spot_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `favorites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `favorites_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `spot_id` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `reviews_user_id_idx`(`user_id`),
    INDEX `reviews_spot_id_idx`(`spot_id`),
    UNIQUE INDEX `reviews_user_id_spot_id_key`(`user_id`, `spot_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `reviews_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spot_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `spot_id` INTEGER NOT NULL,
    `image_url` VARCHAR(255) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    INDEX `spot_images_spot_id_idx`(`spot_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `spot_images_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `search_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `keyword` VARCHAR(150) NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `searched_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `search_histories_user_id_idx`(`user_id`),
    INDEX `search_histories_keyword_idx`(`keyword`),
    PRIMARY KEY (`id`),
    CONSTRAINT `search_histories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spot_packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `spot_id` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `duration_minutes` INTEGER NULL,
    `meeting_point` VARCHAR(255) NULL,
    `pickup_included` BOOLEAN NOT NULL DEFAULT false,
    `pickup_note` VARCHAR(255) NULL,
    `pickup_area` VARCHAR(255) NULL,
    `free_cancel_before_hours` INTEGER NOT NULL DEFAULT 48,
    `refund_percent_before` INTEGER NOT NULL DEFAULT 100,
    `refund_percent_after` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `spot_packages_spot_id_idx`(`spot_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `spot_packages_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spot_rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `spot_id` INTEGER NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 0,
    `free_cancel_before_hours` INTEGER NOT NULL DEFAULT 48,
    `refund_percent_before` INTEGER NOT NULL DEFAULT 100,
    `refund_percent_after` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `spot_rooms_spot_id_idx`(`spot_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `spot_rooms_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `spot_departures` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `spot_id` INTEGER NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `capacity` INTEGER NOT NULL DEFAULT 0,
    `booked_count` INTEGER NOT NULL DEFAULT 0,
    `confirmation_type` ENUM('INSTANT', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `spot_departures_spot_id_idx`(`spot_id`),
    INDEX `spot_departures_start_time_idx`(`start_time`),
    PRIMARY KEY (`id`),
    CONSTRAINT `spot_departures_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vouchers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('PERCENT', 'FIXED') NOT NULL,
    `value` DECIMAL(10, 2) NOT NULL,
    `max_discount` DECIMAL(10, 2) NULL,
    `min_booking_amount` DECIMAL(10, 2) NULL,
    `usage_limit` INTEGER NULL,
    `used_count` INTEGER NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `vouchers_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `spot_id` INTEGER NOT NULL,
    `package_id` INTEGER NULL,
    `room_id` INTEGER NULL,
    `departure_id` INTEGER NULL,
    `voucher_id` INTEGER NULL,
    `date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `guests` INTEGER NOT NULL DEFAULT 1,
    `tour_days` INTEGER NOT NULL DEFAULT 1,
    `room_count` INTEGER NOT NULL DEFAULT 1,
    `subtotal_price` DECIMAL(12, 2) NULL,
    `discount_amount` DECIMAL(12, 2) NULL,
    `total_price` DECIMAL(12, 2) NULL,
    `refund_amount` DECIMAL(12, 2) NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING',
    `payment_method` ENUM('PAY_NOW', 'PAY_LATER', 'PAY_AT_DESTINATION') NOT NULL DEFAULT 'PAY_NOW',
    `confirmation_type` ENUM('INSTANT', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    `expires_at` DATETIME(3) NULL,
    `confirmed_at` DATETIME(3) NULL,
    `cancelled_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,
    `cancellation_reason` TEXT NULL,
    `notes` TEXT NULL,
    `booking_code` VARCHAR(40) NOT NULL,
    `ticket_code` VARCHAR(60) NULL,
    `qr_value` VARCHAR(120) NULL,
    `pickup_requested` BOOLEAN NOT NULL DEFAULT false,
    `pickup_address` VARCHAR(255) NULL,
    `meeting_point_snapshot` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    INDEX `bookings_user_id_idx`(`user_id`),
    INDEX `bookings_spot_id_idx`(`spot_id`),
    INDEX `bookings_package_id_idx`(`package_id`),
    INDEX `bookings_room_id_idx`(`room_id`),
    INDEX `bookings_departure_id_idx`(`departure_id`),
    INDEX `bookings_voucher_id_idx`(`voucher_id`),
    UNIQUE INDEX `bookings_booking_code_key`(`booking_code`),
    UNIQUE INDEX `bookings_ticket_code_key`(`ticket_code`),
    PRIMARY KEY (`id`),
    CONSTRAINT `bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `bookings_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `bookings_package_id_fkey` FOREIGN KEY (`package_id`) REFERENCES `spot_packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `bookings_room_id_fkey` FOREIGN KEY (`room_id`) REFERENCES `spot_rooms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `bookings_departure_id_fkey` FOREIGN KEY (`departure_id`) REFERENCES `spot_departures`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `bookings_voucher_id_fkey` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` ENUM('PAY_NOW', 'PAY_LATER', 'PAY_AT_DESTINATION') NOT NULL,
    `status` ENUM('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED') NOT NULL DEFAULT 'UNPAID',
    `due_at` DATETIME(3) NULL,
    `paid_at` DATETIME(3) NULL,
    `refunded_at` DATETIME(3) NULL,
    `transaction_code` VARCHAR(80) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE INDEX `payments_booking_id_key`(`booking_id`),
    UNIQUE INDEX `payments_transaction_code_key`(`transaction_code`),
    PRIMARY KEY (`id`),
    CONSTRAINT `payments_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
