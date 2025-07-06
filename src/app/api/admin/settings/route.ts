// src/app/api/admin/settings/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { SystemSettings } from '@/types';

import {
  getSystemSettings,
  updateSystemSettings,
} from '@/services/admin/settingsService';
import { UserRole } from '@/types'; // Assuming UserRole enum/type exists

async function checkAdminAuth(): Promise<{
  allow: boolean;
  message?: string;
  status?: number;
}> {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error in checkAdminAuth:', authError);
      return { allow: false, message: 'Authentication error', status: 500 };
    }
    if (!user) {
      return { allow: false, message: 'Authentication required', status: 401 };
    }
    // Assuming role is in user_metadata. This needs to match actual Supabase setup.
    if (user.user_metadata?.role !== UserRole.ADMIN) {
      return {
        allow: false,
        message: 'Forbidden: Admin access required',
        status: 403,
      };
    }
    return { allow: true };
  } catch (e) {
    console.error('Exception in checkAdminAuth:', e);
    return {
      allow: false,
      message: 'Internal server error during auth check',
      status: 500,
    };
  }
}

export async function GET(request: Request) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.allow) {
    return NextResponse.json(
      { message: authCheck.message },
      { status: authCheck.status }
    );
  }
  try {
    const settings = await getSystemSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /api/admin/settings error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to fetch system settings: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const authCheck = await checkAdminAuth();
  if (!authCheck.allow) {
    return NextResponse.json(
      { message: authCheck.message },
      { status: authCheck.status }
    );
  }
  try {
    const newSettings = (await request.json()) as Partial<SystemSettings>;

    // Basic validation (can be enhanced with Zod)
    if (
      typeof newSettings.enable_ai_project_analysis !== 'boolean' &&
      newSettings.enable_ai_project_analysis !== undefined
    ) {
      return NextResponse.json(
        { message: 'Invalid type for enable_ai_project_analysis' },
        { status: 400 }
      );
    }
    if (
      newSettings.default_concept_map_visibility &&
      !['public', 'private'].includes(
        newSettings.default_concept_map_visibility
      )
    ) {
      return NextResponse.json(
        { message: 'Invalid value for default_concept_map_visibility' },
        { status: 400 }
      );
    }
    if (
      newSettings.max_project_file_size_mb !== undefined &&
      (typeof newSettings.max_project_file_size_mb !== 'number' ||
        newSettings.max_project_file_size_mb < 1 ||
        newSettings.max_project_file_size_mb > 100)
    ) {
      return NextResponse.json(
        {
          message:
            'Invalid value for max_project_file_size_mb (must be number 1-100)',
        },
        { status: 400 }
      );
    }

    const updatedSettings = await updateSystemSettings(newSettings);
    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to update system settings: ${errorMessage}` },
      { status: 500 }
    );
  }
}
