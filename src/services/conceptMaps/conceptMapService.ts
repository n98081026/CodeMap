// src/services/conceptMaps/conceptMapService.ts
'use server';

/**
 * @fileOverview Concept Map service for handling concept map-related operations using Supabase.
 */

import type { ConceptMap, ConceptMapData } from '@/types';

import { BYPASS_AUTH_FOR_TESTING, MOCK_CONCEPT_MAPS_STORE } from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';
import { Json } from '@/types/supabase';

/**
 * Creates a new concept map.
 */
export async function createConceptMap(
  name: string,
  ownerId: string,
  mapData: ConceptMapData,
  isPublic: boolean,
  sharedWithClassroomId?: string | null
): Promise<ConceptMap> {
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
    console.warn(
      `BYPASS_AUTH: Mock map "${name}" created in-memory for this request only.`
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
  if (!data) throw new Error('Failed to create concept map: No data returned.');

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    mapData: data.map_data as unknown as ConceptMapData,
    isPublic: data.is_public,
    sharedWithClassroomId: data.shared_with_classroom_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retrieves a concept map by its ID.
 */
export async function getConceptMapById(
  mapId: string
): Promise<ConceptMap | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const foundMap = (MOCK_CONCEPT_MAPS_STORE || []).find(
      (m) => m && m.id === mapId
    );
    if (!foundMap) return null;
    // Return a well-formed map, even if mock data is partial
    return {
      id: foundMap.id,
      name: foundMap.name || 'Untitled Mock Map',
      ownerId: foundMap.ownerId || 'unknown-mock-owner',
      mapData: (foundMap.mapData as ConceptMapData) || { nodes: [], edges: [] },
      isPublic:
        typeof foundMap.isPublic === 'boolean' ? foundMap.isPublic : false,
      sharedWithClassroomId:
        foundMap.sharedWithClassroomId === undefined
          ? null
          : foundMap.sharedWithClassroomId,
      createdAt: foundMap.createdAt || new Date().toISOString(),
      updatedAt: foundMap.updatedAt || new Date().toISOString(),
    };
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
  if (!data) {
    return null;
  }
  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    mapData: (data.map_data as unknown as ConceptMapData) || {
      nodes: [],
      edges: [],
    },
    isPublic: data.is_public ?? false,
    sharedWithClassroomId: data.shared_with_classroom_id ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Retrieves all concept maps owned by a specific user.
 */
export async function getConceptMapsByOwnerId(
  ownerId: string,
  page?: number,
  limit?: number
): Promise<{ maps: ConceptMap[]; totalCount: number }> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const allMockMaps = MOCK_CONCEPT_MAPS_STORE || [];
    const userMaps = allMockMaps.filter((m) => {
      if (m && typeof m.ownerId === 'string') {
        return m.ownerId === ownerId;
      }
      console.warn(
        `[Mock Service] Skipping mock map due to missing/invalid ownerId:`,
        m
      );
      return false;
    });

    const totalCount = userMaps.length;
    let paginatedMaps = userMaps;

    if (page && limit && page > 0 && limit > 0) {
      paginatedMaps = userMaps.slice((page - 1) * limit, page * limit);
    }

    const mappedData = paginatedMaps.map((m) => ({
      // Ensure returned structure is complete
      id: m.id || `mock-map-id-${Date.now()}-${Math.random()}`,
      name: m.name || 'Untitled Mock Map',
      ownerId: m.ownerId,
      mapData: (m.mapData as ConceptMapData) || { nodes: [], edges: [] },
      isPublic: typeof m.isPublic === 'boolean' ? m.isPublic : false,
      sharedWithClassroomId:
        m.sharedWithClassroomId === undefined ? null : m.sharedWithClassroomId,
      createdAt: m.createdAt || new Date().toISOString(),
      updatedAt: m.updatedAt || new Date().toISOString(),
    }));
    return { maps: mappedData, totalCount };
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

  const mappedData = mapsData
    .map((m) => {
      if (!m) {
        console.error(
          '[Service Error] Encountered a null/undefined item in Supabase response for concept_maps. Skipping item.'
        );
        // This case should ideally not happen if the query is successful and returns data.
        // Depending on strictness, could throw or filter out. For now, let's be robust.
        return null;
      }
      if (typeof m.owner_id === 'undefined') {
        console.error(
          `[Service Error] Concept map row with id ${m.id} is missing 'owner_id'. Data:`,
          m
        );
        return null;
      }
      return {
        id: m.id,
        name: m.name,
        ownerId: m.owner_id,
        mapData: (m.map_data as unknown as ConceptMapData) || {
          nodes: [],
          edges: [],
        },
        isPublic: m.is_public ?? false,
        sharedWithClassroomId: m.shared_with_classroom_id ?? null,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };
    })
    .filter((m) => m !== null) as ConceptMap[]; // Filter out any nulls from mapping bad data

  return { maps: mappedData, totalCount };
}

/**
 * Retrieves all concept maps shared with a specific classroom.
 */
export async function getConceptMapsByClassroomId(
  classroomId: string,
  page?: number,
  limit?: number
): Promise<{ maps: ConceptMap[]; totalCount: number }> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const allMockMaps = MOCK_CONCEPT_MAPS_STORE || [];
    const classroomMaps = allMockMaps.filter((m) => {
      if (m && typeof m.sharedWithClassroomId === 'string') {
        return m.sharedWithClassroomId === classroomId;
      }
      return false;
    });

    const totalCount = classroomMaps.length;
    let paginatedMaps = classroomMaps;

    if (page && limit && page > 0 && limit > 0) {
      // For mock, sort by updatedAt before slicing to mimic typical DB order
      paginatedMaps = classroomMaps
        .sort(
          (a, b) =>
            new Date(b.updatedAt || 0).getTime() -
            new Date(a.updatedAt || 0).getTime()
        )
        .slice((page - 1) * limit, page * limit);
    }

    const mappedData = paginatedMaps.map((m) => ({
      // Ensure returned structure is complete
      id: m.id || `mock-classroom-map-id-${Date.now()}-${Math.random()}`,
      name: m.name || 'Untitled Mock Classroom Map',
      ownerId: m.ownerId || 'unknown-mock-owner',
      mapData: (m.mapData as ConceptMapData) || { nodes: [], edges: [] },
      isPublic: typeof m.isPublic === 'boolean' ? m.isPublic : false,
      sharedWithClassroomId: m.sharedWithClassroomId,
      createdAt: m.createdAt || new Date().toISOString(),
      updatedAt: m.updatedAt || new Date().toISOString(),
    }));
    return { maps: mappedData, totalCount };
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

  if (!mapsData) {
    return { maps: [], totalCount };
  }

  const mappedData = mapsData
    .map((m) => {
      if (!m) {
        console.error(
          '[Service Error] Encountered a null/undefined item in Supabase response for concept_maps (classroom). Skipping item.'
        );
        return null;
      }
      if (typeof m.owner_id === 'undefined') {
        console.error(
          `[Service Error] Concept map row with id ${m.id} (classroom) is missing 'owner_id'. Data:`,
          m
        );
        return null;
      }
      return {
        id: m.id,
        name: m.name,
        ownerId: m.owner_id,
        mapData: (m.map_data as unknown as ConceptMapData) || {
          nodes: [],
          edges: [],
        },
        isPublic: m.is_public ?? false,
        sharedWithClassroomId: m.shared_with_classroom_id ?? null,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };
    })
    .filter((m) => m !== null) as ConceptMap[];

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
    const index = MOCK_CONCEPT_MAPS_STORE.findIndex(
      (m) => m.id === mapId && m.ownerId === updates.ownerId
    );
    if (index === -1)
      throw new Error('BYPASS_AUTH: Map not found or owner mismatch.');
    const { ownerId, ...restOfUpdates } = updates;
    MOCK_CONCEPT_MAPS_STORE[index] = {
      ...MOCK_CONCEPT_MAPS_STORE[index],
      ...restOfUpdates,
      updatedAt: new Date().toISOString(),
    };
    return MOCK_CONCEPT_MAPS_STORE[index];
  }

  const mapToUpdate = await getConceptMapById(mapId);
  if (!mapToUpdate) {
    throw new Error('Concept map not found.');
  }

  if (mapToUpdate.ownerId !== updates.ownerId) {
    throw new Error('User not authorized to update this concept map.');
  }

  const supabaseUpdates: { [key: string]: any } = {};
  if (updates.name !== undefined) supabaseUpdates.name = updates.name;
  if (updates.mapData !== undefined)
    supabaseUpdates.map_data = updates.mapData as unknown as Json;
  if (updates.isPublic !== undefined)
    supabaseUpdates.is_public = updates.isPublic;
  if (Object.prototype.hasOwnProperty.call(updates, 'sharedWithClassroomId')) {
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
    .eq('owner_id', updates.ownerId)
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
    mapData: (data.map_data as unknown as ConceptMapData) || {
      nodes: [],
      edges: [],
    },
    isPublic: data.is_public ?? false,
    sharedWithClassroomId: data.shared_with_classroom_id ?? null,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Deletes a concept map.
 */
export async function deleteConceptMap(
  mapId: string,
  currentUserId: string
): Promise<boolean> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const initialLength = MOCK_CONCEPT_MAPS_STORE.length;
    const originalMaps = [...MOCK_CONCEPT_MAPS_STORE]; // Create a copy for modification
    const filteredMaps = originalMaps.filter(
      (m) => !(m.id === mapId && m.ownerId === currentUserId)
    );
    if (filteredMaps.length < originalMaps.length) {
      // This is tricky; MOCK_CONCEPT_MAPS_STORE is imported. Reassigning it here won't affect other modules using the original import.
      // For true mock deletion, the MOCK_CONCEPT_MAPS_STORE in config.ts would need to be mutable and operations would modify it directly.
      // This simplified version just checks if a deletion *would* occur.
      console.warn(
        `BYPASS_AUTH: Mock map delete for ${mapId} simulated. Actual MOCK_CONCEPT_MAPS_STORE in config.ts is not modified by this service.`
      );
      return true;
    }
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
