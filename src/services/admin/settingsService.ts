// src/services/admin/settingsService.ts
'use server';

/**
 * @fileOverview System Settings service for handling global app settings using Supabase.
 */

import type { SystemSettings } from '@/types';
import { supabase } from '@/lib/supabaseClient';

const SETTINGS_ROW_ID = '00000000-0000-0000-0000-000000000001'; 

const defaultSettings: SystemSettings = {
  enable_ai_project_analysis: true,
  default_concept_map_visibility: "private",
  max_project_file_size_mb: 10,
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('enable_ai_project_analysis, default_concept_map_visibility, max_project_file_size_mb')
    .eq('id', SETTINGS_ROW_ID)
    .maybeSingle(); 

  if (error) {
    console.error('Supabase getSystemSettings error:', error);
  }

  if (data) {
    return {
        enable_ai_project_analysis: data.enable_ai_project_analysis,
        default_concept_map_visibility: data.default_concept_map_visibility as "public" | "private",
        max_project_file_size_mb: data.max_project_file_size_mb,
    };
  }
  
  console.warn("No system settings found in database, returning default values. Creating an initial settings row with defaults.");
  // If no settings row, try to create it with defaults. This ensures one always exists after first call.
  try {
    const { data: insertedData, error: insertError } = await supabase
      .from('system_settings')
      .insert({
        id: SETTINGS_ROW_ID,
        ...defaultSettings,
        updated_at: new Date().toISOString(),
      })
      .select('enable_ai_project_analysis, default_concept_map_visibility, max_project_file_size_mb')
      .single();
    
    if (insertError) {
        console.error('Failed to insert default system settings:', insertError);
        return defaultSettings; // Return defaults if insert fails
    }
    if(insertedData) {
        return {
            enable_ai_project_analysis: insertedData.enable_ai_project_analysis,
            default_concept_map_visibility: insertedData.default_concept_map_visibility as "public" | "private",
            max_project_file_size_mb: insertedData.max_project_file_size_mb,
        };
    }
  } catch (e) {
    console.error('Unexpected error during initial settings creation:', e);
  }
  return defaultSettings; // Fallback to defaults
}


export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const updatesToApply = {
    id: SETTINGS_ROW_ID, 
    ...settings,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('system_settings')
    .upsert(updatesToApply, { onConflict: 'id' }) 
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