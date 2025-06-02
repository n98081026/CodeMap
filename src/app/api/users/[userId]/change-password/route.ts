
// src/app/api/users/[userId]/change-password/route.ts
import { NextResponse } from 'next/server';
import { changeUserPassword } from '@/services/users/userService';

interface ChangePasswordRouteParams {
  params: {
    userId: string;
  };
}

export async function POST(request: Request, { params }: ChangePasswordRouteParams) {
  try {
    const { userId } = params;
    if (!userId) {
      return NextResponse.json({ message: "User ID is required" }, { status: 400 });
    }

    const { currentPassword, newPassword } = await request.json() as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: "Current password and new password are required" }, { status: 400 });
    }
    
    // In a real app, ensure the authenticated user matches userId or is an admin
    // For this mock, we'll proceed directly based on userId from path

    await changeUserPassword(userId, currentPassword, newPassword);
    // changeUserPassword will throw an error if something is wrong (e.g., user not found, current password incorrect)
    
    return NextResponse.json({ message: "Password changed successfully (mock)" });

  } catch (error) {
    console.error(`Change Password API error (User ID: ${params.userId}):`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    
    if (errorMessage.includes("User not found")) {
        return NextResponse.json({ message: errorMessage }, { status: 404 });
    }
    if (errorMessage.includes("Incorrect current password")) {
        return NextResponse.json({ message: errorMessage }, { status: 401 }); // Or 400 Bad Request
    }
    
    return NextResponse.json({ message: `Failed to change password: ${errorMessage}` }, { status: 500 });
  }
}
