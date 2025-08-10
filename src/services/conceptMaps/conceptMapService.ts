// src/services/conceptMaps/conceptMapService.ts
'use server';

/**
 * @fileOverview Concept Map service for handling concept map-related operations using Supabase.
 */

import type { ConceptMap, ConceptMapData } from '@/types';

import { BYPASS_AUTH_FOR_TESTING } from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';
import { Database, Json } from '@/types/supabase';

type DbConceptMap = Database['public']['Tables']['concept_maps']['Row'];

function dbConceptMapToConceptMap(dbMap: DbConceptMap | null): ConceptMap | null {
  if (!dbMap) {
    return null;
  }
  if (!dbMap.owner_id) {
    throw new Error(`Concept map with id ${dbMap.id} has no owner.`);
  }
  return {
    id: dbMap.id,
    name: dbMap.name,
    ownerId: dbMap.owner_id,
    mapData: (dbMap.map_data as unknown as ConceptMapData) || {
      nodes: [],
      edges: [],
    },
    isPublic: dbMap.is_public ?? false,
    sharedWithClassroomId: dbMap.shared_with_classroom_id ?? null,
    createdAt: dbMap.created_at,
    updatedAt: dbMap.updated_at || dbMap.created_at,
  };
}

/**
 * Creates a new concept map.
 */
export async function createConceptMap(
  name: string,
  ownerId: string,
  mapData: ConceptMapData,
  isPublic: boolean,
  sharedWithClassroomId?: string | null
): Promise<ConceptMap | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const newMap: ConceptMap = {
      id: `map-bypass-${Date.now()}`,
      name,
      ownerId,
      mapData: mapData || { nodes: [], edges: [] },
      isPublic,
      sharedWithClassroomId: sharedWithClassroomId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // MOCK_CONCEPT_MAPS_STORE.push(newMap);
    console.warn(
      `BYPASS_AUTH: Mock map "${name}" created and saved.`
    );
    return newMap;
  }

  const owner = await getUserById(ownerId);
  if (!owner) {
    throw new Error('Invalid owner ID. User does not exist.');
  }

  const { data, error } = await supabase
    .from('concept_maps')
    .insert({
      name,
      owner_id: ownerId,
      map_data: (mapData || { nodes: [], edges: [] }) as unknown as Json,
      is_public: isPublic,
      shared_with_classroom_id: sharedWithClassroomId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase createConceptMap error:', error);
    throw new Error(`Failed to create concept map: ${error.message}`);
  }

  return dbConceptMapToConceptMap(data);
}

/**
 * Retrieves a concept map by its ID.
 */
export async function getConceptMapById(
  mapId: string
): Promise<ConceptMap | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return null;
  }

  const { data, error } = await supabase
    .from('concept_maps')
    .select('*')
    .eq('id', mapId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase getConceptMapById error:', error);
    throw new Error(`Error fetching concept map: ${error.message}`);
  }

  return dbConceptMapToConceptMap(data);
}

/**
 * Retrieves all concept maps owned by a specific user.
 */
export async function getConceptMapsByOwnerId(
  ownerId: string,
  page?: number,
  limit?: number
): Promise<{ maps: (ConceptMap | null)[]; totalCount: number }> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return { maps: [], totalCount: 0 };
  }

  // Fetch total count
  const { count, error: countError } = await supabase
    .from('concept_maps')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId);

  if (countError) {
    console.error(
      '[Service Error] Supabase getConceptMapsByOwnerId count error:',
      countError
    );
    throw new Error(
      `Failed to fetch concept map count for owner: ${countError.message}`
    );
  }
  const totalCount = count || 0;

  // Fetch paginated maps
  let mapsQuery = supabase
    .from('concept_maps')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });

  if (page && limit && page > 0 && limit > 0) {
    mapsQuery = mapsQuery.range((page - 1) * limit, page * limit - 1);
  }

  const { data: mapsData, error: mapsError } = await mapsQuery;

  if (mapsError) {
    console.error(
      '[Service Error] Supabase getConceptMapsByOwnerId maps error:',
      mapsError
    );
    throw new Error(
      `Failed to fetch concept maps for owner: ${mapsError.message}`
    );
  }

  if (!mapsData) {
    return { maps: [], totalCount };
  }

  const mappedData = (mapsData || []).map(dbConceptMapToConceptMap);
  return { maps: mappedData, totalCount };
}

/**
 * Retrieves all concept maps shared with a specific classroom.
 */
export async function getConceptMapsByClassroomId(
  classroomId: string,
  page?: number,
  limit?: number
): Promise<{ maps: (ConceptMap | null)[]; totalCount: number }> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return { maps: [], totalCount: 0 };
  }

  // Fetch total count
  const { count, error: countError } = await supabase
    .from('concept_maps')
    .select('*', { count: 'exact', head: true })
    .eq('shared_with_classroom_id', classroomId);

  if (countError) {
    console.error(
      '[Service Error] Supabase getConceptMapsByClassroomId count error:',
      countError
    );
    throw new Error(
      `Failed to count concept maps for classroom: ${countError.message}`
    );
  }
  const totalCount = count || 0;

  // Fetch paginated maps
  let mapsQuery = supabase
    .from('concept_maps')
    .select('*')
    .eq('shared_with_classroom_id', classroomId)
    .order('updated_at', { ascending: false });

  if (page && limit && page > 0 && limit > 0) {
    mapsQuery = mapsQuery.range((page - 1) * limit, page * limit - 1);
  }

  const { data: mapsData, error: mapsError } = await mapsQuery;

  if (mapsError) {
    console.error(
      '[Service Error] Supabase getConceptMapsByClassroomId maps error:',
      mapsError
    );
    throw new Error(
      `Failed to fetch concept maps for classroom: ${mapsError.message}`
    );
  }

  const mappedData = (mapsData || []).map(dbConceptMapToConceptMap);
  return { maps: mappedData, totalCount };
}

/**
 * Updates an existing concept map.
 */
export async function updateConceptMap(
  mapId: string,
  updates: Partial<
    Omit<ConceptMap, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>
  > & { ownerId: string }
): Promise<ConceptMap | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return null;
  }

  const mapToUpdate = await getConceptMapById(mapId);
  if (!mapToUpdate) {
    throw new Error('Concept map not found.');
  }

  if (mapToUpdate.ownerId !== updates.ownerId) {
    throw new Error('User not authorized to update this concept map.');
  }

  const supabaseUpdates: Partial<DbConceptMap> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.name !== undefined) supabaseUpdates.name = updates.name;
  if (updates.mapData !== undefined)
    supabaseUpdates.map_data = updates.mapData as unknown as Json;
  if (updates.isPublic !== undefined)
    supabaseUpdates.is_public = updates.isPublic;
  if (Object.prototype.hasOwnProperty.call(updates, 'sharedWithClassroomId')) {
    supabaseUpdates.shared_with_classroom_id = updates.sharedWithClassroomId;
  }

  if (Object.keys(supabaseUpdates).length <= 1) {
    return mapToUpdate;
  }

  const { data, error } = await supabase
    .from('concept_maps')
    .update(supabaseUpdates)
    .eq('id', mapId)
    .eq('owner_id', updates.ownerId)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateConceptMap error:', error);
    throw new Error(`Failed to update concept map: ${error.message}`);
  }

  return dbConceptMapToConceptMap(data);
}

/**
 * Deletes a concept map.
 */
export async function deleteConceptMap(
  mapId: string,
  currentUserId: string
): Promise<boolean> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return false;
  }

  const mapToDelete = await getConceptMapById(mapId);
  if (!mapToDelete) {
    throw new Error('Concept map not found.');
  }
  if (mapToDelete.ownerId !== currentUserId) {
    throw new Error('User not authorized to delete this concept map.');
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
    // This could happen if RLS prevents deletion even if owner_id matches, or map was deleted concurrently.
    console.warn(
      `Attempted to delete map ${mapId} for user ${currentUserId}, but no rows were affected. Might be RLS or concurrent deletion.`
    );
    return false;
  }
  return true;
}
