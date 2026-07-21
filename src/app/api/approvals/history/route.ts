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
          message: "You must sign in to view approval history.",
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
          message: "You do not have permission to view approval history.",
        },
        {
          status: 403,
        },
      );
    }

    const approvalHistory = await prisma.bookingApproval.findMany({
      where:
        currentUser.role === "SUPER_ADMIN"
            ? {}
            : currentUser.role === "HR"
            ? {
                stage: "HR",
                }
            : currentUser.role === "MANAGER"
                ? {
                    stage: "MANAGER",
                }
                : {
                    approverId: currentUser.id,
                },
      include: {
        approver: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        booking: {
          include: {
            user: {
              select: {
                id: true,
                employeeCode: true,
                fullName: true,
                email: true,
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
        },
      },
      orderBy: {
        decidedAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      data: approvalHistory,
    });
  } catch (error) {
    console.error("Failed to load approval history:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load approval history.",
      },
      {
        status: 500,
      },
    );
  }
}