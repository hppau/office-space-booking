import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

type RouteContext = {
  params: Promise<{
    floorId: string;
  }>;
};

const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function canManageLocations(role: string): boolean {
  return role === "HR" || role === "SUPER_ADMIN";
}

async function getFloorId(context: RouteContext): Promise<number | null> {
  const { floorId: floorIdValue } = await context.params;
  const floorId = Number(floorIdValue);

  if (!Number.isInteger(floorId) || floorId < 1) {
    return null;
  }

  return floorId;
}

function getFileExtension(file: File): string {
  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You must sign in to upload a floor plan.",
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
          message: "You do not have permission to upload floor plans.",
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

    const formData = await request.formData();
    const uploadedFile = formData.get("file");

    if (!(uploadedFile instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload an image file.",
        },
        {
          status: 400,
        },
      );
    }

    if (!allowedMimeTypes.includes(uploadedFile.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only JPG, PNG, or WEBP images are allowed.",
        },
        {
          status: 400,
        },
      );
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (uploadedFile.size > maxFileSize) {
      return NextResponse.json(
        {
          success: false,
          message: "Image size cannot exceed 5MB.",
        },
        {
          status: 400,
        },
      );
    }

    const arrayBuffer = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadDirectory = path.join(
      process.cwd(),
      "public",
      "uploads",
      "floor-plans",
    );

    await mkdir(uploadDirectory, {
      recursive: true,
    });

    const extension = getFileExtension(uploadedFile);
    const fileName = `floor-${floorId}-${Date.now()}.${extension}`;
    const filePath = path.join(uploadDirectory, fileName);

    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/floor-plans/${fileName}`;

    const updatedFloor = await prisma.floor.update({
      where: {
        id: floorId,
      },
      data: {
        floorPlanUrl: publicUrl,
        floorPlanWidth: null,
        floorPlanHeight: null,
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

    return NextResponse.json({
      success: true,
      message: "Floor plan uploaded successfully.",
      data: updatedFloor,
    });
  } catch (error) {
    console.error("Failed to upload floor plan:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to upload floor plan.",
      },
      {
        status: 500,
      },
    );
  }
}