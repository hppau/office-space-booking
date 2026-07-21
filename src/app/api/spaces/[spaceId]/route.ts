import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import type { UpdateSpaceRequest } from "@/models/space-management";

type RouteContext = {
  params: Promise<{
    spaceId: string;
  }>;
};

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

async function getSpaceId(context: RouteContext): Promise<number | null> {
  const { spaceId: spaceIdValue } = await context.params;
  const spaceId = Number(spaceIdValue);

  if (!Number.isInteger(spaceId) || spaceId < 1) {
    return null;
  }

  return spaceId;
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
          message: "You must sign in to view this space.",
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
          message: "You do not have permission to view this space.",
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

    const space = await prisma.resource.findUnique({
      where: {
        id: spaceId,
      },
      include: {
        floor: {
          include: {
            office: true,
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
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: space,
    });
  } catch (error) {
    console.error("Failed to load space:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load space.",
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
          message: "You must sign in to update this space.",
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
          message: "You do not have permission to update this space.",
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

    const body = (await request.json()) as UpdateSpaceRequest;

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

    const duplicatedSpace = await prisma.resource.findFirst({
      where: {
        id: {
          not: spaceId,
        },
        code,
        floorId,
      },
    });

    if (duplicatedSpace) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another space with this code already exists on the selected floor.",
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

    const updatedSpace = await prisma.resource.update({
      where: {
        id: spaceId,
      },
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

    return NextResponse.json({
      success: true,
      message: "Space updated successfully.",
      data: updatedSpace,
    });
  } catch (error) {
    console.error("Failed to update space:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update space.",
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
          message: "You must sign in to delete this space.",
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
          message: "You do not have permission to delete this space.",
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

    const deactivatedSpace = await prisma.resource.update({
      where: {
        id: spaceId,
      },
      data: {
        status: "INACTIVE",
      },
      include: {
        floor: {
          include: {
            office: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Space deactivated successfully.",
      data: deactivatedSpace,
    });
  } catch (error) {
    console.error("Failed to delete space:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete space.",
      },
      {
        status: 500,
      },
    );
  }
}