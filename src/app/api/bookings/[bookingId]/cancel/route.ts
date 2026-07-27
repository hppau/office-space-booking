import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import { notifyBookingCancelled } from "@/services/notifications/notification-service";

type CancelBookingRequest = {
  cancellationReason: string;
};

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to cancel a booking.",
        },
        {
          status: 401,
        },
      );
    }

    const { bookingId: bookingIdValue } = await context.params;
    const bookingId = Number(bookingIdValue);

    if (!Number.isInteger(bookingId) || bookingId < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid booking ID.",
        },
        {
          status: 400,
        },
      );
    }

    const body = (await request.json()) as CancelBookingRequest;
    const cancellationReason = body.cancellationReason?.trim();

    if (!cancellationReason) {
      return NextResponse.json(
        {
          success: false,
          message: "Cancellation reason is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (cancellationReason.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "Cancellation reason cannot exceed 500 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true, resource: { include: { floor: true } } },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const canCancelOwnBooking = booking.userId === currentUser.id;
    const canAdminCancel = currentUser.role === "SUPER_ADMIN";

    if (!canCancelOwnBooking && !canAdminCancel) {
      return NextResponse.json(
        {
          success: false,
          message: "You can only cancel your own bookings.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      booking.status === "CANCELLED" ||
      booking.status === "REJECTED" ||
      booking.status === "COMPLETED" ||
      booking.status === "NO_SHOW"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This booking cannot be cancelled anymore.",
        },
        {
          status: 409,
        },
      );
    }

    const updatedBooking = await prisma.booking.update({
      where: {
        id: booking.id,
      },
      data: {
        status: "CANCELLED",
        cancellationReason,
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        cancellationReason: true,
        updatedAt: true,
      },
    });

    await notifyBookingCancelled({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      employeeId: booking.userId,
      employeeName: booking.user.fullName,
      roomName: booking.resource.floor.name,
    });

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully.",
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Failed to cancel booking:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred while cancelling the booking.",
      },
      {
        status: 500,
      },
    );
  }
}