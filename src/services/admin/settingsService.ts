
// src/services/admin/settingsService.ts
'use server';

/**
 * @fileOverview System Settings service for handling global app settings using Supabase.
 */

import type { SystemSettings } from '@/types';
import { supabase } from '@/lib/supabaseClient';

// Define a fixed ID for the single row in system_settings table
const SETTINGS_ROW_ID = '00000000-0000-0000-0000-000000000001'; // Example fixed UUID

const defaultSettings: SystemSettings = {
  enable_ai_project_analysis: true,
  default_concept_map_visibility: "private",
  max_project_file_size_mb: 10,
};

/**
 * Retrieves the system settings.
 * If no settings row exists, it returns default settings (but does not create the row).
 * @returns The system settings object or default settings if none found.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('enable_ai_project_analysis, default_concept_map_visibility, max_project_file_size_mb')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle(); // Use maybeSingle as the row might not exist initially

  if (error) {
    console.error('Supabase getSystemSettings error:', error);
    // For critical settings, you might want to throw, but for now, log and return defaults
    // throw new Error(`Failed to fetch system settings: ${error.message}`);
  }

  if (data) {
    return {
        enable_ai_project_analysis: data.enable_ai_project_analysis,
        default_concept_map_visibility: data.default_concept_map_visibility as "public" | "private",
        max_project_file_size_mb: data.max_project_file_size_mb,
    };
  }
  
  console.warn("No system settings found in database, returning default values. Consider creating an initial settings row.");
  return defaultSettings;
}

/**
 * Updates (or inserts if not exists - upserts) the system settings.
 * @param settings The settings object to save.
 * @returns The updated system settings object.
 */
export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const updatesToApply = {
    id: SETTINGS_ROW_ID, // Ensure the fixed ID is used for upsert
    ...settings,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert(updatesToApply, { onConflict: 'id' }) // Upsert based on the ID
    .select('enable_ai_project_analysis, default_concept_map_visibility, max_project_file_size_mb')
    .single();

  if (error) {
    console.error('Supabase updateSystemSettings error:', error);
    throw new Error(`Failed to update system settings: ${error.message}`);
  }
  if (!data) {
    throw new Error("Failed to update system settings: No data returned after upsert.");
  }

  return {
    enable_ai_project_analysis: data.enable_ai_project_analysis,
    default_concept_map_visibility: data.default_concept_map_visibility as "public" | "private",
    max_project_file_size_mb: data.max_project_file_size_mb,
  };
}

// Example of how you might initialize settings if the table is empty (run once manually or via a script)
// export async function initializeDefaultSettings(): Promise<void> {
//   const existing = await getSystemSettings();
//   if (existing && existing.id === SETTINGS_ROW_ID) { // Check if already initialized via some property
//     console.log("System settings already initialized.");
//     return;
//   }
//   console.log("Initializing default system settings...");
//   await updateSystemSettings(defaultSettings); // This will insert if not present
//   console.log("Default system settings initialized.");
// }
