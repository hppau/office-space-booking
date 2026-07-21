import { randomBytes, createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/services/auth/password-service";
import { sendVerificationEmail } from "@/services/email/email-service";

type RegisterRequest = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createVerificationToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);

  return {
    token,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

function createVerificationUrl(token: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/auth/verify-email?token=${token}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RegisterRequest;

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const confirmPassword = body.confirmPassword ?? "";

    if (!fullName || !email || !password || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill in all required fields.",
        },
        {
          status: 400,
        },
      );
    }

    if (fullName.length < 2) {
      return NextResponse.json(
        {
          success: false,
          message: "Full name must contain at least 2 characters.",
        },
        {
          status: 400,
        },
      );
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        {
          status: 400,
        },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must contain at least 8 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          message: "Password and confirm password do not match.",
        },
        {
          status: 400,
        },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser?.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "This email is already registered and verified.",
        },
        {
          status: 409,
        },
      );
    }

    const verificationToken = createVerificationToken();
    const verificationUrl = createVerificationUrl(verificationToken.token);

    if (existingUser && !existingUser.isActive) {
      await prisma.emailVerificationToken.deleteMany({
        where: {
          userId: existingUser.id,
        },
      });

      await prisma.emailVerificationToken.create({
        data: {
          userId: existingUser.id,
          tokenHash: verificationToken.tokenHash,
          expiresAt: verificationToken.expiresAt,
        },
      });

      try {
        await sendVerificationEmail({
          to: existingUser.email,
          fullName: existingUser.fullName,
          verificationUrl,
        });
      } catch (emailError) {
        console.error("Failed to resend verification email:", emailError);

        return NextResponse.json(
          {
            success: false,
            message:
              "Your account already exists but the verification email could not be sent. Please check SMTP settings.",
          },
          {
            status: 500,
          },
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Your account already exists but is not verified yet. A new verification email has been sent.",
        data: {
          id: existingUser.id,
          fullName: existingUser.fullName,
          email: existingUser.email,
          role: existingUser.role,
          isActive: existingUser.isActive,
        },
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash,
        role: "EMPLOYEE",
        isActive: false,
        emailVerificationTokens: {
          create: {
            tokenHash: verificationToken.tokenHash,
            expiresAt: verificationToken.expiresAt,
          },
        },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    try {
      await sendVerificationEmail({
        to: user.email,
        fullName: user.fullName,
        verificationUrl,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);

      await prisma.user.delete({
        where: {
          id: user.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Account was not created because the verification email could not be sent. Please check SMTP settings.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Account created successfully. Please check your email and click the verification link before logging in.",
        data: user,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Registration failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred during registration.",
      },
      {
        status: 500,
      },
    );
  }
}