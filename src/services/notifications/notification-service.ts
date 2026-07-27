import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/models/notification";
import type { UserRole } from "@/models/auth";

type CreateNotificationInput = {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string | null;
  relatedId?: number | null;
};

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      relatedId: input.relatedId ?? null,
    },
  });
}

export async function createNotificationsForRoles(
  roles: UserRole[],
  input: Omit<CreateNotificationInput, "userId">,
  excludeUserIds: number[] = [],
) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: roles },
      ...(excludeUserIds.length ? { id: { notIn: excludeUserIds } } : {}),
    },
    select: { id: true },
  });

  if (!users.length) return;

  await prisma.notification.createMany({
    data: users.map(({ id }) => ({
      userId: id,
      type: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl ?? null,
      relatedId: input.relatedId ?? null,
    })),
  });
}

export async function notifyBookingCreated(args: {
  bookingId: number; bookingNumber: string; employeeId: number; employeeName: string; roomName: string; status: string;
}) {
  await createNotification({
    userId: args.employeeId,
    type: "BOOKING_SUBMITTED",
    title: "Booking submitted",
    message: `${args.bookingNumber} for ${args.roomName} was submitted successfully.`,
    actionUrl: "/my-bookings",
    relatedId: args.bookingId,
  });

  const roles: UserRole[] = args.status === "PENDING_MANAGER"
    ? ["MANAGER", "SUPER_ADMIN"]
    : args.status === "PENDING_HR"
      ? ["HR", "SUPER_ADMIN"]
      : [];

  if (roles.length) {
    await createNotificationsForRoles(roles, {
      type: "NEW_BOOKING_REQUEST",
      title: "New booking request",
      message: `${args.employeeName} requested ${args.roomName} (${args.bookingNumber}).`,
      actionUrl: "/approvals",
      relatedId: args.bookingId,
    }, [args.employeeId]);
  }
}

export async function notifyBookingStatus(args: {
  bookingId: number; bookingNumber: string; employeeId: number; roomName: string; status: "APPROVED" | "REJECTED" | "PENDING_HR"; reason?: string | null;
}) {
  if (args.status === "PENDING_HR") {
    await createNotificationsForRoles(["HR", "SUPER_ADMIN"], {
      type: "NEW_BOOKING_REQUEST",
      title: "Booking requires HR approval",
      message: `${args.bookingNumber} for ${args.roomName} passed manager approval.`,
      actionUrl: "/approvals",
      relatedId: args.bookingId,
    }, [args.employeeId]);
    return;
  }

  await createNotification({
    userId: args.employeeId,
    type: args.status === "APPROVED" ? "BOOKING_APPROVED" : "BOOKING_REJECTED",
    title: args.status === "APPROVED" ? "Booking approved" : "Booking rejected",
    message: args.status === "APPROVED"
      ? `${args.bookingNumber} for ${args.roomName} was approved.`
      : `${args.bookingNumber} for ${args.roomName} was rejected${args.reason ? `: ${args.reason}` : "."}`,
    actionUrl: "/my-bookings",
    relatedId: args.bookingId,
  });
}

export async function notifyBookingCancelled(args: {
  bookingId: number; bookingNumber: string; employeeId: number; employeeName: string; roomName: string;
}) {
  await createNotification({
    userId: args.employeeId,
    type: "BOOKING_CANCELLED",
    title: "Booking cancelled",
    message: `${args.bookingNumber} for ${args.roomName} was cancelled.`,
    actionUrl: "/my-bookings",
    relatedId: args.bookingId,
  });
  await createNotificationsForRoles(["HR", "MANAGER", "SUPER_ADMIN"], {
    type: "BOOKING_CANCELLED",
    title: "Booking cancelled",
    message: `${args.employeeName} cancelled ${args.bookingNumber} for ${args.roomName}.`,
    actionUrl: "/approval-history",
    relatedId: args.bookingId,
  }, [args.employeeId]);
}

export async function notifyRoomUpdate(args: {
  actorId: number; roomId: number; roomName: string; kind: "CREATED" | "UPDATED" | "IMAGE_UPDATED" | "AREA_UPDATED";
}) {
  const map = {
    CREATED: ["ROOM_CREATED", "New room created"],
    UPDATED: ["ROOM_UPDATED", "Room updated"],
    IMAGE_UPDATED: ["ROOM_IMAGE_UPDATED", "Room image updated"],
    AREA_UPDATED: ["ROOM_AREA_UPDATED", "Room area layout updated"],
  } as const;
  const [type, title] = map[args.kind];
  await createNotificationsForRoles(["EMPLOYEE", "HR", "MANAGER", "SUPER_ADMIN"], {
    type, title,
    message: `${args.roomName} has been ${args.kind === "CREATED" ? "created" : "updated"}.`,
    actionUrl: "/room-management",
    relatedId: args.roomId,
  }, [args.actorId]);
}
