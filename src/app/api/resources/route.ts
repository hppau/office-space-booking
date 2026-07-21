import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const resources = await prisma.resource.findMany({
      where: {
        isActive: true,
        floor: {
          isActive: true,
          office: {
            isActive: true,
          },
        },
      },
      include: {
        floor: {
          include: {
            office: true,
          },
        },
      },
      orderBy: [
        {
          type: "asc",
        },
        {
          code: "asc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: resources,
    });
  } catch (error) {
    console.error("Failed to load resources:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load office resources.",
      },
      {
        status: 500,
      },
    );
  }
}