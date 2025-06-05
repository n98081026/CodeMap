// src/services/conceptMaps/conceptMapService.ts
'use server';

/**
 * @fileOverview Concept Map service for handling concept map-related operations using Supabase.
 */

import type { ConceptMap, ConceptMapData } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService'; // To validate ownerId

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

  const { data, error } = await supabase
    .from('concept_maps')
    .insert({
      name,
      owner_id: ownerId,
      map_data: mapData || { nodes: [], edges: [] }, 
      is_public: isPublic,
      shared_with_classroom_id: sharedWithClassroomId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase createConceptMap error:', error);
    throw new Error(`Failed to create concept map: ${error.message}`);
  }
  if (!data) throw new Error("Failed to create concept map: No data returned.");

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    mapData: data.map_data as ConceptMapData,
    isPublic: data.is_public,
    sharedWithClassroomId: data.shared_with_classroom_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retrieves a concept map by its ID.
 * @param mapId The ID of the concept map.
 * @returns The concept map object if found, otherwise null.
 */
export async function getConceptMapById(mapId: string): Promise<ConceptMap | null> {
  const { data, error } = await supabase
    .from('concept_maps')
    .select('*')
    .eq('id', mapId)
    .single();

  if (error && error.code !== 'PGRST116') { 
    console.error('Supabase getConceptMapById error:', error);
    throw new Error(`Error fetching concept map: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    mapData: data.map_data as ConceptMapData,
    isPublic: data.is_public,
    sharedWithClassroomId: data.shared_with_classroom_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retrieves all concept maps owned by a specific user.
 * @param ownerId The ID of the owner.
 * @returns A list of concept maps.
 */
export async function getConceptMapsByOwnerId(ownerId: string): Promise<ConceptMap[]> {
  const { data, error } = await supabase
    .from('concept_maps')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Supabase getConceptMapsByOwnerId error:', error);
    throw new Error(`Failed to fetch concept maps for owner: ${error.message}`);
  }
  return (data || []).map(m => ({
    id: m.id,
    name: m.name,
    ownerId: m.owner_id,
    mapData: m.map_data as ConceptMapData,
    isPublic: m.is_public,
    sharedWithClassroomId: m.shared_with_classroom_id,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));
}

/**
 * Retrieves all concept maps shared with a specific classroom.
 * @param classroomId The ID of the classroom.
 * @returns A list of concept maps.
 */
export async function getConceptMapsByClassroomId(classroomId: string): Promise<ConceptMap[]> {
  const { data, error } = await supabase
    .from('concept_maps')
    .select('*')
    .eq('shared_with_classroom_id', classroomId)
    .order('updated_at', { ascending: false });
  
  if (error) {
    console.error('Supabase getConceptMapsByClassroomId error:', error);
    throw new Error(`Failed to fetch concept maps for classroom: ${error.message}`);
  }
  return (data || []).map(m => ({
    id: m.id,
    name: m.name,
    ownerId: m.owner_id,
    mapData: m.map_data as ConceptMapData,
    isPublic: m.is_public,
    sharedWithClassroomId: m.shared_with_classroom_id,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }));
}


/**
 * Updates an existing concept map.
 * The 'ownerId' in updates is used for authorization check here.
 * @param mapId The ID of the concept map to update.
 * @param updates An object containing the fields to update, including ownerId for auth.
 * @returns The updated concept map object or null if not found or not authorized.
 * @throws Error if the user is not authorized or update fails.
 */
export async function updateConceptMap(
  mapId: string, 
  updates: Partial<Omit<ConceptMap, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>> & { ownerId: string } // ownerId is required in updates for auth
): Promise<ConceptMap | null> {
  
  const mapToUpdate = await getConceptMapById(mapId);
  if (!mapToUpdate) {
    throw new Error("Concept map not found.");
  }

  if (mapToUpdate.ownerId !== updates.ownerId) {
    throw new Error("User not authorized to update this concept map.");
  }
  
  const supabaseUpdates: any = {};
  if (updates.name !== undefined) supabaseUpdates.name = updates.name;
  if (updates.mapData !== undefined) supabaseUpdates.map_data = updates.mapData;
  if (updates.isPublic !== undefined) supabaseUpdates.is_public = updates.isPublic;
  if (updates.hasOwnProperty('sharedWithClassroomId')) {
    supabaseUpdates.shared_with_classroom_id = updates.sharedWithClassroomId;
  }
  
  if (Object.keys(supabaseUpdates).length === 0) {
    return mapToUpdate; 
  }
  supabaseUpdates.updated_at = new Date().toISOString();


  const { data, error } = await supabase
    .from('concept_maps')
    .update(supabaseUpdates)
    .eq('id', mapId)
    .eq('owner_id', updates.ownerId) // Ensure only owner can update
    .select()
    .single();

  if (error) {
    console.error('Supabase updateConceptMap error:', error);
    throw new Error(`Failed to update concept map: ${error.message}`);
  }
  if (!data) return null; 

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    mapData: data.map_data as ConceptMapData,
    isPublic: data.is_public,
    sharedWithClassroomId: data.shared_with_classroom_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Deletes a concept map.
 * @param mapId The ID of the concept map to delete.
 * @param currentUserId The ID of the user attempting to delete, for ownership verification.
 * @returns True if deleted successfully.
 * @throws Error if map not found or user is not authorized to delete.
 */
export async function deleteConceptMap(mapId: string, currentUserId: string): Promise<boolean> {
  const mapToDelete = await getConceptMapById(mapId);
  if (!mapToDelete) {
    throw new Error("Concept map not found.");
  }
  if (mapToDelete.ownerId !== currentUserId) {
    throw new Error("User not authorized to delete this concept map.");
  }

  const { error, count } = await supabase
    .from('concept_maps')
    .delete({ count: 'exact' }) 
    .eq('id', mapId)
    .eq('owner_id', currentUserId); 

  if (error) {
    console.error('Supabase deleteConceptMap error:', error);
    throw new Error(`Failed to delete concept map: ${error.message}`);
  }
  if (count === 0) {
    throw new Error("Failed to delete concept map: Map not found (owned by this user) or RLS prevented deletion.");
  }
  return true;
}