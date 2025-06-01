// src/services/users/userService.ts
'use server';

/**
 * @fileOverview User service for handling user-related operations.
 *
 * - findUserByEmailAndRole - Finds a user by email and role.
 * - createUser - Creates a new user.
 * - getUserById - Retrieves a user by their ID.
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

/**
 * Finds a user by their email and role.
 * @param email The user's email.
 * @param role The user's role.
 * @returns The user object if found, otherwise null.
 */
export async function findUserByEmailAndRole(email: string, role: UserRole): Promise<User | null> {
  // Password validation would happen here in a real app
  const user = Object.values(mockUserDatabase).find(
    (u) => u.email === email && u.role === role
  );
  return user || null;
}

/**
 * Creates a new user.
 * @param name The user's name.
 * @param email The user's email.
 * @param password The user's password (in a real app, this would be hashed).
 * @param role The user's role.
 * @returns The newly created user object.
 * @throws Error if a user with the given email already exists.
 */
export async function createUser(name: string, email: string, password: string, role: UserRole): Promise<User> {
  if (mockUserDatabase[email]) {
    throw new Error("User already exists with this email");
  }

  // In a real app, you would hash the password before saving
  const newUser: User = {
    id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    email,
    name,
    role,
  };

  mockUserDatabase[email] = newUser; // Add to our in-memory "DB"
  return newUser;
}

/**
 * Retrieves a user by their ID.
 * @param userId The ID of the user to retrieve.
 * @returns The user object if found, otherwise null.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const user = Object.values(mockUserDatabase).find(u => u.id === userId);
  return user || null;
}

// Function to get the mock user database (for potential admin/testing purposes)
export async function getAllUsers(): Promise<User[]> {
  return Object.values(mockUserDatabase);
}
