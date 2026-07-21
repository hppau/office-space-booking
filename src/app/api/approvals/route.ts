import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to view approvals.",
        },
        {
          status: 401,
        },
      );
    }

    if (
      currentUser.role !== "HR" &&
      currentUser.role !== "MANAGER" &&
      currentUser.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view approvals.",
        },
        {
          status: 403,
        },
      );
    }

    const allowedStatuses =
      currentUser.role === "MANAGER"
        ? ["PENDING_MANAGER" as const]
        : currentUser.role === "HR"
          ? ["PENDING_HR" as const]
          : ["PENDING_MANAGER" as const, "PENDING_HR" as const];

    const pendingBookings = await prisma.booking.findMany({
      where: {
        status: {
          in: allowedStatuses,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            email: true,
            role: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
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
      orderBy: [
        {
          startAt: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: pendingBookings,
    });
  } catch (error) {
    console.error("Failed to load pending approvals:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load pending booking approvals.",
      },
      {
        status: 500,
      },
    );
  }
}