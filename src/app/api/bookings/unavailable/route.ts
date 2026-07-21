import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

function createBookingDateTime(
  bookingDate: string,
  bookingTime: string,
): Date {
  return new Date(`${bookingDate}T${bookingTime}:00+08:00`);
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to check availability.",
        },
        {
          status: 401,
        },
      );
    }

    const { searchParams } = new URL(request.url);

    const bookingDate = searchParams.get("bookingDate");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");

    if (!bookingDate || !startTime || !endTime) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking date, start time and end time are required.",
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

    const unavailableBookings = await prisma.booking.findMany({
      where: {
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
      select: {
        id: true,
        bookingNumber: true,
        resourceId: true,
        startAt: true,
        endAt: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: unavailableBookings,
    });
  } catch (error) {
    console.error("Failed to check unavailable bookings:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to check booking availability.",
      },
      {
        status: 500,
      },
    );
  }
}