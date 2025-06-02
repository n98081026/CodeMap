
// src/services/conceptMaps/conceptMapService.ts
'use server';

/**
 * @fileOverview Concept Map service for handling concept map-related operations.
 */

import type { ConceptMap, ConceptMapData } from '@/types';
import { getUserById } from '@/services/users/userService'; // To validate ownerId

// Mock data for concept maps - reduced to a few key entries
let mockConceptMapsData: ConceptMap[] = [
  { id: "mapA", name: "My First Project Overview", ownerId: "student-test-id", mapData: { nodes: [{id: "n1", text: "Main Feature", type: "feature", x: 50, y: 50}, {id: "n2", text: "User Login", type: "auth", x: 250, y: 150}], edges: [{id:"e1", source: "n1", target: "n2", label: "requires"}] }, isPublic: false, createdAt: new Date("2023-03-01T10:00:00Z").toISOString(), updatedAt: new Date("2023-03-02T11:00:00Z").toISOString() },
  { id: "mapD_class1", name: "Shared Prog Concepts", ownerId: "student1", mapData: { nodes: [{id: "n1", text: "Loops", type: "concept"}], edges: [] }, isPublic: false, sharedWithClassroomId: "class1", createdAt: new Date("2023-04-01T09:00:00Z").toISOString(), updatedAt: new Date("2023-04-01T09:00:00Z").toISOString() },
  { id: "mapE_test_classroom", name: "AI Basics for Test Class", ownerId: "student-test-id", mapData: { nodes: [{id:"n1", text:"Neural Network", type:"model"}], edges: [] }, isPublic: false, sharedWithClassroomId: "test-classroom-1", createdAt: new Date("2023-04-02T09:00:00Z").toISOString(), updatedAt: new Date("2023-04-02T09:00:00Z").toISOString() },
];

/**
 * Creates a new concept map.
 * @param name The name of the concept map.
 * @param ownerId The ID of the user who owns the map.
 * @param mapData The actual concept map data (nodes, edges).
 * @param isPublic Whether the map is public.
 * @param sharedWithClassroomId Optional classroom ID if shared.
 * @returns The newly created concept map object.
 */
export async function createConceptMap(
  name: string,
  ownerId: string,
  mapData: ConceptMapData,
  isPublic: boolean,
  sharedWithClassroomId?: string | null
): Promise<ConceptMap> {
  const owner = await getUserById(ownerId);
  if (!owner) {
    throw new Error("Invalid owner ID. User does not exist.");
  }

  const now = new Date().toISOString();
  const newMap: ConceptMap = {
    id: `map-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    name,
    ownerId,
    mapData: mapData || { nodes: [], edges: [] }, // Ensure mapData is initialized
    isPublic,
    sharedWithClassroomId: sharedWithClassroomId || null,
    createdAt: now,
    updatedAt: now,
  };
  mockConceptMapsData.push(newMap);
  return newMap;
}

/**
 * Retrieves a concept map by its ID.
 * @param mapId The ID of the concept map.
 * @returns The concept map object if found, otherwise null.
 */
export async function getConceptMapById(mapId: string): Promise<ConceptMap | null> {
  const map = mockConceptMapsData.find(m => m.id === mapId);
  return map || null;
}

/**
 * Retrieves all concept maps owned by a specific user.
 * @param ownerId The ID of the owner.
 * @returns A list of concept maps.
 */
export async function getConceptMapsByOwnerId(ownerId: string): Promise<ConceptMap[]> {
  return mockConceptMapsData.filter(m => m.ownerId === ownerId);
}

/**
 * Retrieves all concept maps shared with a specific classroom.
 * @param classroomId The ID of the classroom.
 * @returns A list of concept maps.
 */
export async function getConceptMapsByClassroomId(classroomId: string): Promise<ConceptMap[]> {
    return mockConceptMapsData.filter(m => m.sharedWithClassroomId === classroomId);
}


/**
 * Updates an existing concept map.
 * @param mapId The ID of the concept map to update.
 * @param updates An object containing the fields to update.
 * @returns The updated concept map object or null if not found.
 */
export async function updateConceptMap(mapId: string, updates: Partial<Omit<ConceptMap, 'id' | 'ownerId' | 'createdAt'>>): Promise<ConceptMap | null> {
  const mapIndex = mockConceptMapsData.findIndex(m => m.id === mapId);
  if (mapIndex === -1) {
    return null;
  }
  
  const currentMap = mockConceptMapsData[mapIndex];
  
  // Ensure ownerId is not part of 'updates' to prevent changing ownership this way
  const { ownerId: newOwnerId, ...validUpdates } = updates as any;
  if (newOwnerId && newOwnerId !== currentMap.ownerId) {
    // This check should ideally be more robust or handled by auth layer
    console.warn("Attempt to change map ownerId via updateConceptMap was ignored.");
  }


  mockConceptMapsData[mapIndex] = {
    ...currentMap,
    ...validUpdates, // Apply only valid updates
    mapData: validUpdates.mapData || currentMap.mapData, // Ensure mapData is preserved or updated
    updatedAt: new Date().toISOString(),
  };
  return mockConceptMapsData[mapIndex];
}

/**
 * Deletes a concept map.
 * @param mapId The ID of the concept map to delete.
 * @param ownerId The ID of the user attempting to delete, for ownership verification.
 * @returns True if deleted successfully, false otherwise.
 * @throws Error if user is not authorized to delete.
 */
export async function deleteConceptMap(mapId: string, ownerId: string): Promise<boolean> {
  const mapIndex = mockConceptMapsData.findIndex(m => m.id === mapId);
  if (mapIndex === -1) {
    return false; // Map not found
  }
  if (mockConceptMapsData[mapIndex].ownerId !== ownerId) {
    throw new Error("User not authorized to delete this concept map.");
  }
  mockConceptMapsData.splice(mapIndex, 1);
  return true;
}

    
