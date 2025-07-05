// src/app/api/concept-maps/route.ts
import { NextResponse } from 'next/server';
import {
  createConceptMap,
  getConceptMapsByOwnerId,
  getConceptMapsByClassroomId,
} from '@/services/conceptMaps/conceptMapService';
import type { ConceptMapData } from '@/types';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { UserRole } from '@/types';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      name,
      ownerId: ownerIdFromRequest,
      mapData,
      isPublic,
      sharedWithClassroomId,
    } = (await request.json()) as {
      name: string;
      ownerId: string;
      mapData: ConceptMapData;
      isPublic: boolean;
      sharedWithClassroomId?: string | null;
    };

    if (!name || !ownerIdFromRequest || !mapData) {
      return NextResponse.json(
        { message: 'Name, ownerId, and mapData are required' },
        { status: 400 }
      );
    }

    if (user.id !== ownerIdFromRequest) {
      return NextResponse.json(
        {
          message:
            'Forbidden: Users can only create concept maps for themselves.',
        },
        { status: 403 }
      );
    }

    const newMap = await createConceptMap(
      name,
      ownerIdFromRequest,
      mapData,
      isPublic,
      sharedWithClassroomId
    );
    return NextResponse.json(newMap, { status: 201 });
  } catch (error) {
    console.error('Create Concept Map API error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to create concept map: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userRole = user.user_metadata?.role as UserRole;

    const { searchParams } = new URL(request.url);
    const ownerIdParam = searchParams.get('ownerId');
    const classroomIdParam = searchParams.get('classroomId');

    if (classroomIdParam) {
      // User is authenticated at this point.
      // Further authorization for classroom-specific maps is handled by RLS / service layer.

      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');
      let page = 1;
      if (pageParam) {
        const parsedPage = parseInt(pageParam, 10);
        if (isNaN(parsedPage) || parsedPage < 1) {
          return NextResponse.json(
            {
              message: "Invalid 'page' parameter. Must be a positive integer.",
            },
            { status: 400 }
          );
        }
        page = parsedPage;
      }
      let limit = 10; // Default limit
      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
          return NextResponse.json(
            {
              message: "Invalid 'limit' parameter. Must be a positive integer.",
            },
            { status: 400 }
          );
        }
        limit = parsedLimit;
      }

      const { maps, totalCount } = await getConceptMapsByClassroomId(
        classroomIdParam,
        page,
        limit
      );
      return NextResponse.json({
        maps,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      });
    }

    if (ownerIdParam) {
      if (userRole !== UserRole.ADMIN && user.id !== ownerIdParam) {
        return NextResponse.json(
          {
            message:
              'Forbidden: Insufficient permissions to view these concept maps.',
          },
          { status: 403 }
        );
      }

      const pageParam = searchParams.get('page');
      const limitParam = searchParams.get('limit');

      let page = 1;
      if (pageParam) {
        const parsedPage = parseInt(pageParam, 10);
        if (isNaN(parsedPage) || parsedPage < 1) {
          return NextResponse.json(
            {
              message: "Invalid 'page' parameter. Must be a positive integer.",
            },
            { status: 400 }
          );
        }
        page = parsedPage;
      }

      let limit = 10; // Default limit
      if (limitParam) {
        const parsedLimit = parseInt(limitParam, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
          return NextResponse.json(
            {
              message: "Invalid 'limit' parameter. Must be a positive integer.",
            },
            { status: 400 }
          );
        }
        limit = parsedLimit;
      }

      const { maps, totalCount } = await getConceptMapsByOwnerId(
        ownerIdParam,
        page,
        limit
      );

      return NextResponse.json({
        maps,
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      });
    }

    // If neither ownerId nor classroomId is provided, it's an invalid request for this endpoint.
    return NextResponse.json(
      {
        message:
          "Query parameter 'ownerId' or 'classroomId' is required to list concept maps.",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Get Concept Maps API error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to fetch concept maps: ${errorMessage}` },
      { status: 500 }
    );
  }
}
