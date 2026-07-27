import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import { notifyBookingCreated } from "@/services/notifications/notification-service";

type CreateBookingRequest = {
  resourceId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  attendeeCount: number;
  requiredEquipment: string[];
  notes?: string;
};

function createBookingDateTime(
  bookingDate: string,
  bookingTime: string,
): Date {
  return new Date(`${bookingDate}T${bookingTime}:00+08:00`);
}

function createBookingNumber(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `BK-${year}${month}${day}-${randomPart}`;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to view your bookings.",
        },
        {
          status: 401,
        },
      );
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId: currentUser.id,
      },
      include: {
        resource: {
          include: {
            floor: {
              include: {
                office: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    console.error("Failed to load bookings:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load bookings.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in before creating a booking.",
        },
        {
          status: 401,
        },
      );
    }

    const body = (await request.json()) as CreateBookingRequest;

    const {
      resourceId,
      bookingDate,
      startTime,
      endTime,
      reason,
      attendeeCount,
      requiredEquipment,
      notes,
    } = body;

    if (!resourceId || !bookingDate || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Resource, booking date, start time and end time are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!reason?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking reason is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(attendeeCount) || attendeeCount < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Attendee count must be at least 1.",
        },
        {
          status: 400,
        },
      );
    }

    const startAt = createBookingDateTime(bookingDate, startTime);
    const endAt = createBookingDateTime(bookingDate, endTime);

    if (
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime())
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking date or time.",
        },
        {
          status: 400,
        },
      );
    }

    if (startAt >= endAt) {
      return NextResponse.json(
        {
          success: false,
          message: "End time must be later than start time.",
        },
        {
          status: 400,
        },
      );
    }

    const resource = await prisma.resource.findUnique({
      where: {
        id: resourceId,
      },
    });

    if (!resource || !resource.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "The selected resource does not exist.",
        },
        {
          status: 404,
        },
      );
    }

    if (resource.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "The selected resource is currently unavailable.",
        },
        {
          status: 409,
        },
      );
    }

    if (attendeeCount > resource.capacity) {
      return NextResponse.json(
        {
          success: false,
          message: `This resource has a maximum capacity of ${resource.capacity}.`,
        },
        {
          status: 400,
        },
      );
    }

    const existingBooking = await prisma.booking.findFirst({
      where: {
        resourceId,
        status: {
          in: [
            "PENDING_MANAGER",
            "PENDING_HR",
            "APPROVED",
            "CHECKED_IN",
          ],
        },
        startAt: {
          lt: endAt,
        },
        endAt: {
          gt: startAt,
        },
      },
    });

    if (existingBooking) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This space has already been requested or booked for the selected time.",
        },
        {
          status: 409,
        },
      );
    }

    const initialStatus = resource.requiresManager
      ? "PENDING_MANAGER"
      : resource.requiresApproval
        ? "PENDING_HR"
        : "APPROVED";

    let bookingNumber = createBookingNumber();

    while (
      await prisma.booking.findUnique({
        where: {
          bookingNumber,
        },
      })
    ) {
      bookingNumber = createBookingNumber();
    }

    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        userId: currentUser.id,
        resourceId,
        startAt,
        endAt,
        reason: reason.trim(),
        attendeeCount,
        requiredEquipment,
        notes: notes?.trim() || null,
        status: initialStatus,
      },
      include: {
        resource: {
          include: {
            floor: {
              include: {
                office: true,
              },
            },
          },
        },
      },
    });

    await notifyBookingCreated({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      employeeId: currentUser.id,
      employeeName: currentUser.fullName,
      roomName: booking.resource.floor.name,
      status: booking.status,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Booking request submitted successfully.",
        data: booking,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to create booking:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "An unexpected error occurred while creating the booking.",
      },
      {
        status: 500,
      },
    );
  }
}