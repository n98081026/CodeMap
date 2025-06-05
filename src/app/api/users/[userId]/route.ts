
// src/app/api/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/services/users/userService';
import type { User, UserRole } from '@/types';

// Basic auth check placeholder - RLS is primary, but this could be enhanced
// For a real app, use Supabase session validation like in change-password route.
// const checkAdminAuth = async (request: Request) => { /* ... */ return true; }

export async function GET(request: Request, context: { params: { userId: string } }) {
  try {
    // if (!await checkAdminAuth(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { userId } = context.params;
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch user: ${errorMessage}` }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: { userId: string } }) {
  try {
    // if (!await checkAdminAuth(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { userId } = context.params;
    const updates = await request.json() as { name?: string; email?: string; role?: UserRole };

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ message: "No updates provided" }, { status: 400 });
    }
    
    // Prevent editing predefined mock users directly via API if needed
    if (userId === "admin-mock-id" || userId === "student-test-id" || userId === "teacher-test-id") {
      if (updates.email || updates.role) { // Allow name changes for mock for testing, but not email/role
        return NextResponse.json({ message: "Cannot change email or role for pre-defined mock users via API." }, { status: 403 });
      }
    }

    const updatedUser = await updateUser(userId, updates);
    if (!updatedUser) {
      return NextResponse.json({ message: "User not found or update failed" }, { status: 404 });
    }
    return NextResponse.json(updatedUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
     if (errorMessage.includes("Another user profile already exists")) {
      return NextResponse.json({ message: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ message: `Failed to update user: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { userId: string } }) {
  try {
    // if (!await checkAdminAuth(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    const { userId } = context.params;
    
    const deleted = await deleteUser(userId); // Service has protection for mock users
    if (!deleted) {
      // Service throws specific errors for mock users or not found
      return NextResponse.json({ message: "User not found or deletion failed" }, { status: 404 });
    }
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
     if (errorMessage.includes("Pre-defined test user profiles cannot be deleted")) {
      return NextResponse.json({ message: errorMessage }, { status: 403 });
    }
    return NextResponse.json({ message: `Failed to delete user: ${errorMessage}` }, { status: 500 });
  }
}
