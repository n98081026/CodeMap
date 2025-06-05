
// src/app/api/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser } from '@/services/users/userService';
import type { UserRole } from '@/types';
// For enhanced security, verify session and admin role for PUT/DELETE
// This would typically involve checking the session user's role from their profile.
// Example (conceptual - AuthContext/middleware would handle this more robustly):
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';
// import { UserRole as AppUserRoleType } from '@/types';
// async function isAdmin(request: Request): Promise<boolean> {
//   const cookieStore = cookies();
//   const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
//   const { data: { user: authUser } } = await supabase.auth.getUser();
//   if (!authUser) return false;
//   const profile = await getUserById(authUser.id); // This service call is fine
//   return profile?.role === AppUserRoleType.ADMIN;
// }

export async function GET(request: Request, context: { params: { userId: string } }) {
  try {
    // Authorization: Typically, only admins or the user themselves should get profile data.
    // Supabase RLS policies should enforce this at the database level.
    // Example check: if (!await isAdmin(request) && sessionUserId !== pathUserId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

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
    // Authorization: Only admins or the user themselves should update profile data.
    // RLS should be the primary enforcer.
    // Example check: if (!await isAdmin(request) && sessionUserId !== pathUserId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

    const { userId } = context.params;
    const updates = await request.json() as { name?: string; email?: string; role?: UserRole };

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ message: "No updates provided" }, { status: 400 });
    }
    
    // The userService.updateUser has logic to handle specific update constraints (e.g., mock users).
    const updatedUser = await updateUser(userId, updates);
    if (!updatedUser) {
      // This might occur if getUserById inside updateUser returns null, e.g., user was deleted concurrently.
      return NextResponse.json({ message: "User not found or update failed" }, { status: 404 });
    }
    return NextResponse.json(updatedUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
     if (errorMessage.includes("Another user profile already exists with this email address")) {
      return NextResponse.json({ message: errorMessage }, { status: 409 }); // Conflict
    }
    if (errorMessage.includes("Cannot change email or role for pre-defined mock users")) {
        return NextResponse.json({message: errorMessage}, {status: 403}); // Forbidden
    }
    return NextResponse.json({ message: `Failed to update user: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { userId: string } }) {
  try {
    // Authorization: Only admins should typically delete users.
    // RLS should enforce this.
    // Example check: if (!await isAdmin(request)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    
    const { userId } = context.params;
    
    // userService.deleteUser has logic to prevent deleting mock users.
    const deleted = await deleteUser(userId); 
    if (!deleted) {
      // This implies the user was not found by the service (or RLS prevented it).
      return NextResponse.json({ message: "User not found or deletion failed" }, { status: 404 });
    }
    // Note: Deleting from 'profiles' doesn't delete from 'auth.users'. That requires Supabase Admin SDK or manual deletion.
    return NextResponse.json({ message: "User's profile deleted successfully. Associated auth user may need separate handling." });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
     if (errorMessage.includes("Pre-defined test user profiles cannot be deleted")) {
      return NextResponse.json({ message: errorMessage }, { status: 403 }); // Forbidden
    }
    return NextResponse.json({ message: `Failed to delete user: ${errorMessage}` }, { status: 500 });
  }
}
