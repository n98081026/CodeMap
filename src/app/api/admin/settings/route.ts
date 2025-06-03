
// src/app/api/admin/settings/route.ts
import { NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings } from '@/services/admin/settingsService';
import type { SystemSettings } from '@/types';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'; // For auth checks
// import { cookies } from 'next/headers';
// import { UserRole } from '@/types';

// Helper function for authorization (basic example)
// In a real app, integrate with your auth context or Supabase user roles.
// For now, RLS on the 'system_settings' table is the primary security.
// async function isAdmin(): Promise<boolean> {
//   const cookieStore = cookies();
//   const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
//   const { data: { user } } = await supabase.auth.getUser();
//   // This assumes you have a way to get full user profile including role
//   // For simplicity, this check is illustrative. RLS is more robust.
//   return user?.user_metadata?.role === UserRole.ADMIN;
// }

export async function GET(request: Request) {
  // if (!await isAdmin()) {
  //   return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  // }
  try {
    const settings = await getSystemSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /api/admin/settings error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: `Failed to fetch system settings: ${errorMessage}` }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  // if (!await isAdmin()) {
  //   return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
  // }
  try {
    const newSettings = await request.json() as Partial<SystemSettings>;
    
    // Basic validation (can be enhanced with Zod)
    if (typeof newSettings.enable_ai_project_analysis !== 'boolean' && newSettings.enable_ai_project_analysis !== undefined) {
        return NextResponse.json({ message: 'Invalid type for enable_ai_project_analysis' }, { status: 400 });
    }
    if (newSettings.default_concept_map_visibility && !['public', 'private'].includes(newSettings.default_concept_map_visibility)) {
        return NextResponse.json({ message: 'Invalid value for default_concept_map_visibility' }, { status: 400 });
    }
    if (newSettings.max_project_file_size_mb !== undefined && (typeof newSettings.max_project_file_size_mb !== 'number' || newSettings.max_project_file_size_mb < 1 || newSettings.max_project_file_size_mb > 100)) {
        return NextResponse.json({ message: 'Invalid value for max_project_file_size_mb (must be number 1-100)' }, { status: 400 });
    }

    const updatedSettings = await updateSystemSettings(newSettings);
    return NextResponse.json(updatedSettings);
  } catch (error) {
    console.error('PUT /api/admin/settings error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ message: `Failed to update system settings: ${errorMessage}` }, { status: 500 });
  }
}
