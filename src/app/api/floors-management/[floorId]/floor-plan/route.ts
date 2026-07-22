import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabase-admin";
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

const maxFileSize = 5 * 1024 * 1024;

function canManageLocations(role: string): boolean {
  return role === "HR" || role === "SUPER_ADMIN";
}

async function getFloorId(
  context: RouteContext,
): Promise<number | null> {
  const { floorId: floorIdValue } = await context.params;
  const floorId = Number(floorIdValue);

  if (!Number.isInteger(floorId) || floorId < 1) {
    return null;
  }

  return floorId;
}

function getFileExtension(file: File): string {
  switch (file.type) {
    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "jpg";
  }
}

function getStoragePathFromPublicUrl(
  publicUrl: string | null,
  bucketName: string,
): string | null {
  if (!publicUrl) {
    return null;
  }

  const marker =
    `/storage/v1/object/public/${bucketName}/`;

  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex < 0) {
    return null;
  }

  return decodeURIComponent(
    publicUrl.slice(markerIndex + marker.length),
  );
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
          message:
            "You must sign in to upload a room plan.",
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
          message:
            "You do not have permission to upload room plans.",
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
          message: "Invalid room ID.",
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
          message: "Room was not found.",
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
          message:
            "Please select a room-plan image.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !allowedMimeTypes.includes(uploadedFile.type)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only JPG, PNG, or WEBP images are allowed.",
        },
        {
          status: 400,
        },
      );
    }

    if (uploadedFile.size > maxFileSize) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Room-plan image cannot exceed 5MB.",
        },
        {
          status: 400,
        },
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL is missing.",
      );
    }

    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is missing.",
      );
    }

    const bucketName =
      process.env.SUPABASE_ROOM_PLAN_BUCKET ??
      "room-plans";

    const extension =
      getFileExtension(uploadedFile);

    const storagePath =
      `rooms/${floorId}/room-plan-${Date.now()}.${extension}`;

    const buffer = Buffer.from(
      await uploadedFile.arrayBuffer(),
    );

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, buffer, {
          contentType: uploadedFile.type,
          cacheControl: "3600",
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "Supabase upload error:",
        uploadError,
      );

      return NextResponse.json(
        {
          success: false,
          message: `Unable to store room plan: ${uploadError.message}`,
        },
        {
          status: 500,
        },
      );
    }

    const { data: publicUrlData } =
      supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

    const publicUrl = publicUrlData.publicUrl;

    try {
      const updatedFloor =
        await prisma.floor.update({
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

      const oldStoragePath =
        getStoragePathFromPublicUrl(
          floor.floorPlanUrl,
          bucketName,
        );

      if (
        oldStoragePath &&
        oldStoragePath !== storagePath
      ) {
        const { error: removeError } =
          await supabaseAdmin.storage
            .from(bucketName)
            .remove([oldStoragePath]);

        if (removeError) {
          console.warn(
            "Unable to remove old room plan:",
            removeError,
          );
        }
      }

      return NextResponse.json({
        success: true,
        message:
          "Room plan uploaded successfully.",
        data: updatedFloor,
      });
    } catch (databaseError) {
      await supabaseAdmin.storage
        .from(bucketName)
        .remove([storagePath]);

      throw databaseError;
    }
  } catch (error) {
    console.error(
      "Failed to upload room plan:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload room plan.",
      },
      {
        status: 500,
      },
    );
  }
}