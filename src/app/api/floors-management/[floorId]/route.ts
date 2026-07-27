import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import type { UpdateFloorRequest } from "@/models/location-management";
import { notifyRoomUpdate } from "@/services/notifications/notification-service";

type RouteContext = {
  params: Promise<{
    floorId: string;
  }>;
};

function canManageLocations(role: string): boolean {
  return role === "HR" || role === "SUPER_ADMIN";
}

function normalizeName(name: string): string {
  return name.trim();
}

async function getFloorId(context: RouteContext): Promise<number | null> {
  const { floorId: floorIdValue } = await context.params;
  const floorId = Number(floorIdValue);

  if (!Number.isInteger(floorId) || floorId < 1) {
    return null;
  }

  return floorId;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to view this floor.",
        },
        {
          status: 401,
        },
      );
    }

    if (!canManageLocations(currentUser.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to view this floor.",
        },
        {
          status: 403,
        },
      );
    }

    const floorId = await getFloorId(context);

    if (!floorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid floor ID.",
        },
        {
          status: 400,
        },
      );
    }

    const floor = await prisma.floor.findUnique({
      where: {
        id: floorId,
      },
      include: {
        office: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!floor) {
      return NextResponse.json(
        {
          success: false,
          message: "Floor was not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: floor,
    });
  } catch (error) {
    console.error("Failed to load floor:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load floor.",
      },
      {
        status: 500,
      },
    );
  }
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
          message: "You must sign in to update this floor.",
        },
        {
          status: 401,
        },
      );
    }

    if (!canManageLocations(currentUser.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to update this floor.",
        },
        {
          status: 403,
        },
      );
    }

    const floorId = await getFloorId(context);

    if (!floorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid floor ID.",
        },
        {
          status: 400,
        },
      );
    }

    const body = (await request.json()) as UpdateFloorRequest;

    const name = normalizeName(body.name ?? "");
    const officeId = Number(body.officeId);
    const floorNumber =
      body.floorNumber === undefined || body.floorNumber === null
        ? null
        : Number(body.floorNumber);
    const isActive = Boolean(body.isActive);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Floor name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Floor name cannot exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(officeId) || officeId < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Office is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      floorNumber !== null &&
      (!Number.isInteger(floorNumber) || floorNumber < 0)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Floor number must be 0 or above.",
        },
        {
          status: 400,
        },
      );
    }

    const existingFloor = await prisma.floor.findUnique({
      where: {
        id: floorId,
      },
    });

    if (!existingFloor) {
      return NextResponse.json(
        {
          success: false,
          message: "Floor was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const office = await prisma.office.findUnique({
      where: {
        id: officeId,
      },
    });

    if (!office) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected office was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const duplicatedFloor = await prisma.floor.findFirst({
      where: {
        id: {
          not: floorId,
        },
        officeId,
        name,
      },
    });

    if (duplicatedFloor) {
      return NextResponse.json(
        {
          success: false,
          message: "Another floor with this name already exists in this office.",
        },
        {
          status: 409,
        },
      );
    }

    const updatedFloor = await prisma.floor.update({
      where: {
        id: floorId,
      },
      data: {
        name,
        officeId,
        floorNumber,
        isActive,
      },
      include: {
        office: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await notifyRoomUpdate({ actorId: currentUser.id, roomId: updatedFloor.id, roomName: updatedFloor.name, kind: "UPDATED" });

    return NextResponse.json({
      success: true,
      message: "Floor updated successfully.",
      data: updatedFloor,
    });
  } catch (error) {
    console.error("Failed to update floor:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update floor.",
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
          message: "You must sign in to delete this floor.",
        },
        {
          status: 401,
        },
      );
    }

    if (!canManageLocations(currentUser.role)) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not have permission to delete this floor.",
        },
        {
          status: 403,
        },
      );
    }

    const floorId = await getFloorId(context);

    if (!floorId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid floor ID.",
        },
        {
          status: 400,
        },
      );
    }

    const existingFloor = await prisma.floor.findUnique({
      where: {
        id: floorId,
      },
    });

    if (!existingFloor) {
      return NextResponse.json(
        {
          success: false,
          message: "Floor was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const deactivatedFloor = await prisma.floor.update({
      where: {
        id: floorId,
      },
      data: {
        isActive: false,
      },
      include: {
        office: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await notifyRoomUpdate({ actorId: currentUser.id, roomId: deactivatedFloor.id, roomName: deactivatedFloor.name, kind: "UPDATED" });

    return NextResponse.json({
      success: true,
      message: "Floor deactivated successfully.",
      data: deactivatedFloor,
    });
  } catch (error) {
    console.error("Failed to delete floor:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete floor.",
      },
      {
        status: 500,
      },
    );
  }
}