// src/app/api/concept-maps/route.ts
import { NextResponse } from 'next/server';

import type { ConceptMapData } from '@/types';
import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  createConceptMap,
  getConceptMapsByClassroomId,
  getConceptMapsByOwnerId,
} from '@/services/conceptMaps/conceptMapService';
import { UserRole } from '@/types';

interface ConceptMapCreationPayload {
  name: string;
  ownerId: string;
  mapData: ConceptMapData;
  isPublic: boolean;
  sharedWithClassroomId?: string | null;
}

function handleApiError(error: unknown, context: string): NextResponse {
  console.error(context, error);
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  return NextResponse.json(
    { message: `Failed to process request: ${errorMessage}` },
    { status: 500 }
  );
}

async function authorizeCreateMap(
  user: User,
  payload: ConceptMapCreationPayload
): Promise<NextResponse | null> {
  if (user.id !== payload.ownerId) {
    return NextResponse.json(
      {
        message:
          'Forbidden: Users can only create concept maps for themselves.',
      },
      { status: 403 }
    );
  }
  return null;
}

async function authorizeViewMaps(
  user: User,
  params: URLSearchParams
): Promise<NextResponse | null> {
  const ownerId = params.get('ownerId');
  const classroomId = params.get('classroomId');

  if (!ownerId && !classroomId) {
    return NextResponse.json(
      { message: "Query parameter 'ownerId' or 'classroomId' is required." },
      { status: 400 }
    );
  }

  if (ownerId) {
    const userRole = user.user_metadata?.role as UserRole;
    if (userRole !== UserRole.ADMIN && user.id !== ownerId) {
      return NextResponse.json(
        { message: 'Forbidden: Insufficient permissions.' },
        { status: 403 }
      );
    }
  }

  // For classroomId, auth is assumed to be handled by RLS in the service layer,
  // so we only need to ensure the user is authenticated.

  return null;
}

export async function POST(request: Request) {
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

    const payload = (await request.json()) as ConceptMapCreationPayload;
    if (!payload.name || !payload.ownerId || !payload.mapData) {
      return NextResponse.json(
        { message: 'Name, ownerId, and mapData are required' },
        { status: 400 }
      );
    }

    const authError = await authorizeCreateMap(user, payload);
    if (authError) {
      return authError;
    }

    const newMap = await createConceptMap(
      payload.name,
      payload.ownerId,
      payload.mapData,
      payload.isPublic,
      payload.sharedWithClassroomId
    );
    return NextResponse.json(newMap, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create Concept Map API error:');
  }
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

    const { searchParams } = new URL(request.url);
    const authError = await authorizeViewMaps(user, searchParams);
    if (authError) {
      return authError;
    }

    const classroomId = searchParams.get('classroomId');
    const ownerId = searchParams.get('ownerId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (classroomId) {
      const result = await getConceptMapsByClassroomId(
        classroomId,
        page,
        limit
      );
      return NextResponse.json(result);
    }

    if (ownerId) {
      const result = await getConceptMapsByOwnerId(ownerId, page, limit);
      return NextResponse.json(result);
    }

    // This case is handled by authorizeViewMaps, but as a fallback:
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  } catch (error) {
    return handleApiError(error, 'Get Concept Maps API error:');
  }
}
