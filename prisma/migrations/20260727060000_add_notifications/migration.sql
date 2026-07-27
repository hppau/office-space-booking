CREATE TYPE "NotificationType" AS ENUM ('BOOKING_SUBMITTED','NEW_BOOKING_REQUEST','BOOKING_APPROVED','BOOKING_REJECTED','BOOKING_CANCELLED','ROOM_CREATED','ROOM_UPDATED','ROOM_IMAGE_UPDATED','ROOM_AREA_UPDATED','SYSTEM');
CREATE TABLE "Notification" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "actionUrl" VARCHAR(500),
  "relatedId" INTEGER,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
