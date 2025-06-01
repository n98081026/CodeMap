// src/services/conceptMaps/conceptMapService.ts
'use server';

/**
 * @fileOverview Concept Map service for handling concept map-related operations.
 */

import type { ConceptMap, ConceptMapData } from '@/types';
import { getUserById } from '@/services/users/userService'; // To validate ownerId

// Mock data for concept maps
let mockConceptMapsData: ConceptMap[] = [
  { id: "mapA", name: "My First Project Overview", ownerId: "student-test-id", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: new Date("2023-03-01T10:00:00Z").toISOString(), updatedAt: new Date("2023-03-02T11:00:00Z").toISOString() },
  { id: "mapB", name: "Algorithm Study Notes", ownerId: "student-test-id", mapData: { nodes: [], edges: [] }, isPublic: true, sharedWithClassroomId: "class1", createdAt: new Date("2023-03-05T14:00:00Z").toISOString(), updatedAt: new Date("2023-03-08T15:00:00Z").toISOString() },
  { id: "mapC", name: "Database Design Ideas", ownerId: "student1", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: new Date("2023-03-10T09:00:00Z").toISOString(), updatedAt: new Date("2023-03-10T09:00:00Z").toISOString() },
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
    mapData,
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
  
  // Prevent changing ownerId or createdAt through this method
  const { ownerId, createdAt, id, ...restUpdates } = updates as any;


  mockConceptMapsData[mapIndex] = {
    ...mockConceptMapsData[mapIndex],
    ...restUpdates,
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

// For admin or classroom views (potentially)
export async function getConceptMapsByClassroomId(classroomId: string): Promise<ConceptMap[]> {
    return mockConceptMapsData.filter(m => m.sharedWithClassroomId === classroomId);
}
