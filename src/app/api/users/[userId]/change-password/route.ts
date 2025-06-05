
// src/app/api/users/[userId]/change-password/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

export async function POST(request: Request, context: { params: { userId: string } }) {
  try {
    const { userId: pathUserId } = context.params;
    const { newPassword } = await request.json() as { newPassword: string };

    if (!pathUserId) {
      return NextResponse.json({ message: "User ID is required in path" }, { status: 400 });
    }
    if (!newPassword) {
      return NextResponse.json({ message: "New password is required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
        return NextResponse.json({ message: "New password must be at least 6 characters." }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

    const { data: { user: authUser }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !authUser) {
      return NextResponse.json({ message: "Unauthorized: Could not retrieve authenticated user." }, { status: 401 });
    }

    // Security check: Ensure the authenticated user is the one trying to change their password
    // or is an admin with special logic (not implemented here, admin password changes usually done differently)
    if (authUser.id !== pathUserId) {
      // Deny if trying to change password for a different user.
      // For this app, only self-service password change is implemented.
       if (authUser.id === "admin-mock-id" || authUser.id === "student-test-id" || authUser.id === "teacher-test-id") {
        return NextResponse.json({ message: "Forbidden: Mock user accounts cannot change other users' passwords via this endpoint." }, { status: 403 });
      }
      return NextResponse.json({ message: "Forbidden: You can only change your own password." }, { status: 403 });
    }

    // Check if the user is one of the mock users for whom password change should be disabled
     if (pathUserId === "admin-mock-id" || pathUserId === "student-test-id" || pathUserId === "teacher-test-id") {
      return NextResponse.json({ message: "Forbidden: Password for pre-defined mock accounts cannot be changed." }, { status: 403 });
    }
    
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      console.error(`Change Password API error (User ID: ${authUser.id}):`, updateError);
      let errorMessage = `Failed to change password: ${updateError.message}`;
      if (updateError.message.includes("same as the old password")) {
        errorMessage = "New password must be different from the old password.";
      } else if (updateError.message.includes("weak password")) {
        errorMessage = "Password is too weak. Please choose a stronger password.";
      }
      return NextResponse.json({ message: errorMessage }, { status: 400 });
    }
    
    return NextResponse.json({ message: "Password changed successfully." });

  } catch (error) {
    console.error(`Change Password API - unexpected error:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected server error occurred.";
    return NextResponse.json({ message: `Failed to change password: ${errorMessage}` }, { status: 500 });
  }
}
