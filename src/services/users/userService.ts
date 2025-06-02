
// src/services/users/userService.ts
'use server';

/**
 * @fileOverview User service for handling user-related operations.
 *
 * - findUserByEmailAndRole - Finds a user by email and role.
 * - createUser - Creates a new user.
 * - getUserById - Retrieves a user by their ID.
 * - getAllUsers - Retrieves all users (with pagination).
 * - updateUser - Updates a user's details.
 * - deleteUser - Deletes a user.
 * - changeUserPassword - (Mock) Changes a user's password.
 */

import type { User } from '@/types';
import { UserRole } from '@/types';

// This is a mock database for demonstration purposes.
// Reduced to key users for leaner testing.
const testTeacher: User = { id: "teacher-test-id", email: "teacher-test@example.com", name: "Test Teacher", role: UserRole.TEACHER };
const testStudent: User = { id: "student-test-id", email: "student-test@example.com", name: "Test Student", role: UserRole.STUDENT };
const adminUser: User = { id: "admin1", email: "admin@example.com", name: "Admin User", role: UserRole.ADMIN };
const regularTeacher: User = { id: "teacher1", email: "teacher@example.com", name: "Teacher User", role: UserRole.TEACHER };
const regularStudent: User = { id: "student1", email: "student@example.com", name: "Student User", role: UserRole.STUDENT };


let mockUserDatabase: Record<string, User> = { // Use 'let' if you plan to modify it
  [adminUser.email]: adminUser,
  [regularTeacher.email]: regularTeacher,
  [regularStudent.email]: regularStudent,
  [testTeacher.email]: testTeacher,
  [testStudent.email]: testStudent,
  // Add one more unique student and teacher if needed for some classroom scenarios
  "student2@example.com": { id: "s2", email: "student2@example.com", name: "Student Two", role: UserRole.STUDENT },
  "teacher2@example.com": { id: "teacher2", email: "teacher2@example.com", name: "Ms. Script", role: UserRole.TEACHER },
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
    // password: password // We don't store actual passwords in this mock service
  };

  mockUserDatabase[email] = newUser; // Key by email for direct lookup
  return newUser;
}

export async function getUserById(userId: string): Promise<User | null> {
  const user = findUserByIdInternal(userId);
  return user || null;
}

export async function getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[]; totalCount: number }> {
  const allUsersArray = Object.values(mockUserDatabase);
  const totalCount = allUsersArray.length;

  // Sort users by name for consistent pagination
  allUsersArray.sort((a, b) => a.name.localeCompare(b.name));

  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedUsers = allUsersArray.slice(startIndex, endIndex);

  return { users: paginatedUsers, totalCount };
}

export async function updateUser(userId: string, updates: Partial<Omit<User, 'id' | 'password'>>): Promise<User | null> {
  const userIndex = Object.values(mockUserDatabase).findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return null; // User not found
  }
  
  const userEmailKey = Object.keys(mockUserDatabase).find(key => mockUserDatabase[key].id === userId);
  if (!userEmailKey) return null; // Should not happen if userIndex was found

  const user = mockUserDatabase[userEmailKey];

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
  if (oldEmailKey && oldEmailKey !== updatedUser.email) { // Check if email actually changed
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
  if (userId === "student-test-id" || userId === "teacher-test-id" || userId === "admin1") {
      throw new Error("Pre-defined test users and the main admin user cannot be deleted.");
  }

  // Remove user from mockUserDatabase (which is keyed by email)
  if (mockUserDatabase[userToDelete.email] && mockUserDatabase[userToDelete.email].id === userId) {
    delete mockUserDatabase[userToDelete.email];
    // Also remove any user keyed by ID if we were doing that, but we are not for this mock.
    return true;
  }
  return false; // Should not happen if user was found by ID
}


/**
 * (Mock) Changes a user's password.
 * In this mock, it checks if the currentPassword is 'password123'.
 * It does not actually store or change the password.
 * @param userId The ID of the user.
 * @param currentPassword The user's current password.
 * @param newPassword The new password to set.
 * @throws Error if user not found or current password incorrect.
 */
export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  const user = findUserByIdInternal(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  // Mock current password validation
  const MOCK_CURRENT_PASSWORD = "password123"; // For demo purposes
  if (currentPassword !== MOCK_CURRENT_PASSWORD) {
    throw new Error("Incorrect current password.");
  }

  // In a real application, you would hash the newPassword and save it.
  // For this mock, we do nothing with newPassword.
  console.log(`Mock password change for user ${userId}. New password would be: ${newPassword} (not stored).`);
  return Promise.resolve();
}
