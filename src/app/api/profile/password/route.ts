import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
} from "@/services/auth/password-service";
import {
  createUserSession,
  getCurrentUser,
} from "@/services/auth/session-service";

type ChangePasswordRequestBody = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

function validateNewPassword(password: string): string {
  if (password.length < 8) {
    return "New password must contain at least 8 characters.";
  }

  if (!/[a-z]/.test(password)) {
    return "New password must contain at least one lowercase letter.";
  }

  if (!/[A-Z]/.test(password)) {
    return "New password must contain at least one uppercase letter.";
  }

  if (!/[0-9]/.test(password)) {
    return "New password must contain at least one number.";
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return "New password must contain at least one special character.";
  }

  return "";
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          message: "You are not signed in.",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      (await request.json()) as ChangePasswordRequestBody;

    const currentPassword = body.currentPassword ?? "";
    const newPassword = body.newPassword ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "All password fields are required.",
        },
        {
          status: 400,
        },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "The new passwords do not match.",
        },
        {
          status: 400,
        },
      );
    }

    const passwordValidationError =
      validateNewPassword(newPassword);

    if (passwordValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: passwordValidationError,
        },
        {
          status: 400,
        },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: currentUser.id,
      },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This account does not currently have a password.",
        },
        {
          status: 400,
        },
      );
    }

    const currentPasswordIsCorrect = await verifyPassword(
      currentPassword,
      user.passwordHash,
    );

    if (!currentPasswordIsCorrect) {
      return NextResponse.json(
        {
          success: false,
          message: "The current password is incorrect.",
        },
        {
          status: 400,
        },
      );
    }

    const sameAsCurrentPassword = await verifyPassword(
      newPassword,
      user.passwordHash,
    );

    if (sameAsCurrentPassword) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The new password must be different from the current password.",
        },
        {
          status: 400,
        },
      );
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          passwordHash: newPasswordHash,
        },
      }),

      prisma.session.deleteMany({
        where: {
          userId: user.id,
        },
      }),
    ]);

    /*
     * All old sessions were deleted.
     * Create a new session for the browser currently changing
     * the password.
     */
    await createUserSession(user.id);

    return NextResponse.json({
      success: true,
      message:
        "Password changed successfully. Other signed-in devices have been logged out.",
    });
  } catch (error) {
    console.error("Failed to change password:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "An unexpected error occurred while changing the password.",
      },
      {
        status: 500,
      },
    );
  }
}