// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers } from '@/services/users/userService';

// This route is for admin purposes to get all users.
// In a real application, this route should be protected and only accessible by administrators.
export async function GET(request: Request) {
  try {
    // TODO: Add authentication and authorization checks here to ensure only admins can access this.
    // For example:
    // const session = await getServerSession(authOptions); // if using NextAuth
    // if (!session || session.user.role !== UserRole.ADMIN) {
    //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    // }

    const users = await getAllUsers();
    return NextResponse.json(users);

  } catch (error) {
    console.error("Get All Users API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: "Failed to fetch users: " + errorMessage }, { status: 500 });
  }
}
