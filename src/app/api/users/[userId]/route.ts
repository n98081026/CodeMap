// src/app/api/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/services/users/userService';
import type { User, UserRole } from '@/types';

export async function GET(request: Request, context: { params: { userId: string } }) {
  try {
    // TODO: Add admin authorization check
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
    // TODO: Add admin authorization check
    const { userId } = context.params;
    const updates = await request.json() as { name?: string; email?: string; role?: UserRole };

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ message: "No updates provided" }, { status: 400 });
    }
    
    // Password updates should be handled via a separate, more secure flow.
    // For now, we exclude password from general updates.

    const updatedUser = await updateUser(userId, updates);
    if (!updatedUser) {
      return NextResponse.json({ message: "User not found or update failed" }, { status: 404 });
    }
    return NextResponse.json(updatedUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
     if (errorMessage.includes("Another user already exists")) {
      return NextResponse.json({ message: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ message: `Failed to update user: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { userId: string } }) {
  try {
    // TODO: Add admin authorization check
    const { userId } = context.params;

    // Basic protection against deleting critical test users directly via API
    if (userId === "student-test-id" || userId === "teacher-test-id") {
      return NextResponse.json({ message: "Cannot delete pre-defined test users via API." }, { status: 403 });
    }
    
    const deleted = await deleteUser(userId);
    if (!deleted) {
      return NextResponse.json({ message: "User not found or deletion failed" }, { status: 404 });
    }
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
     if (errorMessage.includes("Cannot delete pre-defined test users")) {
      return NextResponse.json({ message: errorMessage }, { status: 403 });
    }
    return NextResponse.json({ message: `Failed to delete user: ${errorMessage}` }, { status: 500 });
  }
}
