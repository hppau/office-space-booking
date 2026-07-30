import { NextResponse } from "next/server";
import { getCurrentUser } from "@/services/auth/session-service";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
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

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
        department: user.department,
      },
    });
  } catch (error) {
    console.error("Failed to load current user:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load the signed-in user.",
      },
      {
        status: 500,
      },
    );
  }
}