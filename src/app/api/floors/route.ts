import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

function canManageSpaces(role: string): boolean {
  return role === "HR" || role === "SUPER_ADMIN";
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to view floors.",
        },
        {
          status: 401,
        },
      );
    }

    if (!canManageSpaces(currentUser.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view floors.",
        },
        {
          status: 403,
        },
      );
    }

    const floors = await prisma.floor.findMany({
      include: {
        office: true,
      },
      orderBy: [
        {
          office: {
            name: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: floors,
    });
  } catch (error) {
    console.error("Failed to load floors:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load floors.",
      },
      {
        status: 500,
      },
    );
  }
}