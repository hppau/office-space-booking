import { NextRequest, NextResponse } from "next/server";
import { NotificationType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

export async function GET(request: NextRequest) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        success: false,
        message: "You must sign in.",
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const filter = url.searchParams.get("filter") ?? "all";

  const requestedLimit = Number(url.searchParams.get("limit") ?? 50);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 50;

  const bookingTypes: NotificationType[] = [
    NotificationType.BOOKING_SUBMITTED,
    NotificationType.NEW_BOOKING_REQUEST,
    NotificationType.BOOKING_APPROVED,
    NotificationType.BOOKING_REJECTED,
    NotificationType.BOOKING_CANCELLED,
  ];

  const roomTypes: NotificationType[] = [
    NotificationType.ROOM_CREATED,
    NotificationType.ROOM_UPDATED,
    NotificationType.ROOM_IMAGE_UPDATED,
    NotificationType.ROOM_AREA_UPDATED,
  ];

  const where: Prisma.NotificationWhereInput = {
    userId: currentUser.id,
  };

  if (filter === "unread") {
    where.isRead = false;
  }

  if (filter === "bookings") {
    where.type = {
      in: bookingTypes,
    };
  }

  if (filter === "rooms") {
    where.type = {
      in: roomTypes,
    };
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    }),

    prisma.notification.count({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: notifications,
    unreadCount,
  });
}
