import { NextResponse } from "next/server";
import { deleteCurrentSession } from "@/services/auth/session-service";

export async function POST() {
  try {
    await deleteCurrentSession();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Logout failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to log out.",
      },
      {
        status: 500,
      },
    );
  }
}