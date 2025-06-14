// src/app/api/concept-maps/route.ts
import { NextResponse } from 'next/server';
import { createConceptMap, getConceptMapsByOwnerId, getConceptMapsByClassroomId } from '@/services/conceptMaps/conceptMapService';
import type { ConceptMapData } from '@/types';

export async function POST(request: Request) {
  try {
    const { name, ownerId, mapData, isPublic, sharedWithClassroomId } = await request.json() as {
      name: string;
      ownerId: string; 
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
    const classroomId = searchParams.get('classroomId');

    if (classroomId) {
      const maps = await getConceptMapsByClassroomId(classroomId);
      return NextResponse.json(maps);
    }
    
    if (ownerId) {
      const maps = await getConceptMapsByOwnerId(ownerId);
      return NextResponse.json(maps);
    }

    // If neither ownerId nor classroomId is provided, it's an invalid request for this endpoint.
    // Admin might have a separate endpoint or flag for getting all maps.
    return NextResponse.json({ message: "Query parameter 'ownerId' or 'classroomId' is required to list concept maps." }, { status: 400 });

  } catch (error) {
    console.error("Get Concept Maps API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch concept maps: ${errorMessage}` }, { status: 500 });
  }
}