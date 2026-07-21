import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to view booking maps.",
        },
        {
          status: 401,
        },
      );
    }

    const floors = await prisma.floor.findMany({
      where: {
        isActive: true,
        floorPlanUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        floorNumber: true,
        floorPlanUrl: true,
        office: {
          select: {
            id: true,
            name: true,
          },
        },
        resources: {
          where: {
            isActive: true,
            status: "ACTIVE",
            xPercent: {
              not: null,
            },
            yPercent: {
              not: null,
            },
            widthPercent: {
              not: null,
            },
            heightPercent: {
              not: null,
            },
          },
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            status: true,
            capacity: true,
            requiresApproval: true,
            requiresManager: true,
            xPercent: true,
            yPercent: true,
            widthPercent: true,
            heightPercent: true,
            rotation: true,
            iconName: true,
          },
          orderBy: {
            code: "asc",
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

    const bookingMaps = floors.map((floor) => ({
      id: floor.id,
      name: floor.name,
      floorNumber: floor.floorNumber,
      floorPlanUrl: floor.floorPlanUrl,
      office: floor.office,
      spaces: floor.resources.map((space) => ({
        ...space,
        xPercent: space.xPercent?.toString() ?? null,
        yPercent: space.yPercent?.toString() ?? null,
        widthPercent: space.widthPercent?.toString() ?? null,
        heightPercent: space.heightPercent?.toString() ?? null,
        rotation: space.rotation?.toString() ?? null,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: bookingMaps,
    });
  } catch (error) {
    console.error("Failed to load booking maps:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load booking maps.",
      },
      {
        status: 500,
      },
    );
  }
}