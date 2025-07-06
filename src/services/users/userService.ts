// src/services/users/userService.ts
'use server';

/**
 * @fileOverview User service for handling user-related operations with Supabase 'profiles' table.
 */

import type { User } from '@/types';

import {
  BYPASS_AUTH_FOR_TESTING,
  MOCK_USERS,
  MOCK_STUDENT_USER,
  MOCK_TEACHER_USER,
  MOCK_ADMIN_USER,
} from '@/lib/config';
import { supabase } from '@/lib/supabaseClient';
import { UserRole } from '@/types';

/**
 * Creates a user profile in the 'profiles' table.
 * This should be called after a user signs up with Supabase Auth.
 * It assumes the Supabase Auth user ID is passed as `userId`.
 * It will also check if a profile already exists by ID or email to prevent duplicates.
 */
export async function createUserProfile(
  userId: string,
  name: string,
  email: string,
  role: UserRole
): Promise<User> {
  if (BYPASS_AUTH_FOR_TESTING) {
    console.warn(
      `BYPASS_AUTH: Simulating createUserProfile for ${email}. Data not persisted.`
    );
    const newUser: User = { id: userId, name, email, role };
    // Ensure not to duplicate if already in MOCK_USERS by ID or email
    if (!MOCK_USERS.find((u) => u.id === userId || u.email === email)) {
      MOCK_USERS.push(newUser);
    } else {
      const existingIndex = MOCK_USERS.findIndex((u) => u.id === userId);
      if (existingIndex !== -1) MOCK_USERS[existingIndex] = newUser; // Update if ID matches
    }
    return newUser;
  }

  // 1. Check if profile already exists for this userId
  const { data: existingById, error: errorById } = await supabase
    .from('profiles')
    .select('id, name, email, role') // Select all fields to return if found
    .eq('id', userId)
    .maybeSingle();

  if (errorById) {
    console.error('Error checking existing profile by ID:', errorById);
    throw new Error(`Failed to check existing profile: ${errorById.message}`);
  }
  if (existingById) {
    console.warn(
      `Profile for user ID ${userId} already exists. Returning existing profile.`
    );
    return existingById as User; // Cast to User type
  }

  // 2. Check if a profile already exists with this email (but different ID - should ideally not happen if RLS/triggers are correct)
  const { data: existingByEmail, error: errorByEmail } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .neq('id', userId) // Important: ensure it's not the same user if somehow ID check failed
    .maybeSingle();

  if (errorByEmail) {
    console.error('Error checking existing profile by email:', errorByEmail);
    throw new Error(
      `Failed to check existing profile by email: ${errorByEmail.message}`
    );
  }
  if (existingByEmail) {
    // This indicates an issue - an auth user was created but a profile with their email already exists under a different ID.
    console.error(
      `Critical: A profile with email ${email} already exists for user ID ${existingByEmail.id}, but trying to create for new user ID ${userId}.`
    );
    throw new Error(
      'A profile with this email address already exists for a different user account.'
    );
  }

  // 3. Create the new profile
  const { data: newProfileData, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: userId, // This MUST match the auth.users.id
      name,
      email,
      role,
      updated_at: new Date().toISOString(),
    })
    .select('id, name, email, role') // Select all necessary fields
    .single();

  if (insertError) {
    console.error('Supabase createUserProfile error:', insertError);
    throw new Error(`Failed to create user profile: ${insertError.message}`);
  }
  if (!newProfileData) {
    throw new Error(
      'Failed to create user profile: No data returned after insert.'
    );
  }

  return newProfileData as User;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return MOCK_USERS.find((u) => u.email === email) || null;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Supabase findUserByEmail error:', error);
    if (error.code === 'PGRST116') return null;
    throw new Error(`Error fetching user by email: ${error.message}`);
  }
  return data ? (data as User) : null;
}

export async function getUserById(userId: string): Promise<User | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return MOCK_USERS.find((u) => u.id === userId) || null;
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Supabase getUserById error:', error);
    throw new Error(
      `Error fetching profile for user ID ${userId}: ${error.message}`
    );
  }
  return data ? (data as User) : null;
}

export async function getAllUsers(
  page?: number,
  limit?: number,
  searchTerm?: string
): Promise<{ users: User[]; totalCount: number }> {
  if (BYPASS_AUTH_FOR_TESTING) {
    let filteredUsers = MOCK_USERS;
    if (searchTerm && searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.trim().toLowerCase();
      filteredUsers = MOCK_USERS.filter(
        (u) =>
          u.name.toLowerCase().includes(lowerSearchTerm) ||
          u.email.toLowerCase().includes(lowerSearchTerm)
      );
    }
    const totalCount = filteredUsers.length;
    const paginatedUsers =
      page && limit
        ? filteredUsers.slice((page - 1) * limit, page * limit)
        : filteredUsers;
    return { users: paginatedUsers, totalCount };
  }

  let query = supabase
    .from('profiles')
    .select('id, name, email, role', { count: 'exact' })
    .order('name', { ascending: true });

  if (searchTerm && searchTerm.trim() !== '') {
    const cleanedSearchTerm = searchTerm.trim().replace(/[%_]/g, '\\$&'); // Escape special characters
    query = query.or(
      `name.ilike.%${cleanedSearchTerm}%,email.ilike.%${cleanedSearchTerm}%`
    );
  }

  if (page && limit) {
    query = query.range((page - 1) * limit, page * limit - 1);
  }
  // If page and limit are not provided, the query fetches all matching users.

  const { data, error, count } = await query;

  if (error) {
    console.error('Supabase getAllUsers error:', error);
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return { users: (data || []) as User[], totalCount: count || 0 };
}

/**
 * Updates a user's profile in the 'profiles' table.
 * Does NOT update Supabase Auth user details (like login email or password).
 */
export async function updateUser(
  userId: string,
  updates: { name?: string; email?: string; role?: UserRole }
): Promise<User | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const userIndex = MOCK_USERS.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('Mock user not found for update.');

    const mockUserIdsToRestrict = [
      MOCK_ADMIN_USER.id,
      MOCK_STUDENT_USER.id,
      MOCK_TEACHER_USER.id,
    ];
    if (mockUserIdsToRestrict.includes(userId)) {
      if (updates.email && updates.email !== MOCK_USERS[userIndex].email) {
        throw new Error('Cannot change email for pre-defined mock users.');
      }
      if (updates.role && updates.role !== MOCK_USERS[userIndex].role) {
        throw new Error('Cannot change role for pre-defined mock users.');
      }
    }
    MOCK_USERS[userIndex] = { ...MOCK_USERS[userIndex], ...updates };
    return MOCK_USERS[userIndex];
  }

  const userToUpdate = await getUserById(userId);
  if (!userToUpdate) {
    throw new Error('User profile not found for update.');
  }

  const mockUserIds = ['admin-mock-id', 'student-test-id', 'teacher-test-id'];
  if (mockUserIds.includes(userId)) {
    if (updates.email && updates.email !== userToUpdate.email) {
      throw new Error('Cannot change email for pre-defined mock users.');
    }
    if (updates.role && updates.role !== userToUpdate.role) {
      throw new Error('Cannot change role for pre-defined mock users.');
    }
  }

  const profileUpdates: any = {};
  if (updates.name !== undefined && updates.name !== userToUpdate.name)
    profileUpdates.name = updates.name;
  if (updates.role !== undefined && updates.role !== userToUpdate.role)
    profileUpdates.role = updates.role;

  if (updates.email && updates.email !== userToUpdate.email) {
    const { data: existingByEmail, error: emailCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', updates.email)
      .neq('id', userId)
      .maybeSingle();

    if (emailCheckError) {
      console.error(
        'Supabase email check error during update:',
        emailCheckError
      );
      throw new Error(
        `Error checking for existing email: ${emailCheckError.message}`
      );
    }
    if (existingByEmail) {
      throw new Error(
        'Another user profile already exists with this email address.'
      );
    }
    profileUpdates.email = updates.email;
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

/**
 * Deletes a user's profile from the 'profiles' table.
 * Does NOT delete the Supabase Auth user. This should be handled separately,
 * possibly via Supabase dashboard or admin SDK if cascade isn't set up.
 */
export async function deleteUser(userId: string): Promise<boolean> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const mockUserIdsToRestrict = [
      MOCK_ADMIN_USER.id,
      MOCK_STUDENT_USER.id,
      MOCK_TEACHER_USER.id,
    ];
    if (mockUserIdsToRestrict.includes(userId)) {
      throw new Error('Pre-defined test user profiles cannot be deleted.');
    }
    const initialLength = MOCK_USERS.length;
    MOCK_USERS = MOCK_USERS.filter((u) => u.id !== userId);
    return MOCK_USERS.length < initialLength;
  }

  const mockUserIds = ['admin-mock-id', 'student-test-id', 'teacher-test-id'];
  if (mockUserIds.includes(userId)) {
    throw new Error('Pre-defined test user profiles cannot be deleted.');
  }

  const { error, count } = await supabase
    .from('profiles')
    .delete({ count: 'exact' }) // Ensure we get a count of deleted rows
    .eq('id', userId);

  if (error) {
    console.error('Supabase deleteUserProfile error:', error);
    throw new Error(`Failed to delete user profile: ${error.message}`);
  }

  if (count === 0) {
    console.warn(
      `No profile found for user ID ${userId} to delete, or RLS prevented deletion.`
    );
    return false;
  }

  console.log(
    `Profile for user ${userId} deleted. Associated auth.users entry needs separate handling if not cascaded.`
  );
  return true;
}
