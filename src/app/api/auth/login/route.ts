import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/services/auth/password-service";
import { createUserSession } from "@/services/auth/session-service";

type LoginRequest = {
  email: string;
  password: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LoginRequest;

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password are required.",
        },
        {
          status: 400,
        },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (
      !user ||
      !user.passwordHash ||
      !user.isActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    const passwordIsCorrect = await verifyPassword(
      password,
      user.passwordHash,
    );

    if (!passwordIsCorrect) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email or password.",
        },
        {
          status: 401,
        },
      );
    }

    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        expiresAt: {
          lte: new Date(),
        },
      },
    });

    await createUserSession(user.id);

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      data: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "An unexpected error occurred during login.",
      },
      {
        status: 500,
      },
    );
  }
}