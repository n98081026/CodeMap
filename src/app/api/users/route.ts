// src/app/api/users/route.ts
import { NextResponse } from 'next/server';

import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getAllUsers } from '@/services/users/userService';
import { UserRole } from '@/types';

function handleApiError(error: unknown, context: string): NextResponse {
  console.error(context, error);
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  return NextResponse.json(
    { message: `Failed to fetch users: ${errorMessage}` },
    { status: 500 }
  );
}

async function authorize(user: User): Promise<NextResponse | null> {
  const userRole = user.user_metadata?.role as UserRole;
  if (userRole !== UserRole.ADMIN) {
    return NextResponse.json(
      { message: 'Forbidden: Admin access required.' },
      { status: 403 }
    );
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const authError = await authorize(user);
    if (authError) {
      return authError;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const searchTerm = searchParams.get('search') || undefined;

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { message: 'Invalid page or limit parameters' },
        { status: 400 }
      );
    }

    const { users, totalCount } = await getAllUsers(page, limit, searchTerm);

    return NextResponse.json({
      users,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    return handleApiError(error, 'Get All Users API error:');
  }
}
