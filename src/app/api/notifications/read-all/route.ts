import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

export async function PATCH() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ success: false, message: "You must sign in." }, { status: 401 });
  await prisma.notification.updateMany({ where: { userId: currentUser.id, isRead: false }, data: { isRead: true, readAt: new Date() } });
  return NextResponse.json({ success: true, message: "All notifications marked as read.", unreadCount: 0 });
}
