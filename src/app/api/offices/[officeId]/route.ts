import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import type { UpdateOfficeRequest } from "@/models/location-management";

type RouteContext = {
  params: Promise<{
    officeId: string;
  }>;
};

function canManageLocations(role: string): boolean {
  return role === "HR" || role === "SUPER_ADMIN";
}

function normalizeName(name: string): string {
  return name.trim();
}

async function getOfficeId(context: RouteContext): Promise<number | null> {
  const { officeId: officeIdValue } = await context.params;
  const officeId = Number(officeIdValue);

  if (!Number.isInteger(officeId) || officeId < 1) {
    return null;
  }

  return officeId;
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
          message: "You must sign in to view this office.",
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
          message: "You do not have permission to view this office.",
        },
        {
          status: 403,
        },
      );
    }

    const officeId = await getOfficeId(context);

    if (!officeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid office ID.",
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
          message: "Office was not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: office,
    });
  } catch (error) {
    console.error("Failed to load office:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load office.",
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
          message: "You must sign in to update this office.",
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
          message: "You do not have permission to update this office.",
        },
        {
          status: 403,
        },
      );
    }

    const officeId = await getOfficeId(context);

    if (!officeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid office ID.",
        },
        {
          status: 400,
        },
      );
    }

    const body = (await request.json()) as UpdateOfficeRequest;

    const name = normalizeName(body.name ?? "");
    const address = body.address?.trim() || null;
    const timezone = body.timezone?.trim() || "Asia/Singapore";
    const isActive = Boolean(body.isActive);

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Office name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message: "Office name cannot exceed 150 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (address && address.length > 500) {
      return NextResponse.json(
        {
          success: false,
          message: "Address cannot exceed 500 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (timezone.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message: "Timezone cannot exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const existingOffice = await prisma.office.findUnique({
      where: {
        id: officeId,
      },
    });

    if (!existingOffice) {
      return NextResponse.json(
        {
          success: false,
          message: "Office was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const duplicatedOffice = await prisma.office.findFirst({
      where: {
        id: {
          not: officeId,
        },
        name,
      },
    });

    if (duplicatedOffice) {
      return NextResponse.json(
        {
          success: false,
          message: "Another office with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const updatedOffice = await prisma.office.update({
      where: {
        id: officeId,
      },
      data: {
        name,
        address,
        timezone,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Office updated successfully.",
      data: updatedOffice,
    });
  } catch (error) {
    console.error("Failed to update office:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update office.",
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
          message: "You must sign in to delete this office.",
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
          message: "You do not have permission to delete this office.",
        },
        {
          status: 403,
        },
      );
    }

    const officeId = await getOfficeId(context);

    if (!officeId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid office ID.",
        },
        {
          status: 400,
        },
      );
    }

    const existingOffice = await prisma.office.findUnique({
      where: {
        id: officeId,
      },
    });

    if (!existingOffice) {
      return NextResponse.json(
        {
          success: false,
          message: "Office was not found.",
        },
        {
          status: 404,
        },
      );
    }

    const deactivatedOffice = await prisma.office.update({
      where: {
        id: officeId,
      },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Office deactivated successfully.",
      data: deactivatedOffice,
    });
  } catch (error) {
    console.error("Failed to delete office:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to delete office.",
      },
      {
        status: 500,
      },
    );
  }
}