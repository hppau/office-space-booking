import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import type { SpaceMapPositionRequest } from "@/models/space-management";
import { notifyRoomUpdate } from "@/services/notifications/notification-service";

type RouteContext = {
  params: Promise<{
    spaceId: string;
  }>;
};

function canManageSpaces(role: string): boolean {
  return role === "HR" || role === "SUPER_ADMIN";
}

async function getSpaceId(context: RouteContext): Promise<number | null> {
  const { spaceId: spaceIdValue } = await context.params;
  const spaceId = Number(spaceIdValue);

  if (!Number.isInteger(spaceId) || spaceId < 1) {
    return null;
  }

  return spaceId;
}

function isValidPercent(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

export async function PUT(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to update space position.",
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
          message: "You do not have permission to update space position.",
        },
        {
          status: 403,
        },
      );
    }

    const spaceId = await getSpaceId(context);

    if (!spaceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid space ID.",
        },
        {
          status: 400,
        },
      );
    }

    const body = (await request.json()) as SpaceMapPositionRequest;

    const xPercent = Number(body.xPercent);
    const yPercent = Number(body.yPercent);
    const widthPercent = Number(body.widthPercent);
    const heightPercent = Number(body.heightPercent);
    const rotation = Number(body.rotation);
    const iconName = body.iconName?.trim() || "desk";

    if (!isValidPercent(xPercent)) {
      return NextResponse.json(
        {
          success: false,
          message: "X position must be between 0 and 100.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidPercent(yPercent)) {
      return NextResponse.json(
        {
          success: false,
          message: "Y position must be between 0 and 100.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidPercent(widthPercent) || widthPercent <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Width must be between 0 and 100.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidPercent(heightPercent) || heightPercent <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Height must be between 0 and 100.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(rotation) || rotation < -360 || rotation > 360) {
      return NextResponse.json(
        {
          success: false,
          message: "Rotation must be between -360 and 360.",
        },
        {
          status: 400,
        },
      );
    }

    if (iconName.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Icon name cannot exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const existingSpace = await prisma.resource.findUnique({
      where: {
        id: spaceId,
      },
    });

    if (!existingSpace) {
      return NextResponse.json(
        {
          success: false,
          message: "Space was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const updatedSpace = await prisma.resource.update({
      where: {
        id: spaceId,
      },
      data: {
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        rotation,
        iconName,
      },
      include: {
        floor: {
          select: {
            id: true,
            name: true,
            office: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    await notifyRoomUpdate({ actorId: currentUser.id, roomId: updatedSpace.floor.id, roomName: updatedSpace.floor.name, kind: "AREA_UPDATED" });

    return NextResponse.json({
      success: true,
      message: "Space position updated successfully.",
      data: updatedSpace,
    });
  } catch (error) {
    console.error("Failed to update space position:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update space position.",
      },
      {
        status: 500,
      },
    );
  }
}
export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to remove space position.",
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
          message: "You do not have permission to remove space position.",
        },
        {
          status: 403,
        },
      );
    }

    const spaceId = await getSpaceId(context);

    if (!spaceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid space ID.",
        },
        {
          status: 400,
        },
      );
    }

    const existingSpace = await prisma.resource.findUnique({
      where: {
        id: spaceId,
      },
    });

    if (!existingSpace) {
      return NextResponse.json(
        {
          success: false,
          message: "Space was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const updatedSpace = await prisma.resource.update({
      where: {
        id: spaceId,
      },
      data: {
        xPercent: null,
        yPercent: null,
        widthPercent: null,
        heightPercent: null,
        rotation: 0,
        iconName: null,
      },
      include: {
        floor: {
          select: {
            id: true,
            name: true,
            office: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Space position removed successfully.",
      data: updatedSpace,
    });
  } catch (error) {
    console.error("Failed to remove space position:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to remove space position.",
      },
      {
        status: 500,
      },
    );
  }
}