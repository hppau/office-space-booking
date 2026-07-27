import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

type RouteContext = {
  params: Promise<{
    spaceId: string;
  }>;
};

function canManage(role: string) {
  return role === "HR" || role === "SUPER_ADMIN";
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json(
      {
        success: false,
        message: "You must sign in.",
      },
      {
        status: 401,
      }
    );
  }

  if (!canManage(currentUser.role)) {
    return NextResponse.json(
      {
        success: false,
        message:
          "You do not have permission to permanently delete spaces.",
      },
      {
        status: 403,
      }
    );
  }

  const { spaceId: rawId } = await context.params;
  const spaceId = Number(rawId);

  if (!Number.isInteger(spaceId) || spaceId < 1) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid space ID.",
      },
      {
        status: 400,
      }
    );
  }

  const space = await prisma.resource.findUnique({
    where: {
      id: spaceId,
    },
    select: {
      id: true,
      code: true,
      name: true,
      _count: {
        select: {
          bookings: true,
        },
      },
    },
  });

  if (!space) {
    return NextResponse.json(
      {
        success: false,
        message: "Space was not found.",
      },
      {
        status: 404,
      }
    );
  }

  if (space._count.bookings > 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "This space has booking history and cannot be permanently deleted. Deactivate it instead.",
      },
      {
        status: 409,
      }
    );
  }

  await prisma.resource.delete({
    where: {
      id: spaceId,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Space ${space.code} - ${space.name} was permanently deleted.`,
  });
}