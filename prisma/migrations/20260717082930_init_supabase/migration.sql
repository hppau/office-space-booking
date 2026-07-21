-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('DESK', 'CHAIR', 'MEETING_ROOM', 'PRIVATE_ROOM', 'TRAINING_ROOM', 'HOT_DESK', 'OTHER');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PENDING_MANAGER', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'MORE_INFORMATION_REQUIRED');

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "employeeCode" VARCHAR(50),
    "fullName" VARCHAR(150) NOT NULL,
    "email" VARCHAR(191) NOT NULL,
    "passwordHash" VARCHAR(255),
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "departmentId" INTEGER,
    "managerId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Office" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(500),
    "timezone" VARCHAR(100) NOT NULL DEFAULT 'Asia/Singapore',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" SERIAL NOT NULL,
    "officeId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "floorNumber" INTEGER,
    "floorPlanUrl" VARCHAR(500),
    "floorPlanWidth" INTEGER,
    "floorPlanHeight" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" SERIAL NOT NULL,
    "floorId" INTEGER NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "type" "ResourceType" NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "description" VARCHAR(500),
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "amenities" JSONB,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "requiresManager" BOOLEAN NOT NULL DEFAULT false,
    "xPercent" DECIMAL(7,4),
    "yPercent" DECIMAL(7,4),
    "widthPercent" DECIMAL(7,4),
    "heightPercent" DECIMAL(7,4),
    "rotation" DECIMAL(7,2) DEFAULT 0,
    "iconName" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" SERIAL NOT NULL,
    "bookingNumber" VARCHAR(50) NOT NULL,
    "userId" INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "reason" VARCHAR(250) NOT NULL,
    "attendeeCount" INTEGER NOT NULL DEFAULT 1,
    "requiredEquipment" JSONB,
    "notes" VARCHAR(1000),
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_HR',
    "rejectionReason" VARCHAR(500),
    "cancellationReason" VARCHAR(500),
    "checkedInAt" TIMESTAMP(3),
    "checkedOutAt" TIMESTAMP(3),
    "approvedEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "approvedEmailSentAt" TIMESTAMP(3),
    "rejectedEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "rejectedEmailSentAt" TIMESTAMP(3),
    "lastNotificationError" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingApproval" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "approverId" INTEGER NOT NULL,
    "stage" VARCHAR(50) NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "comment" VARCHAR(500),
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER,
    "sentById" INTEGER,
    "toEmail" VARCHAR(191) NOT NULL,
    "toName" VARCHAR(150),
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT NOT NULL,
    "emailType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'SENT',
    "errorMessage" VARCHAR(500),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeCode_key" ON "User"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE INDEX "User_managerId_idx" ON "User"("managerId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Office_createdById_idx" ON "Office"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Office_name_key" ON "Office"("name");

-- CreateIndex
CREATE INDEX "Floor_officeId_idx" ON "Floor"("officeId");

-- CreateIndex
CREATE INDEX "Floor_createdById_idx" ON "Floor"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_officeId_name_key" ON "Floor"("officeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Resource_code_key" ON "Resource"("code");

-- CreateIndex
CREATE INDEX "Resource_floorId_idx" ON "Resource"("floorId");

-- CreateIndex
CREATE INDEX "Resource_createdById_idx" ON "Resource"("createdById");

-- CreateIndex
CREATE INDEX "Resource_type_idx" ON "Resource"("type");

-- CreateIndex
CREATE INDEX "Resource_status_idx" ON "Resource"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingNumber_key" ON "Booking"("bookingNumber");

-- CreateIndex
CREATE INDEX "Booking_userId_idx" ON "Booking"("userId");

-- CreateIndex
CREATE INDEX "Booking_resourceId_idx" ON "Booking"("resourceId");

-- CreateIndex
CREATE INDEX "Booking_resourceId_startAt_endAt_idx" ON "Booking"("resourceId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "BookingApproval_bookingId_idx" ON "BookingApproval"("bookingId");

-- CreateIndex
CREATE INDEX "BookingApproval_approverId_idx" ON "BookingApproval"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "EmailLog_bookingId_idx" ON "EmailLog"("bookingId");

-- CreateIndex
CREATE INDEX "EmailLog_sentById_idx" ON "EmailLog"("sentById");

-- CreateIndex
CREATE INDEX "EmailLog_emailType_idx" ON "EmailLog"("emailType");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingApproval" ADD CONSTRAINT "BookingApproval_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingApproval" ADD CONSTRAINT "BookingApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
