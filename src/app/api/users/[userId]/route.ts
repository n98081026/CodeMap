// src/app/api/users/[userId]/route.ts
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  deleteUser,
  getUserById,
  updateUser,
} from '@/services/users/userService';
import { UserRole } from '@/types';

type HttpMethod = 'GET' | 'PUT' | 'DELETE';

function handleApiError(error: unknown, context: string): NextResponse {
  console.error(context, error);
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  if (errorMessage.includes('Another user profile already exists')) {
    return NextResponse.json({ message: errorMessage }, { status: 409 });
  }
  if (errorMessage.includes('Cannot change email or role for pre-defined mock users') || errorMessage.includes('cannot be deleted')) {
    return NextResponse.json({ message: errorMessage }, { status: 403 });
  }
  return NextResponse.json({ message: `Failed to process request: ${errorMessage}` }, { status: 500 });
}

async function authorize(
  targetUserId: string,
  method: HttpMethod,
  updates?: { role?: UserRole }
): Promise<{ user: User } | NextResponse> {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const authUserRole = user.user_metadata?.role as UserRole;
  if (!authUserRole || !Object.values(UserRole).includes(authUserRole)) {
    return NextResponse.json({ message: 'User role is invalid or missing.' }, { status: 403 });
  }

  // Admin checks
  if (authUserRole === UserRole.ADMIN) {
    if (method === 'DELETE' && user.id === targetUserId) {
      return NextResponse.json({ message: 'Admins cannot delete their own account.' }, { status: 403 });
    }
    return { user }; // Admin can GET/PUT anyone, and DELETE others.
  }

  // Non-admin checks
  if (user.id !== targetUserId) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  if (method === 'PUT' && updates?.role) {
    return NextResponse.json({ message: 'Users cannot change their own role.' }, { status: 403 });
  }
  if (method === 'DELETE') {
    return NextResponse.json({ message: 'Only admins can delete users.' }, { status: 403 });
  }

  return { user };
}

export async function GET(_request: Request, context: { params: { userId: string } }) {
  try {
    const { userId } = context.params;
    const authResult = await authorize(userId, 'GET');
    if (authResult instanceof NextResponse) return authResult;

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error, `GET user failed for ID: ${context.params.userId}`);
  }
}

export async function PUT(request: Request, context: { params: { userId: string } }) {
  try {
    const { userId } = context.params;
    const updates = (await request.json()) as { name?: string; email?: string; role?: UserRole };
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No updates provided' }, { status: 400 });
    }

    const authResult = await authorize(userId, 'PUT', updates);
    if (authResult instanceof NextResponse) return authResult;

    const updatedUser = await updateUser(userId, updates);
    return NextResponse.json(updatedUser);
  } catch (error) {
    return handleApiError(error, `PUT user failed for ID: ${context.params.userId}`);
  }
}

export async function DELETE(_request: Request, context: { params: { userId: string } }) {
  try {
    const { userId } = context.params;
    const authResult = await authorize(userId, 'DELETE');
    if (authResult instanceof NextResponse) return authResult;

    await deleteUser(userId);
    return NextResponse.json({ message: "User's profile deleted successfully." });
  } catch (error) {
    return handleApiError(error, `DELETE user failed for ID: ${context.params.userId}`);
  }
}
