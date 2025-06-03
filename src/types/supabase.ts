// src/types/supabase.ts

/**
 * This file is a placeholder for your Supabase database types.
 *
 * 1. Make sure you have the Supabase CLI installed and logged in:
 *    - `npm install supabase --save-dev` (if not already done)
 *    - `npx supabase login`
 *
 * 2. Define your database schema in the Supabase dashboard or via migrations.
 *    Ensure you have tables like 'profiles', 'classrooms', 'concept_maps', etc.
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
  | Json[]

// Placeholder Database interface.
// Replace this with the auto-generated types from Supabase CLI.
export interface Database {
  public: {
    Tables: {
      // Example:
      // profiles: {
      //   Row: {
      //     id: string
      //     updated_at: string | null
      //     username: string | null
      //     avatar_url: string | null
      //     website: string | null
      //     role: string // Assuming 'student', 'teacher', 'admin'
      //     full_name: string | null
      //   }
      //   Insert: {
      //     id: string
      //     updated_at?: string | null
      //     username?: string | null
      //     avatar_url?: string | null
      //     website?: string | null
      //     role: string
      //     full_name?: string | null
      //   }
      //   Update: {
      //     id?: string
      //     updated_at?: string | null
      //     username?: string | null
      //     avatar_url?: string | null
      //     website?: string | null
      //     role?: string
      //     full_name?: string | null
      //   }
      //   Relationships: [
      //     {
      //       foreignKeyName: "profiles_id_fkey"
      //       columns: ["id"]
      //       referencedRelation: "users"
      //       referencedColumns: ["id"]
      //     }
      //   ]
      // }
      profiles: {
        Row: any
        Insert: any
        Update: any
        Relationships: any
      }
      classrooms: {
        Row: any
        Insert: any
        Update: any
        Relationships: any
      }
      classroom_students: {
        Row: any
        Insert: any
        Update: any
        Relationships: any
      }
      concept_maps: {
        Row: any
        Insert: any
        Update: any
        Relationships: any
      }
      project_submissions: {
        Row: any
        Insert: any
        Update: any
        Relationships: any
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role_enum: "student" | "teacher" | "admin" // Example enum
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
