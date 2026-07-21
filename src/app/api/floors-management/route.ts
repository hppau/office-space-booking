import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import type { CreateFloorRequest } from "@/models/location-management";

function canManageLocations(role: string): boolean {
  return role === "HR" || role === "SUPER_ADMIN";
}

function normalizeName(name: string): string {
  return name.trim();
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

    if (!canManageLocations(currentUser.role)) {
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
        office: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          office: {
            name: "asc",
          },
        },
        {
          floorNumber: "asc",
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

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to create floors.",
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
          message: "You do not have permission to create floors.",
        },
        {
          status: 403,
        },
      );
    }

    const body = (await request.json()) as CreateFloorRequest;

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

    const existingFloor = await prisma.floor.findFirst({
      where: {
        officeId,
        name,
      },
    });

    if (existingFloor) {
      return NextResponse.json(
        {
          success: false,
          message: "A floor with this name already exists in this office.",
        },
        {
          status: 409,
        },
      );
    }

    const createdFloor = await prisma.floor.create({
      data: {
        officeId,
        name,
        floorNumber,
        isActive,
        createdById: currentUser.id,
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

    return NextResponse.json(
      {
        success: true,
        message: "Floor created successfully.",
        data: createdFloor,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to create floor:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create floor.",
      },
      {
        status: 500,
      },
    );
  }
}