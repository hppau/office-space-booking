import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

function normalizeOptionalText(
  value: unknown,
  maximumLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  return normalizedValue.slice(0, maximumLength);
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 },
      );
    }

    const profile = await prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },
      include: {
        department: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Profile not found." },
        { status: 404 },
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Failed to load profile:", error);

    return NextResponse.json(
      { message: "Unable to load profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      fullName?: unknown;
      phoneNumber?: unknown;
      jobTitle?: unknown;
      bio?: unknown;
    };

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    if (!fullName) {
      return NextResponse.json(
        { message: "Full name is required." },
        { status: 400 },
      );
    }

    if (fullName.length > 150) {
      return NextResponse.json(
        {
          message:
            "Full name cannot exceed 150 characters.",
        },
        { status: 400 },
      );
    }

    const phoneNumber = normalizeOptionalText(
      body.phoneNumber,
      30,
    );

    const jobTitle = normalizeOptionalText(
      body.jobTitle,
      100,
    );

    const bio = normalizeOptionalText(body.bio, 500);

    const updatedProfile = await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        fullName,
        phoneNumber,
        jobTitle,
        bio,
      },
      include: {
        department: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully.",
      profile: updatedProfile,
    });
  } catch (error) {
    console.error("Failed to update profile:", error);

    return NextResponse.json(
      { message: "Unable to update profile." },
      { status: 500 },
    );
  }
}