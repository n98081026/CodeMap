// src/app/api/users/[userId]/change-password/route.ts
import { NextResponse } from 'next/server';

import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';

function handleApiError(error: unknown, context: string): NextResponse {
  console.error(context, error);
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  return NextResponse.json(
    { message: `Failed to change password: ${errorMessage}` },
    { status: 500 }
  );
}

async function authorize(
  userId: string
): Promise<{ user: User } | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  if (user.id !== userId) {
    return NextResponse.json(
      { message: 'Forbidden: You can only change your own password.' },
      { status: 403 }
    );
  }

  return { user };
}

export async function POST(
  request: Request,
  context: { params: { userId: string } }
) {
  const { userId } = context.params;
  if (!userId) {
    return NextResponse.json(
      { message: 'User ID is required' },
      { status: 400 }
    );
  }

  try {
    const authResult = await authorize(userId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { newPassword } = (await request.json()) as { newPassword: string };
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { message: 'New password must be at least 6 characters.' },
        { status: 400 }
      );
    }

    // We need a new client instance associated with the user to perform the update
    const supabase = await createSupabaseServerClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      let errorMessage = updateError.message;
      if (errorMessage.toLowerCase().includes('same as the old password')) {
        errorMessage = 'New password must be different from the old password.';
      } else if (errorMessage.toLowerCase().includes('weak password')) {
        errorMessage =
          'Password is too weak. Please choose a stronger password.';
      }
      return NextResponse.json({ message: errorMessage }, { status: 400 });
    }

    return NextResponse.json({ message: 'Password changed successfully.' });
  } catch (error) {
    return handleApiError(
      error,
      `Change Password API error for user ${userId}:`
    );
  }
}
