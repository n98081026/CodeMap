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
 * This function should be called after a user is created in `auth.users` via Supabase Auth.
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
    .select('*')
    .eq('id', userId)
    .single();

  if (errorById && errorById.code !== 'PGRST116') { // PGRST116: "Query returned no rows" - this is OK
    console.error('Error checking existing profile by ID:', errorById);
    throw new Error(`Failed to check existing profile: ${errorById.message}`);
  }
  if (existingById) {
    throw new Error("A profile for this user ID already exists.");
  }
  
  // Check if a profile with this email already exists (should ideally be caught by auth.users unique email constraint too)
  // but good to double check if creating profiles separately.
  const { data: existingByEmail, error: errorByEmail } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();
  
  if (errorByEmail && errorByEmail.code !== 'PGRST116') {
    console.error('Error checking existing profile by email:', errorByEmail);
    throw new Error(`Failed to check existing profile by email: ${errorByEmail.message}`);
  }
  if (existingByEmail) {
     throw new Error("A profile with this email address already exists.");
  }


  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId, // This is the FK to auth.users.id
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
  
  // Supabase returns the row from the 'profiles' table.
  // We need to ensure it matches our User type.
  // The 'id' from profiles is the auth user id.
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: data.role as UserRole, // Assuming 'role' column in profiles matches UserRole enum
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
    .select('*')
    .eq('email', email)
    .single(); // Use single() if email is unique in profiles

  if (error && error.code !== 'PGRST116') { // PGRST116: "Query returned no rows"
    console.error('Supabase findUserByEmail error:', error);
    throw new Error(`Error fetching user by email: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return data as User; // Assuming columns match User type
}

/**
 * Retrieves a user profile by their ID (auth.users.id).
 * @param userId The ID of the user.
 * @returns The user profile object or null if not found.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId) // 'id' in profiles table is the FK to auth.users.id
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase getUserById error:', error);
    // Don't throw, just return null as per original mock behavior if not found
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
    .select('*', { count: 'exact' })
    .order('name', { ascending: true })
    .range((page - 1) * limit, page * limit - 1);

  if (error) {
    console.error('Supabase getAllUsers error:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  
  return { users: (data || []) as User[], totalCount: count || 0 };
}

/**
 * Updates a user's profile details.
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

  // If email is being updated, it's more complex with Supabase Auth.
  // 1. Update in Supabase Auth: supabase.auth.updateUser({ email: newEmail })
  // 2. Then update in 'profiles' table.
  // This service currently only handles 'profiles' table update for name/role.
  // Email change via this service without coordinating with Supabase Auth is risky.
  // For now, we'll focus on name/role updates in profiles.
  
  const profileUpdates: any = {};
  if (updates.name !== undefined) profileUpdates.name = updates.name;
  if (updates.role !== undefined) profileUpdates.role = updates.role;

  // If email update is attempted here, it should also be updated in auth.users
  // This example only updates the profiles table directly for name/role.
  // A full email update would involve `supabase.auth.updateUser({ email: updates.email })`
  // and ensuring RLS allows the 'profiles.email' update or using a service_role key.
  if (updates.email && updates.email !== userToUpdate.email) {
    // Check for email collision in profiles table if email is part of updates
    const { data: existingByEmail, error: emailCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', updates.email)
      .neq('id', userId) // Exclude the current user from the check
      .single();

    if (emailCheckError && emailCheckError.code !== 'PGRST116') {
      console.error('Supabase email check error:', emailCheckError);
      throw new Error(`Error checking for existing email: ${emailCheckError.message}`);
    }
    if (existingByEmail) {
      throw new Error("Another user profile already exists with this email address.");
    }
    profileUpdates.email = updates.email;
    // IMPORTANT: This only updates the profiles table email.
    // The actual auth.users email MUST be updated via supabase.auth.updateUser()
    // This is usually done client-side by the logged-in user for their own email.
  }


  if (Object.keys(profileUpdates).length === 0) {
    return userToUpdate; // No changes to apply to profiles table
  }
  
  profileUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Supabase updateUser error:', error);
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
  return data as User;
}

/**
 * Deletes a user's profile.
 * IMPORTANT: This only deletes from the 'profiles' table.
 * Deleting from `auth.users` requires admin privileges and `supabase.auth.admin.deleteUser()`.
 * @param userId The ID of the user whose profile to delete.
 * @returns True if profile deleted, false otherwise.
 */
export async function deleteUserProfile(userId: string): Promise<boolean> {
   // Basic protection against deleting critical test users
  if (userId === "student-test-id" || userId === "teacher-test-id" || userId === "admin1") {
      throw new Error("Pre-defined test user profiles cannot be deleted through this service.");
  }
  
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Supabase deleteUserProfile error:', error);
    // Don't throw if simply not found, mimic old behavior of returning false
    if (error.code === 'PGRST116' || error.code === '22P02') { // No rows, or invalid input (user ID not UUID format)
        return false;
    }
    throw new Error(`Failed to delete user profile: ${error.message}`);
  }
  // Supabase delete returns data if `select()` is used, but here error being null means success
  return true;
}


/**
 * Changes a user's password using Supabase Auth.
 * This function must be called by an authenticated user for themselves.
 * @param newPassword The new password.
 * @throws Error if password change fails.
 */
export async function changeUserPassword(newPassword: string): Promise<void> {
  // This call is client-side, Supabase handles current user context
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase changeUserPassword error:', error);
    // Provide more specific error messages based on Supabase error codes if needed
    if (error.message.includes("same as the old password")) {
        throw new Error("New password must be different from the old password.");
    }
    if (error.message.includes("weak password")) {
        throw new Error("Password is too weak. Please choose a stronger password.");
    }
    throw new Error(`Failed to change password: ${error.message}`);
  }
  // Password changed successfully. `data.user` contains the updated user object from auth.
}
