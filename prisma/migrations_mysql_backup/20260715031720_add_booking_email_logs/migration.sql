-- AlterTable
ALTER TABLE `booking` ADD COLUMN `approvedEmailSent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `approvedEmailSentAt` DATETIME(3) NULL,
    ADD COLUMN `lastNotificationError` VARCHAR(500) NULL,
    ADD COLUMN `rejectedEmailSent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `rejectedEmailSentAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `EmailLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NULL,
    `sentById` INTEGER NULL,
    `toEmail` VARCHAR(191) NOT NULL,
    `toName` VARCHAR(150) NULL,
    `subject` VARCHAR(255) NOT NULL,
    `body` TEXT NOT NULL,
    `emailType` VARCHAR(50) NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'SENT',
    `errorMessage` VARCHAR(500) NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EmailLog_bookingId_idx`(`bookingId`),
    INDEX `EmailLog_sentById_idx`(`sentById`),
    INDEX `EmailLog_emailType_idx`(`emailType`),
    INDEX `EmailLog_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EmailLog` ADD CONSTRAINT `EmailLog_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailLog` ADD CONSTRAINT `EmailLog_sentById_fkey` FOREIGN KEY (`sentById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
