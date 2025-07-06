// src/types/supabase.ts

/**
 * This file is a placeholder for your Supabase database types.
 *
 * YOU MUST GENERATE THIS FILE USING THE SUPABASE CLI.
 *
 * 1. Make sure you have the Supabase CLI installed and logged in:
 *    - `npm install supabase --save-dev` (if not already done)
 *    - `npx supabase login`
 *
 * 2. Define your database schema in the Supabase dashboard or via migrations.
 *    Ensure you have tables like:
 *      - `profiles` (columns: id (uuid, PK, references auth.users.id), name (text), email (text, unique), role (user_role_enum), created_at, updated_at)
 *      - `classrooms` (columns: id (uuid, PK), name (text), description (text, nullable), teacher_id (uuid, FK to profiles.id), invite_code (text, unique), subject (text, nullable), difficulty (text, nullable), enable_student_ai_analysis (boolean, default true), created_at, updated_at)
 *      - `classroom_students` (columns: classroom_id (uuid, PK, FK to classrooms.id), student_id (uuid, PK, FK to profiles.id), created_at)
 *      - `concept_maps` (columns: id (uuid, PK), name (text), owner_id (uuid, FK to profiles.id), map_data (jsonb), is_public (boolean), shared_with_classroom_id (uuid, nullable, FK to classrooms.id), created_at, updated_at)
 *      - `project_submissions` (columns: id (uuid, PK), student_id (uuid, FK to profiles.id), classroom_id (uuid, nullable, FK to classrooms.id), original_file_name (text), file_size (integer), file_storage_path (text, nullable), submission_timestamp (timestamptz), analysis_status (text), analysis_error (text, nullable), generated_concept_map_id (uuid, nullable, FK to concept_maps.id), created_at, updated_at)
 *      - `system_settings` (columns: id (uuid, PK, default '00000000-0000-0000-0000-000000000001'), enable_ai_project_analysis (boolean, default true), default_concept_map_visibility (text, default 'private'), max_project_file_size_mb (integer, default 10), updated_at (timestamptz))
 *    And an enum type `user_role_enum` (values: 'student', 'teacher', 'admin').
 *
 * 3. Run the following command in your project root to generate the types:
 *    npx supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts
 *
 *    Replace `<your-project-id>` with your actual Supabase project ID.
 *    This will overwrite this file with the correct types.
 *
 * For more details, see: https://supabase.com/docs/guides/api/generating-types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// This is a minimal placeholder to allow the app to compile.
// Replace with your actual generated types.
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          role: 'student' | 'teacher' | 'admin';
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          role: 'student' | 'teacher' | 'admin';
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          role?: 'student' | 'teacher' | 'admin';
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      classrooms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          teacher_id: string;
          invite_code: string;
          subject: string | null;
          difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
          enable_student_ai_analysis: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          teacher_id: string;
          invite_code: string;
          subject?: string | null;
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
          enable_student_ai_analysis?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          teacher_id?: string;
          invite_code?: string;
          subject?: string | null;
          difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
          enable_student_ai_analysis?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'classrooms_teacher_id_fkey';
            columns: ['teacher_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      classroom_students: {
        Row: {
          classroom_id: string;
          student_id: string;
          created_at: string;
        };
        Insert: {
          classroom_id: string;
          student_id: string;
          created_at?: string;
        };
        Update: {
          classroom_id?: string;
          student_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'classroom_students_classroom_id_fkey';
            columns: ['classroom_id'];
            referencedRelation: 'classrooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classroom_students_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      concept_maps: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          map_data: Json; // ConceptMapData
          is_public: boolean;
          shared_with_classroom_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          map_data: Json;
          is_public?: boolean;
          shared_with_classroom_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          map_data?: Json;
          is_public?: boolean;
          shared_with_classroom_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'concept_maps_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'concept_maps_shared_with_classroom_id_fkey';
            columns: ['shared_with_classroom_id'];
            referencedRelation: 'classrooms';
            referencedColumns: ['id'];
          },
        ];
      };
      project_submissions: {
        Row: {
          id: string;
          student_id: string;
          classroom_id: string | null;
          original_file_name: string;
          file_size: number;
          file_storage_path: string | null;
          submission_timestamp: string;
          analysis_status: string; // ProjectSubmissionStatus enum
          analysis_error: string | null;
          generated_concept_map_id: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          student_id: string;
          classroom_id?: string | null;
          original_file_name: string;
          file_size: number;
          file_storage_path?: string | null;
          submission_timestamp?: string;
          analysis_status: string;
          analysis_error?: string | null;
          generated_concept_map_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          student_id?: string;
          classroom_id?: string | null;
          original_file_name?: string;
          file_size?: number;
          file_storage_path?: string | null;
          submission_timestamp?: string;
          analysis_status?: string;
          analysis_error?: string | null;
          generated_concept_map_id?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'project_submissions_student_id_fkey';
            columns: ['student_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_submissions_classroom_id_fkey';
            columns: ['classroom_id'];
            referencedRelation: 'classrooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_submissions_generated_concept_map_id_fkey';
            columns: ['generated_concept_map_id'];
            referencedRelation: 'concept_maps';
            referencedColumns: ['id'];
          },
        ];
      };
      system_settings: {
        Row: {
          id: string;
          enable_ai_project_analysis: boolean;
          default_concept_map_visibility: string; // "public" | "private"
          max_project_file_size_mb: number;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          enable_ai_project_analysis?: boolean;
          default_concept_map_visibility?: string;
          max_project_file_size_mb?: number;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          enable_ai_project_analysis?: boolean;
          default_concept_map_visibility?: string;
          max_project_file_size_mb?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role_enum: 'student' | 'teacher' | 'admin';
      project_submission_status_enum:
        | 'pending'
        | 'queued'
        | 'processing'
        | 'completed'
        | 'failed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
