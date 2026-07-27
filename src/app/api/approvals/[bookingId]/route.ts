import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import { sendBookingStatusEmail } from "@/services/email/booking-email-service";
import { notifyBookingStatus } from "@/services/notifications/notification-service";

type ApprovalRequestBody = {
  action: "APPROVE" | "REJECT";
  comment?: string;
};

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

function getEmailErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 500);
  }

  return "Unable to send notification email.";
}

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
          message: "You must sign in to process approvals.",
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

    const body = (await request.json()) as ApprovalRequestBody;
    const action = body.action;
    const comment = body.comment?.trim() || "";

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid approval action.",
        },
        {
          status: 400,
        },
      );
    }

    if (action === "REJECT" && !comment) {
      return NextResponse.json(
        {
          success: false,
          message: "A rejection reason is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (comment.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The approval comment cannot exceed 500 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        user: true,
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

    if (
      booking.status !== "PENDING_MANAGER" &&
      booking.status !== "PENDING_HR"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This booking is no longer waiting for approval.",
        },
        {
          status: 409,
        },
      );
    }

    if (currentUser.id === booking.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Users cannot approve their own bookings.",
        },
        {
          status: 403,
        },
      );
    }

    const isManagerStage =
      booking.status === "PENDING_MANAGER";

    const approvalStage = isManagerStage ? "MANAGER" : "HR";

    if (
      isManagerStage &&
      currentUser.role !== "MANAGER" &&
      currentUser.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only a Manager or Super Admin can approve this booking at the manager stage.",
        },
        {
          status: 403,
        },
      );
    }

    if (
      !isManagerStage &&
      currentUser.role !== "HR" &&
      currentUser.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only HR or Super Admin can approve this booking at the HR stage.",
        },
        {
          status: 403,
        },
      );
    }

    let nextStatus:
      | "PENDING_HR"
      | "APPROVED"
      | "REJECTED";

    if (action === "REJECT") {
      nextStatus = "REJECTED";
    } else if (
      isManagerStage &&
      booking.resource.requiresApproval
    ) {
      nextStatus = "PENDING_HR";
    } else {
      nextStatus = "APPROVED";
    }

    const updatedBooking = await prisma.$transaction(
      async (transaction) => {
        await transaction.bookingApproval.create({
          data: {
            bookingId: booking.id,
            approverId: currentUser.id,
            stage: approvalStage,
            decision:
              action === "APPROVE"
                ? "APPROVED"
                : "REJECTED",
            comment: comment || null,
          },
        });

        return transaction.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            status: nextStatus,
            rejectionReason:
              action === "REJECT" ? comment : null,
            lastNotificationError: null,
          },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            rejectionReason: true,
            updatedAt: true,
          },
        });
      },
    );

    let emailWarning = "";

    if (nextStatus === "APPROVED" || nextStatus === "REJECTED") {
      try {
        const emailContent = await sendBookingStatusEmail({
          type: nextStatus,
          booking: {
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            employeeName: booking.user.fullName,
            employeeEmail: booking.user.email,
            resourceName: booking.resource.name,
            resourceCode: booking.resource.code,
            officeName: booking.resource.floor.office.name,
            floorName: booking.resource.floor.name,
            startAt: booking.startAt,
            endAt: booking.endAt,
            reason: booking.reason,
            rejectionReason: action === "REJECT" ? comment : null,
          },
        });

        await prisma.$transaction(async (transaction) => {
          await transaction.emailLog.create({
            data: {
              bookingId: booking.id,
              sentById: currentUser.id,
              toEmail: booking.user.email,
              toName: booking.user.fullName,
              subject: emailContent.subject,
              body: emailContent.body,
              emailType:
                nextStatus === "APPROVED"
                  ? "BOOKING_APPROVED_AUTO"
                  : "BOOKING_REJECTED_AUTO",
              status: "SENT",
            },
          });

          await transaction.booking.update({
            where: {
              id: booking.id,
            },
            data:
              nextStatus === "APPROVED"
                ? {
                    approvedEmailSent: true,
                    approvedEmailSentAt: new Date(),
                    lastNotificationError: null,
                  }
                : {
                    rejectedEmailSent: true,
                    rejectedEmailSentAt: new Date(),
                    lastNotificationError: null,
                  },
          });
        });
      } catch (emailError) {
        const errorMessage = getEmailErrorMessage(emailError);

        console.error("Booking status email failed:", emailError);

        await prisma.booking.update({
          where: {
            id: booking.id,
          },
          data: {
            lastNotificationError: errorMessage,
          },
        });

        emailWarning =
          " However, the notification email could not be sent. Please check SMTP settings.";
      }
    }

    await notifyBookingStatus({
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      employeeId: booking.userId,
      roomName: booking.resource.floor.name,
      status: nextStatus,
      reason: action === "REJECT" ? comment : null,
    });

    let responseMessage = "Booking approved successfully.";

    if (action === "REJECT") {
      responseMessage = "Booking rejected successfully.";
    } else if (nextStatus === "PENDING_HR") {
      responseMessage =
        "Manager approval completed. The booking is now waiting for HR approval.";
    }

    return NextResponse.json({
      success: true,
      message: responseMessage + emailWarning,
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Failed to process approval:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "An unexpected error occurred while processing the approval.",
      },
      {
        status: 500,
      },
    );
  }
}