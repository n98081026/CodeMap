
// src/services/users/userService.ts
'use server';

/**
 * @fileOverview User service for handling user-related operations with Supabase.
 */

import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient'; 

export async function createUserProfile(userId: string, name: string, email: string, role: UserRole): Promise<User> {
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

export async function getUserById(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId) 
    .maybeSingle();

  if (error && error.code !== 'PGRST116') { // PGRST116: "Query returned no rows"
    console.error('Supabase getUserById error:', error);
    throw new Error(`Error fetching profile: ${error.message}`);
  }
  if (!data) {
    return null;
  }
  return data as User;
}

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

export async function updateUser(userId: string, updates: { name?: string; email?: string; role?: UserRole }): Promise<User | null> {
  const userToUpdate = await getUserById(userId);
  if (!userToUpdate) {
    return null; 
  }
  
  const profileUpdates: any = {};
  if (updates.name !== undefined && updates.name !== userToUpdate.name) profileUpdates.name = updates.name;
  if (updates.role !== undefined && updates.role !== userToUpdate.role) profileUpdates.role = updates.role;

  if (updates.email && updates.email !== userToUpdate.email) {
    // Check if the new email is already taken by another profile
    const { data: existingByEmail, error: emailCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', updates.email)
      .neq('id', userId) 
      .maybeSingle();

    if (emailCheckError) {
      console.error('Supabase email check error during update:', emailCheckError);
      throw new Error(`Error checking for existing email: ${emailCheckError.message}`);
    }
    if (existingByEmail) {
      throw new Error("Another user profile already exists with this email address.");
    }
    profileUpdates.email = updates.email;
    // IMPORTANT: This only updates the 'profiles.email'.
    // To update the Supabase Auth email, you must use `supabase.auth.updateUser({ email: newEmail })`
    // which typically involves an email confirmation flow. This service does NOT handle that.
    // The AuthContext or Profile page should coordinate this if full auth email change is desired.
    console.warn(`Profile email for user ${userId} updated to ${updates.email}. Auth email remains unchanged.`);
  }


  if (Object.keys(profileUpdates).length === 0) {
    return userToUpdate; 
  }
  
  profileUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', userId)
    .select('id, name, email, role')
    .single();

  if (error) {
    console.error('Supabase updateUser profile error:', error);
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
  return data as User;
}

export async function deleteUser(userId: string): Promise<boolean> {
  if (userId === "student-test-id" || userId === "teacher-test-id" || userId === "admin-mock-id") {
      throw new Error("Pre-defined test user profiles cannot be deleted through this service.");
  }
  
  // First, delete from 'profiles' table
  const { error: profileDeleteError, count: profileDeleteCount } = await supabase
    .from('profiles')
    .delete({ count: 'exact' })
    .eq('id', userId);

  if (profileDeleteError) {
    console.error('Supabase deleteUserProfile error:', profileDeleteError);
    throw new Error(`Failed to delete user profile: ${profileDeleteError.message}`);
  }
  if (profileDeleteCount === 0) {
    console.warn(`Profile for user ${userId} not found for deletion or already deleted.`);
    // Depending on desired behavior, you might still want to try deleting the auth user
    // or return false / throw error. For now, let's proceed to auth user deletion attempt.
  }

  // Then, delete from 'auth.users' table (requires service_role key or admin privileges)
  // This part is tricky as frontend Supabase client usually doesn't have rights to delete other auth users.
  // This should ideally be handled by a Supabase Edge Function with service_role key.
  // For now, this will likely fail if not called with sufficient privileges.
  // console.warn(`Attempting to delete auth user ${userId}. This requires admin privileges or a service_role key setup.`);
  // const { error: authUserDeleteError } = await supabase.auth.admin.deleteUser(userId); // This needs Admin API
  // if (authUserDeleteError) {
  //   console.error(`Supabase deleteAuthUser error for ${userId}:`, authUserDeleteError);
  //   // If profile was deleted but auth user wasn't, we have an orphaned auth user.
  //   // This is a serious issue that needs proper handling in a production app.
  //   throw new Error(`Failed to delete auth user (profile may have been deleted): ${authUserDeleteError.message}`);
  // }
  console.log(`Profile for user ${userId} deleted. Associated auth.users entry deletion should be handled by an admin process if not automatically cascaded by DB policies.`);


  return true; // Returns true if profile deletion was successful or profile was not found.
}
