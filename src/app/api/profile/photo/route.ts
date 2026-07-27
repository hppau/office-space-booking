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
        { message: "Please select a profile photo." },
        { status: 400 },
      );
    }

    const profileImageUrl = await uploadProfileImage({
      file,
      userId: currentUser.id,
      imageType: "avatar",
    });

    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        profileImageUrl,
      },
    });

    return NextResponse.json({
      message: "Profile photo updated successfully.",
      profileImageUrl,
    });
  } catch (error) {
    console.error("Profile photo upload failed:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload profile photo.",
      },
      { status: 500 },
    );
  }
}