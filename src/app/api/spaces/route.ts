import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import type { CreateSpaceRequest } from "@/models/space-management";
import { notifyRoomUpdate } from "@/services/notifications/notification-service";

function canManageSpaces(role: string): boolean {
  return role === "HR" || role === "SUPER_ADMIN";
}

function isValidResourceType(type: string): boolean {
  return [
    "DESK",
    "CHAIR",
    "MEETING_ROOM",
    "PRIVATE_ROOM",
    "TRAINING_ROOM",
    "HOT_DESK",
    "OTHER",
  ].includes(type);
}

function isValidResourceStatus(status: string): boolean {
  return [
    "ACTIVE",
    "INACTIVE",
    "MAINTENANCE",
    "BLOCKED",
  ].includes(status);
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to view spaces.",
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
          message: "You do not have permission to view spaces.",
        },
        {
          status: 403,
        },
      );
    }

    const spaces = await prisma.resource.findMany({
      include: {
        floor: {
          include: {
            office: true,
          },
        },
      },
      orderBy: [
        {
          floor: {
            office: {
              name: "asc",
            },
          },
        },
        {
          floor: {
            name: "asc",
          },
        },
        {
          code: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: spaces,
    });
  } catch (error) {
    console.error("Failed to load spaces:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load spaces.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to create spaces.",
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
          message: "You do not have permission to create spaces.",
        },
        {
          status: 403,
        },
      );
    }

    const body = (await request.json()) as CreateSpaceRequest;

    const code = normalizeCode(body.code ?? "");
    const name = body.name?.trim() ?? "";
    const description = body.description?.trim() || null;
    const capacity = Number(body.capacity);
    const floorId = Number(body.floorId);

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: "Space code is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (code.length > 30) {
      return NextResponse.json(
        {
          success: false,
          message: "Space code cannot exceed 30 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Space name is required.",
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
          message: "Space name cannot exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidResourceType(body.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid space type.",
        },
        {
          status: 400,
        },
      );
    }

    if (!isValidResourceStatus(body.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid space status.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Capacity must be at least 1.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isInteger(floorId) || floorId < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Floor is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "Description cannot exceed 500 characters.",
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
    });

    if (!floor) {
      return NextResponse.json(
        {
          success: false,
          message: "Selected floor was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const existingSpace = await prisma.resource.findFirst({
      where: {
        code,
        floorId,
      },
    });

    if (existingSpace) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A space with this code already exists on the selected floor.",
        },
        {
          status: 409,
        },
      );
    }

    const amenities = Array.isArray(body.amenities)
      ? body.amenities
          .map((item) => item.trim())
          .filter((item) => item.length > 0)
      : [];

    const createdSpace = await prisma.resource.create({
      data: {
        code,
        name,
        type: body.type,
        status: body.status,
        capacity,
        description,
        amenities,
        requiresApproval: body.requiresApproval,
        requiresManager: body.requiresManager,
        floorId,
      },
      include: {
        floor: {
          include: {
            office: true,
          },
        },
      },
    });

    await notifyRoomUpdate({ actorId: currentUser.id, roomId: createdSpace.floor.id, roomName: createdSpace.floor.name, kind: "AREA_UPDATED" });

    return NextResponse.json(
      {
        success: true,
        message: "Space created successfully.",
        data: createdSpace,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to create space:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create space.",
      },
      {
        status: 500,
      },
    );
  }
}