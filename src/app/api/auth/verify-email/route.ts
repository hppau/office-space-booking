import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=missing-verification-token", request.url),
    );
  }

  const tokenHash = hashToken(token);

  const verificationRecord =
    await prisma.emailVerificationToken.findUnique({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
    });

  if (!verificationRecord) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-verification-token", request.url),
    );
  }

  if (verificationRecord.expiresAt < new Date()) {
    await prisma.emailVerificationToken.delete({
      where: {
        id: verificationRecord.id,
      },
    });

    return NextResponse.redirect(
      new URL("/login?error=expired-verification-token", request.url),
    );
  }

  await prisma.user.update({
    where: {
      id: verificationRecord.userId,
    },
    data: {
      isActive: true,
    },
  });

  await prisma.emailVerificationToken.deleteMany({
    where: {
      userId: verificationRecord.userId,
    },
  });

  return NextResponse.redirect(
    new URL("/login?verified=1", request.url),
  );
}