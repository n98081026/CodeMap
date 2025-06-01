// src/app/api/concept-maps/route.ts
import { NextResponse } from 'next/server';
import { createConceptMap, getConceptMapsByOwnerId } from '@/services/conceptMaps/conceptMapService';
import type { ConceptMapData } from '@/types';
// import { getAuth } from '@clerk/nextjs/server'; // Placeholder for actual auth

export async function POST(request: Request) {
  try {
    // In a real app, get ownerId from authenticated session
    // const { userId: ownerId } = getAuth(request as any); // Example with Clerk
    // if (!ownerId) {
    //   return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    // }
    const { name, ownerId, mapData, isPublic, sharedWithClassroomId } = await request.json() as {
      name: string;
      ownerId: string; // For now, client must send ownerId
      mapData: ConceptMapData;
      isPublic: boolean;
      sharedWithClassroomId?: string | null;
    };

    if (!name || !ownerId || !mapData) {
      return NextResponse.json({ message: "Name, ownerId, and mapData are required" }, { status: 400 });
    }

    const newMap = await createConceptMap(name, ownerId, mapData, isPublic, sharedWithClassroomId);
    return NextResponse.json(newMap, { status: 201 });

  } catch (error) {
    console.error("Create Concept Map API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to create concept map: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('ownerId');
    // const classroomId = searchParams.get('classroomId'); // Future use

    // In a real app, you might restrict this based on logged-in user or roles
    // For now, if ownerId is provided, fetch by ownerId
    if (ownerId) {
      const maps = await getConceptMapsByOwnerId(ownerId);
      return NextResponse.json(maps);
    }
    // Add more conditions, e.g., if (classroomId) { ... }
    // Or require authentication to list maps for the logged-in user.

    return NextResponse.json({ message: "Query parameter 'ownerId' is required for now." }, { status: 400 });

  } catch (error) {
    console.error("Get Concept Maps API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch concept maps: ${errorMessage}` }, { status: 500 });
  }
}
