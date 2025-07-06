// src/app/api/users/[userId]/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { UserRole } from '@/types'; // UserRole is already imported correctly

import {
  getUserById,
  updateUser,
  deleteUser,
} from '@/services/users/userService';
// UserRole is already imported from '@/types'

export async function GET(
  request: Request,
  context: { params: { userId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user: authUser },
      error: authFetchError,
    } = await supabase.auth.getUser();

    if (authFetchError) {
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
    if (!authUser) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userRoleValue = authUser.user_metadata?.role;
    if (
      !userRoleValue ||
      !Object.values(UserRole).includes(userRoleValue as UserRole)
    ) {
      console.error(
        `Invalid or missing role for user ${authUser.id}: ${userRoleValue}`
      );
      return NextResponse.json(
        { message: 'User role is invalid or not configured. Access denied.' },
        { status: 403 }
      );
    }
    const authUserRole = userRoleValue as UserRole;
    const targetUserId = context.params.userId;

    if (authUserRole !== UserRole.ADMIN && authUser.id !== targetUserId) {
      return NextResponse.json(
        { message: "Forbidden: Not authorized to view this user's profile." },
        { status: 403 }
      );
    }

    const user = await getUserById(targetUserId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to fetch user: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { userId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user: authUser },
      error: authFetchError,
    } = await supabase.auth.getUser();

    if (authFetchError) {
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
    if (!authUser) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userRoleValuePUT = authUser.user_metadata?.role; // Use different variable name to avoid conflict
    if (
      !userRoleValuePUT ||
      !Object.values(UserRole).includes(userRoleValuePUT as UserRole)
    ) {
      console.error(
        `Invalid or missing role for user ${authUser.id}: ${userRoleValuePUT}`
      );
      return NextResponse.json(
        { message: 'User role is invalid or not configured. Access denied.' },
        { status: 403 }
      );
    }
    const authUserRole = userRoleValuePUT as UserRole;
    const targetUserId = context.params.userId;
    const updates = (await request.json()) as {
      name?: string;
      email?: string;
      role?: UserRole;
    };

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No updates provided' },
        { status: 400 }
      );
    }

    if (
      updates.role &&
      authUser.id === targetUserId &&
      authUserRole !== UserRole.ADMIN
    ) {
      return NextResponse.json(
        { message: 'Forbidden: Users cannot change their own role.' },
        { status: 403 }
      );
    }
    if (authUserRole !== UserRole.ADMIN && authUser.id !== targetUserId) {
      return NextResponse.json(
        { message: "Forbidden: Not authorized to update this user's profile." },
        { status: 403 }
      );
    }

    const updatedUser = await updateUser(targetUserId, updates);
    if (!updatedUser) {
      // This might occur if getUserById inside updateUser returns null, e.g., user was deleted concurrently.
      return NextResponse.json(
        { message: 'User not found or update failed' },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedUser);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    if (
      errorMessage.includes(
        'Another user profile already exists with this email address'
      )
    ) {
      return NextResponse.json({ message: errorMessage }, { status: 409 }); // Conflict
    }
    if (
      errorMessage.includes(
        'Cannot change email or role for pre-defined mock users'
      )
    ) {
      return NextResponse.json({ message: errorMessage }, { status: 403 }); // Forbidden
    }
    return NextResponse.json(
      { message: `Failed to update user: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { userId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user: authUser },
      error: authFetchError,
    } = await supabase.auth.getUser();

    if (authFetchError) {
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
    if (!authUser) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userRoleValueDELETE = authUser.user_metadata?.role; // Use different variable name
    if (
      !userRoleValueDELETE ||
      !Object.values(UserRole).includes(userRoleValueDELETE as UserRole)
    ) {
      console.error(
        `Invalid or missing role for user ${authUser.id}: ${userRoleValueDELETE}`
      );
      return NextResponse.json(
        { message: 'User role is invalid or not configured. Access denied.' },
        { status: 403 }
      );
    }
    const authUserRole = userRoleValueDELETE as UserRole;
    const targetUserId = context.params.userId;

    if (authUserRole !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can delete users.' },
        { status: 403 }
      );
    }
    if (authUser.id === targetUserId) {
      return NextResponse.json(
        {
          message:
            'Forbidden: Admins cannot delete their own account via this API.',
        },
        { status: 403 }
      );
    }

    const deleted = await deleteUser(targetUserId);
    if (!deleted) {
      return NextResponse.json(
        { message: 'User not found or deletion failed' },
        { status: 404 }
      );
    }
    // Note: Deleting from 'profiles' doesn't delete from 'auth.users'. That requires Supabase Admin SDK or manual deletion.
    return NextResponse.json({
      message:
        "User's profile deleted successfully. Associated auth user may need separate handling.",
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    if (
      errorMessage.includes('Pre-defined test user profiles cannot be deleted')
    ) {
      return NextResponse.json({ message: errorMessage }, { status: 403 }); // Forbidden
    }
    return NextResponse.json(
      { message: `Failed to delete user: ${errorMessage}` },
      { status: 500 }
    );
  }
}
