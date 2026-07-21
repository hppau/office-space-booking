import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "office_booking_session";
const SESSION_DURATION_DAYS = 7;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createExpiryDate(): Date {
  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + SESSION_DURATION_DAYS,
  );

  return expiresAt;
}

export async function createUserSession(
  userId: number,
): Promise<void> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = createExpiryDate();

  await prisma.session.create({
    data: {
      tokenHash,
      userId,
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const rawToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!rawToken) {
    return null;
  }

  const tokenHash = hashSessionToken(rawToken);

  const session = await prisma.session.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: {
        include: {
          department: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

export async function deleteCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken =
    cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);

    await prisma.session.deleteMany({
      where: {
        tokenHash,
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}