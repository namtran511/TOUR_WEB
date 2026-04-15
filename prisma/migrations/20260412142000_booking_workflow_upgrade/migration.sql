-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `booking_code` VARCHAR(40) NULL,
    ADD COLUMN `cancellation_reason` TEXT NULL,
    ADD COLUMN `cancelled_at` DATETIME(3) NULL,
    ADD COLUMN `confirmation_type` ENUM('INSTANT', 'MANUAL') NOT NULL DEFAULT 'MANUAL',
    ADD COLUMN `confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `departure_id` INTEGER NULL,
    ADD COLUMN `discount_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `expires_at` DATETIME(3) NULL,
    ADD COLUMN `meeting_point_snapshot` VARCHAR(255) NULL,
    ADD COLUMN `payment_method` ENUM('PAY_NOW', 'PAY_LATER', 'PAY_AT_DESTINATION') NOT NULL DEFAULT 'PAY_NOW',
    ADD COLUMN `pickup_address` VARCHAR(255) NULL,
    ADD COLUMN `pickup_requested` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `qr_value` VARCHAR(120) NULL,
    ADD COLUMN `refund_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `rejection_reason` TEXT NULL,
    ADD COLUMN `subtotal_price` DECIMAL(12, 2) NULL,
    ADD COLUMN `ticket_code` VARCHAR(60) NULL,
    ADD COLUMN `voucher_id` INTEGER NULL,
    MODIFY `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING';

UPDATE `bookings`
SET `booking_code` = CONCAT('BK-LEGACY-', `id`)
WHERE `booking_code` IS NULL;

ALTER TABLE `bookings`
    MODIFY `booking_code` VARCHAR(40) NOT NULL;

-- AlterTable
ALTER TABLE `spot_packages` ADD COLUMN `duration_minutes` INTEGER NULL,
    ADD COLUMN `free_cancel_before_hours` INTEGER NOT NULL DEFAULT 48,
    ADD COLUMN `meeting_point` VARCHAR(255) NULL,
    ADD COLUMN `pickup_area` VARCHAR(255) NULL,
    ADD COLUMN `pickup_included` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `pickup_note` VARCHAR(255) NULL,
    ADD COLUMN `refund_percent_after` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `refund_percent_before` INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE `spot_rooms` ADD COLUMN `free_cancel_before_hours` INTEGER NOT NULL DEFAULT 48,
    ADD COLUMN `refund_percent_after` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `refund_percent_before` INTEGER NOT NULL DEFAULT 100;

-- CreateTable
CREATE TABLE `spot_departures` (
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
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `spot_departures_spot_id_idx`(`spot_id`),
    INDEX `spot_departures_start_time_idx`(`start_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers` (
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
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vouchers_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
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
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_booking_id_key`(`booking_id`),
    UNIQUE INDEX `payments_transaction_code_key`(`transaction_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `bookings_booking_code_key` ON `bookings`(`booking_code`);

-- CreateIndex
CREATE UNIQUE INDEX `bookings_ticket_code_key` ON `bookings`(`ticket_code`);

-- CreateIndex
CREATE INDEX `bookings_departure_id_idx` ON `bookings`(`departure_id`);

-- CreateIndex
CREATE INDEX `bookings_voucher_id_idx` ON `bookings`(`voucher_id`);

-- AddForeignKey
ALTER TABLE `spot_departures` ADD CONSTRAINT `spot_departures_spot_id_fkey` FOREIGN KEY (`spot_id`) REFERENCES `spots`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_departure_id_fkey` FOREIGN KEY (`departure_id`) REFERENCES `spot_departures`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_voucher_id_fkey` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
