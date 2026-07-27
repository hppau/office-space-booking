import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

type RouteContext = {
  params: Promise<{
    floorId: string;
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
          "You do not have permission to permanently delete rooms.",
      },
      {
        status: 403,
      }
    );
  }

  const { floorId: rawId } = await context.params;
  const floorId = Number(rawId);

  if (!Number.isInteger(floorId) || floorId < 1) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid room ID.",
      },
      {
        status: 400,
      }
    );
  }

  const room = await prisma.floor.findUnique({
    where: {
      id: floorId,
    },
    select: {
      id: true,
      name: true,
      resources: {
        select: {
          id: true,
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    return NextResponse.json(
      {
        success: false,
        message: "Room was not found.",
      },
      {
        status: 404,
      }
    );
  }

  const bookingCount = room.resources.reduce(
    (total, resource) => total + resource._count.bookings,
    0
  );

  if (bookingCount > 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "This room contains spaces with booking history and cannot be permanently deleted. Deactivate it instead.",
      },
      {
        status: 409,
      }
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.resource.deleteMany({
      where: {
        floorId,
      },
    });

    await transaction.floor.delete({
      where: {
        id: floorId,
      },
    });
  });

  return NextResponse.json({
    success: true,
    message: `Room ${room.name} was permanently deleted.`,
  });
}