import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";
import type { CreateOfficeRequest } from "@/models/location-management";

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
          message: "You must sign in to view offices.",
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
          message: "You do not have permission to view offices.",
        },
        {
          status: 403,
        },
      );
    }

    const offices = await prisma.office.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: offices,
    });
  } catch (error) {
    console.error("Failed to load offices:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load offices.",
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
          message: "You must sign in to create offices.",
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
          message: "You do not have permission to create offices.",
        },
        {
          status: 403,
        },
      );
    }

    const body = (await request.json()) as CreateOfficeRequest;

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
        name,
      },
    });

    if (existingOffice) {
      return NextResponse.json(
        {
          success: false,
          message: "An office with this name already exists.",
        },
        {
          status: 409,
        },
      );
    }

    const createdOffice = await prisma.office.create({
      data: {
        name,
        address,
        timezone,
        isActive,
        createdById: currentUser.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Office created successfully.",
        data: createdOffice,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to create office:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create office.",
      },
      {
        status: 500,
      },
    );
  }
}