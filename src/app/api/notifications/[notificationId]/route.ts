import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/services/auth/session-service";

type Context = { params: Promise<{ notificationId: string }> };

export async function PATCH(request: NextRequest, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ success: false, message: "You must sign in." }, { status: 401 });
  const id = Number((await context.params).notificationId);
  const body = await request.json().catch(() => ({})) as { isRead?: boolean };
  const existing = await prisma.notification.findFirst({ where: { id, userId: currentUser.id } });
  if (!existing) return NextResponse.json({ success: false, message: "Notification not found." }, { status: 404 });
  const isRead = body.isRead ?? true;
  const data = await prisma.notification.update({ where: { id }, data: { isRead, readAt: isRead ? new Date() : null } });
  const unreadCount = await prisma.notification.count({ where: { userId: currentUser.id, isRead: false } });
  return NextResponse.json({ success: true, data, unreadCount });
}

export async function DELETE(_request: NextRequest, context: Context) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ success: false, message: "You must sign in." }, { status: 401 });
  const id = Number((await context.params).notificationId);
  const result = await prisma.notification.deleteMany({ where: { id, userId: currentUser.id } });
  if (!result.count) return NextResponse.json({ success: false, message: "Notification not found." }, { status: 404 });
  return NextResponse.json({ success: true, message: "Notification deleted." });
}
