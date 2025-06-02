// src/services/users/userService.ts
'use server';

/**
 * @fileOverview User service for handling user-related operations.
 *
 * - findUserByEmailAndRole - Finds a user by email and role.
 * - createUser - Creates a new user.
 * - getUserById - Retrieves a user by their ID.
 * - getAllUsers - Retrieves all users.
 * - updateUser - Updates a user's details.
 * - deleteUser - Deletes a user.
 */

import type { User } from '@/types';
import { UserRole } from '@/types';

// This is a mock database for demonstration purposes.
// In a real application, you would connect to a proper database.
const testTeacher: User = { id: "teacher-test-id", email: "teacher-test@example.com", name: "Test Teacher", role: UserRole.TEACHER };
const testStudent: User = { id: "student-test-id", email: "student-test@example.com", name: "Test Student", role: UserRole.STUDENT };

let mockUserDatabase: Record<string, User> = { // Use 'let' if you plan to modify it
  "student@example.com": { id: "student1", email: "student@example.com", name: "Student User", role: UserRole.STUDENT },
  "teacher@example.com": { id: "teacher1", email: "teacher@example.com", name: "Teacher User", role: UserRole.TEACHER },
  "admin@example.com": { id: "admin1", email: "admin@example.com", name: "Admin User", role: UserRole.ADMIN },
  [testTeacher.email]: testTeacher,
  [testStudent.email]: testStudent,
};

// Helper to find user by ID for internal use, as mockUserDatabase is keyed by email
function findUserByIdInternal(userId: string): User | undefined {
  return Object.values(mockUserDatabase).find(u => u.id === userId);
}


export async function findUserByEmailAndRole(email: string, role: UserRole): Promise<User | null> {
  const user = Object.values(mockUserDatabase).find(
    (u) => u.email === email && u.role === role
  );
  return user || null;
}

export async function createUser(name: string, email: string, password: string, role: UserRole): Promise<User> {
  // Check if any user exists with this email, regardless of role, to prevent email collision
  const existingUserWithEmail = Object.values(mockUserDatabase).find(u => u.email === email);
  if (existingUserWithEmail) {
    throw new Error("User already exists with this email address.");
  }

  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    email,
    name,
    role,
  };

  mockUserDatabase[email] = newUser; 
  return newUser;
}

export async function getUserById(userId: string): Promise<User | null> {
  const user = findUserByIdInternal(userId);
  return user || null;
}

export async function getAllUsers(): Promise<User[]> {
  return Object.values(mockUserDatabase);
}

export async function updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'password'>>): Promise<User | null> {
  const user = findUserByIdInternal(userId);
  if (!user) {
    return null; // User not found
  }

  // If email is being updated, we need to handle the key change in mockUserDatabase
  let oldEmailKey: string | null = null;
  if (updates.email && updates.email !== user.email) {
    const existingUserWithNewEmail = Object.values(mockUserDatabase).find(u => u.email === updates.email && u.id !== userId);
    if (existingUserWithNewEmail) {
      throw new Error("Another user already exists with this email address.");
    }
    oldEmailKey = user.email; // Store old email to remove it as key
  }
  
  // Apply updates
  const updatedUser = { ...user, ...updates };

  // Update mockUserDatabase
  if (oldEmailKey) {
    delete mockUserDatabase[oldEmailKey];
  }
  mockUserDatabase[updatedUser.email] = updatedUser; // Use new email as key if changed, or old one if not

  return updatedUser;
}

export async function deleteUser(userId: string): Promise<boolean> {
  const userToDelete = findUserByIdInternal(userId);
  if (!userToDelete) {
    return false; // User not found
  }

  // Cannot delete the pre-defined test student or test teacher for dev stability
  if (userId === "student-test-id" || userId === "teacher-test-id") {
      throw new Error("Cannot delete pre-defined test users.");
  }

  // Remove user from mockUserDatabase (which is keyed by email)
  if (mockUserDatabase[userToDelete.email] && mockUserDatabase[userToDelete.email].id === userId) {
    delete mockUserDatabase[userToDelete.email];
    return true;
  }
  return false; // Should not happen if user was found by ID
}
