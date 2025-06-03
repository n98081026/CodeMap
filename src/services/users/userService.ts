// src/services/users/userService.ts
'use server';

/**
 * @fileOverview User service for handling user-related operations with Supabase.
 */

import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client

// Note: The 'profiles' table structure is assumed based on src/types/supabase.ts placeholder
// and general Supabase setup. Ensure your 'profiles' table has:
// - id (uuid, primary key, foreign key to auth.users.id)
// - email (text, unique)
// - name (text)
// - role (user_role_enum or text)
// - created_at (timestamp with timezone, default now())
// - updated_at (timestamp with timezone, default now())


/**
 * Creates a profile for an existing authenticated user.
 * This function should be called after a user is created in `auth.users` via Supabase Auth,
 * typically by a Supabase Database Function (trigger on auth.users insert).
 * @param userId The ID from `auth.users.id`.
 * @param name The user's full name.
 * @param email The user's email.
 * @param role The user's role.
 * @returns The newly created profile object.
 * @throws Error if profile creation fails or if a profile with this email/ID already exists.
 */
export async function createUserProfile(userId: string, name: string, email: string, role: UserRole): Promise<User> {
  // Check if a profile for this auth user ID already exists
  const { data: existingById, error: errorById } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (errorById) { 
    console.error('Error checking existing profile by ID:', errorById);
    throw new Error(`Failed to check existing profile: ${errorById.message}`);
  }
  if (existingById) {
    throw new Error("A profile for this user ID already exists.");
  }
  
  // Check if a profile with this email already exists
  const { data: existingByEmail, error: errorByEmail } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  
  if (errorByEmail) {
    console.error('Error checking existing profile by email:', errorByEmail);
    throw new Error(`Failed to check existing profile by email: ${errorByEmail.message}`);
  }
  if (existingByEmail) {
     throw new Error("A profile with this email address already exists.");
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId, 
      name,
      email,
      role,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Supabase createUserProfile error:", error);
    throw new Error(`Failed to create user profile: ${error.message}`);
  }
  if (!data) {
    throw new Error("Failed to create user profile: No data returned.");
  }
  
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role as UserRole, 
  };
}


/**
 * Finds a user profile by email.
 * @param email The email of the user.
 * @returns The user profile object or null if not found.
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('email', email)
    .maybeSingle(); 

  if (error) { 
    console.error('Supabase findUserByEmail error:', error);
    throw new Error(`Error fetching user by email: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return data as User;
}

/**
 * Retrieves a user profile by their ID (auth.users.id).
 * @param userId The ID of the user.
 * @returns The user profile object or null if not found.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId) 
    .maybeSingle();

  if (error) {
    console.error('Supabase getUserById error:', error);
  }
  if (!data) {
    return null;
  }
  return data as User;
}

/**
 * Retrieves all user profiles with pagination.
 * @param page Page number (1-indexed).
 * @param limit Number of users per page.
 * @returns Paginated list of users and total count.
 */
export async function getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[]; totalCount: number }> {
  const { data, error, count } = await supabase
    .from('profiles')
    .select('id, name, email, role', { count: 'exact' })
    .order('name', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error('Supabase getAllUsers error:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  return { users: (data || []) as User[], totalCount: count || 0 };
}

/**
 * Updates a user's profile details in the 'profiles' table.
 * Note: Updating email in 'auth.users' requires supabase.auth.updateUser() and is handled separately.
 * @param userId The ID of the user to update.
 * @param updates Partial user data (name, email, role).
 * @returns The updated user profile object or null if not found.
 * @throws Error if update fails (e.g., email conflict).
 */
export async function updateUser(userId: string, updates: { name?: string; email?: string; role?: UserRole }): Promise<User | null> {
  const userToUpdate = await getUserById(userId);
  if (!userToUpdate) {
    return null; // User not found
  }
  
  const profileUpdates: any = {};
  if (updates.name !== undefined && updates.name !== userToUpdate.name) profileUpdates.name = updates.name;
  if (updates.role !== undefined && updates.role !== userToUpdate.role) profileUpdates.role = updates.role;

  if (updates.email && updates.email !== userToUpdate.email) {
    const { data: existingByEmail, error: emailCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', updates.email)
      .neq('id', userId) 
      .maybeSingle();

    if (emailCheckError) {
      console.error('Supabase email check error:', emailCheckError);
      throw new Error(`Error checking for existing email: ${emailCheckError.message}`);
    }
    if (existingByEmail) {
      throw new Error("Another user profile already exists with this email address.");
    }
    profileUpdates.email = updates.email;
    // Reminder: This only updates profiles.email. auth.users.email must be updated via supabase.auth.updateUser().
  }


  if (Object.keys(profileUpdates).length === 0) {
    return userToUpdate; // No changes to apply to profiles table
  }
  
  profileUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId)
    .select('id, name, email, role')
    .single();

  if (error) {
    console.error('Supabase updateUser error:', error);
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
  return data as User;
}

/**
 * Deletes a user's profile from the 'profiles' table.
 * IMPORTANT: This does NOT delete the user from `auth.users`.
 * That requires `supabase.auth.admin.deleteUser()` with admin privileges.
 * @param userId The ID of the user whose profile to delete.
 * @returns True if profile deleted.
 * @throws Error if deletion fails or user is a predefined test user.
 */
export async function deleteUser(userId: string): Promise<boolean> {
  if (userId === "student-test-id" || userId === "teacher-test-id" || userId === "admin-mock-id") {
      throw new Error("Pre-defined test user profiles cannot be deleted through this service.");
  }
  
  const { error, count } = await supabase
    .from('profiles')
    .delete({ count: 'exact' })
    .eq('id', userId);

  if (error) {
    console.error('Supabase deleteUserProfile error:', error);
    throw new Error(`Failed to delete user profile: ${error.message}`);
  }
  if (count === 0) {
    // Consider if this should be an error or just return false if profile didn't exist.
    // For consistency with previous mock, returning false might be okay, or throw "Profile not found".
    // Let's throw for clarity in a Supabase context.
    throw new Error("Profile not found or already deleted.");
  }
  return true;
}
