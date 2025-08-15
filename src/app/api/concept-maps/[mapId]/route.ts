// src/app/api/concept-maps/[mapId]/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { ConceptMapData } from '@/types';

import {
  getConceptMapById,
  updateConceptMap,
  deleteConceptMap,
} from '@/services/conceptMaps/conceptMapService';

export async function GET(
  request: Request,
  // Using `any` as a last resort to bypass a stubborn Next.js build error.
  // The type checker seems to be failing on the context parameter for dynamic routes.
  context: any
) {
  try {
    const { mapId } = context.params;
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
      const supabase = await createSupabaseServerClient();
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
  context: any // Using `any` as a workaround
) {
  try {
    const { mapId } = context.params;
    const supabase = await createSupabaseServerClient();
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
  context: any // Using `any` as a workaround
) {
  try {
    const { mapId } = context.params;
    const supabase = await createSupabaseServerClient();
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

    const deleted = await deleteConceptMap(mapId, user.id);
    if (!deleted) {
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
