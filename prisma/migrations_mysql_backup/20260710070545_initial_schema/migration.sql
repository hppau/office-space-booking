-- CreateTable
CREATE TABLE `Department` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Department_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employeeCode` VARCHAR(50) NULL,
    `fullName` VARCHAR(150) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NULL,
    `role` ENUM('SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
    `departmentId` INTEGER NULL,
    `managerId` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_employeeCode_key`(`employeeCode`),
    UNIQUE INDEX `User_email_key`(`email`),
    INDEX `User_departmentId_idx`(`departmentId`),
    INDEX `User_managerId_idx`(`managerId`),
    INDEX `User_role_idx`(`role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Office` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `address` VARCHAR(500) NULL,
    `timezone` VARCHAR(100) NOT NULL DEFAULT 'Asia/Singapore',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Office_createdById_idx`(`createdById`),
    UNIQUE INDEX `Office_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Floor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `officeId` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `floorNumber` INTEGER NULL,
    `floorPlanUrl` VARCHAR(500) NULL,
    `floorPlanWidth` INTEGER NULL,
    `floorPlanHeight` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Floor_officeId_idx`(`officeId`),
    INDEX `Floor_createdById_idx`(`createdById`),
    UNIQUE INDEX `Floor_officeId_name_key`(`officeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Resource` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `floorId` INTEGER NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `type` ENUM('DESK', 'CHAIR', 'MEETING_ROOM', 'PRIVATE_ROOM', 'TRAINING_ROOM', 'HOT_DESK', 'OTHER') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
    `description` VARCHAR(500) NULL,
    `capacity` INTEGER NOT NULL DEFAULT 1,
    `amenities` JSON NULL,
    `requiresApproval` BOOLEAN NOT NULL DEFAULT true,
    `requiresManager` BOOLEAN NOT NULL DEFAULT false,
    `xPercent` DECIMAL(7, 4) NULL,
    `yPercent` DECIMAL(7, 4) NULL,
    `widthPercent` DECIMAL(7, 4) NULL,
    `heightPercent` DECIMAL(7, 4) NULL,
    `rotation` DECIMAL(7, 2) NULL DEFAULT 0,
    `iconName` VARCHAR(100) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Resource_code_key`(`code`),
    INDEX `Resource_floorId_idx`(`floorId`),
    INDEX `Resource_createdById_idx`(`createdById`),
    INDEX `Resource_type_idx`(`type`),
    INDEX `Resource_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingNumber` VARCHAR(50) NOT NULL,
    `userId` INTEGER NOT NULL,
    `resourceId` INTEGER NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `reason` VARCHAR(250) NOT NULL,
    `attendeeCount` INTEGER NOT NULL DEFAULT 1,
    `requiredEquipment` JSON NULL,
    `notes` VARCHAR(1000) NULL,
    `status` ENUM('DRAFT', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW') NOT NULL DEFAULT 'PENDING_HR',
    `rejectionReason` VARCHAR(500) NULL,
    `cancellationReason` VARCHAR(500) NULL,
    `checkedInAt` DATETIME(3) NULL,
    `checkedOutAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_bookingNumber_key`(`bookingNumber`),
    INDEX `Booking_userId_idx`(`userId`),
    INDEX `Booking_resourceId_idx`(`resourceId`),
    INDEX `Booking_resourceId_startAt_endAt_idx`(`resourceId`, `startAt`, `endAt`),
    INDEX `Booking_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingApproval` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `approverId` INTEGER NOT NULL,
    `stage` VARCHAR(50) NOT NULL,
    `decision` ENUM('APPROVED', 'REJECTED', 'MORE_INFORMATION_REQUIRED') NOT NULL,
    `comment` VARCHAR(500) NULL,
    `decidedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BookingApproval_bookingId_idx`(`bookingId`),
    INDEX `BookingApproval_approverId_idx`(`approverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_managerId_fkey` FOREIGN KEY (`managerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Office` ADD CONSTRAINT `Office_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Floor` ADD CONSTRAINT `Floor_officeId_fkey` FOREIGN KEY (`officeId`) REFERENCES `Office`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Floor` ADD CONSTRAINT `Floor_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resource` ADD CONSTRAINT `Resource_floorId_fkey` FOREIGN KEY (`floorId`) REFERENCES `Floor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Resource` ADD CONSTRAINT `Resource_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_resourceId_fkey` FOREIGN KEY (`resourceId`) REFERENCES `Resource`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingApproval` ADD CONSTRAINT `BookingApproval_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingApproval` ADD CONSTRAINT `BookingApproval_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
