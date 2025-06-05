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
    // Profile already exists, perhaps created by a trigger. Fetch and return it.
    const existingProfile = await getUserById(userId);
    if (existingProfile) return existingProfile;
    // If it exists by ID but getUserById fails, that's an issue.
    throw new Error("A profile for this user ID exists but could not be fetched.");
  }
  
  // Check for existing profile by email only if ID check didn't find one
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
      updated_at: new Date().toISOString(), // Supabase typically handles created_at/updated_at via default values or triggers
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
    // Don't throw for not found, just return null
    if (error.code === 'PGRST116') return null; // PGRST116: "Query returned no rows"
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

  if (error && error.code !== 'PGRST116') {
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
    throw new Error("User profile not found for update.");
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
      console.error('Supabase email check error during update:', emailCheckError);
      throw new Error(`Error checking for existing email: ${emailCheckError.message}`);
    }
    if (existingByEmail) {
      throw new Error("Another user profile already exists with this email address.");
    }
    profileUpdates.email = updates.email;
    console.warn(`Profile email for user ${userId} updated to ${updates.email}. This does NOT change the Supabase Auth email. Ensure Supabase Auth email is updated separately if needed.`);
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
  // Protect mock users from deletion via service for safety during testing
  const mockUserIds = ["admin-mock-id", "student-test-id", "teacher-test-id"];
  if (mockUserIds.includes(userId)) {
      throw new Error("Pre-defined test user profiles cannot be deleted through this service.");
  }
  
  const { error: profileDeleteError, count: profileDeleteCount } = await supabase
    .from('profiles')
    .delete({ count: 'exact' })
    .eq('id', userId);

  if (profileDeleteError) {
    console.error('Supabase deleteUserProfile error:', profileDeleteError);
    throw new Error(`Failed to delete user profile: ${profileDeleteError.message}`);
  }
  
  // Deleting the Supabase Auth user typically requires admin privileges and is a separate operation.
  // This service only handles the 'profiles' table.
  // console.warn(`Profile for user ${userId} deleted. Deleting the auth.users entry requires admin privileges and must be handled separately if not cascaded.`);
  
  if (profileDeleteCount === 0) {
    console.warn(`No profile found for user ID ${userId} to delete, or RLS prevented deletion.`);
    return false; // Indicate no profile row was deleted
  }

  return true;
}