// src/app/api/concept-maps/[mapId]/route.ts
import { NextResponse } from 'next/server';
import {
  getConceptMapById,
  updateConceptMap,
  deleteConceptMap,
} from '@/services/conceptMaps/conceptMapService';
import type { ConceptMapData } from '@/types';
// import { getAuth } from '@clerk/nextjs/server'; // Placeholder for actual auth

export async function GET(
  request: Request,
  context: { params: { mapId: string } }
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
    // Add authorization check here if needed: does the current user own this map or have view rights?
    return NextResponse.json(map);
  } catch (error) {
    console.error(
      `Get Concept Map API error (ID: ${context.params.mapId}):`,
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
  context: { params: { mapId: string } }
) {
  try {
    const { mapId } = context.params;
    // const { userId } = getAuth(request as any); // Example
    // if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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
      ownerId: string;
    }; // ownerId for auth check

    // Authorization: Check if current user (userId) owns mockConceptMapsData.find(m => m.id === mapId && m.ownerId === userId)
    // For now, let service handle if it needs ownerId for checks or assume client sends ownerId for updates if it's complex.
    // The service's updateConceptMap currently doesn't take ownerId for auth, but delete does.

    const mapToUpdate = await getConceptMapById(mapId);
    if (!mapToUpdate) {
      return NextResponse.json(
        { message: 'Concept map not found' },
        { status: 404 }
      );
    }
    // Simple auth check for mock:
    if (mapToUpdate.ownerId !== updates.ownerId) {
      // Assuming client sends ownerId for this check
      return NextResponse.json(
        { message: 'Unauthorized to update this map' },
        { status: 403 }
      );
    }

    const updatedMap = await updateConceptMap(mapId, updates);
    if (!updatedMap) {
      return NextResponse.json(
        { message: 'Concept map not found or update failed' },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedMap);
  } catch (error) {
    console.error(
      `Update Concept Map API error (ID: ${context.params.mapId}):`,
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
  context: { params: { mapId: string } }
) {
  try {
    const { mapId } = context.params;
    // const { userId } = getAuth(request as any); // Example
    // if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const { ownerId } = (await request.json()) as { ownerId: string }; // Client must send ownerId for auth check

    if (!mapId || !ownerId) {
      return NextResponse.json(
        { message: 'Map ID and owner ID are required' },
        { status: 400 }
      );
    }

    const deleted = await deleteConceptMap(mapId, ownerId); // Service handles ownership check
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
      `Delete Concept Map API error (ID: ${context.params.mapId}):`,
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
