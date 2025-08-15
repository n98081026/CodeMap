// src/app/api/concept-maps/[mapId]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type { ConceptMapData } from '@/types';

import {
  getConceptMapById,
  updateConceptMap,
  deleteConceptMap,
} from '@/services/conceptMaps/conceptMapService';

export async function GET(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  try {
    const { mapId } = params;
    if (!mapId) {
      return NextResponse.json(
        { message: 'Map ID is required' },
        { status: 400 }
      );
    }

    const map = await getConceptMapById(mapId);
    if (!map) {
      return NextResponse.json(
        { message: 'Concept map not found' },
        { status: 404 }
      );
    }

    // Authorization Check
    if (!map.isPublic) {
      const cookieStore = await cookies();
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (name) => cookieStore.get(name)?.value,
          },
        }
      );
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.id !== map.ownerId) {
        return NextResponse.json(
          { message: 'Concept map not found or you do not have access.' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(map);
  } catch (error) {
    console.error(
      `Get Concept Map API error (ID: ${params.mapId}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to fetch concept map: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  try {
    const { mapId } = params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: any) => cookieStore.get(name)?.value,
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mapId) {
      return NextResponse.json(
        { message: 'Map ID is required' },
        { status: 400 }
      );
    }
    const updates = (await request.json()) as {
      name?: string;
      mapData?: ConceptMapData;
      isPublic?: boolean;
      sharedWithClassroomId?: string | null;
    };

    const updatedMap = await updateConceptMap(mapId, {
      ...updates,
      ownerId: user.id,
    });
    if (!updatedMap) {
      return NextResponse.json(
        { message: 'Concept map not found or update failed' },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedMap);
  } catch (error) {
    console.error(
      `Update Concept Map API error (ID: ${(await context.params).mapId}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    if (errorMessage.includes('User not authorized'))
      return NextResponse.json({ message: errorMessage }, { status: 403 });
    return NextResponse.json(
      { message: `Failed to update concept map: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { mapId: string } }
) {
  try {
    const { mapId } = params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: any) => cookieStore.get(name)?.value,
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (!mapId) {
      return NextResponse.json(
        { message: 'Map ID is required' },
        { status: 400 }
      );
    }

    const deleted = await deleteConceptMap(mapId, user.id); // Service handles ownership check
    if (!deleted) {
      // This could be due to map not found or auth error handled by service
      // Service throws error for auth, so check that
      return NextResponse.json(
        { message: 'Concept map not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: 'Concept map deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `Delete Concept Map API error (ID: ${(await context.params).mapId}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    if (errorMessage.includes('User not authorized'))
      return NextResponse.json({ message: errorMessage }, { status: 403 });
    return NextResponse.json(
      { message: `Failed to delete concept map: ${errorMessage}` },
      { status: 500 }
    );
  }
}
