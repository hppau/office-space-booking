import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { uploadProfileImage } from "@/lib/profile-image-upload";
import { getCurrentUser } from "@/services/auth/session-service";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please select a cover photo." },
        { status: 400 },
      );
    }

    const coverImageUrl = await uploadProfileImage({
      file,
      userId: currentUser.id,
      imageType: "cover",
    });

    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        coverImageUrl,
      },
    });

    return NextResponse.json({
      message: "Cover photo updated successfully.",
      coverImageUrl,
    });
  } catch (error) {
    console.error("Cover photo upload failed:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload cover photo.",
      },
      { status: 500 },
    );
  }
}