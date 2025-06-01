
import { NextResponse } from 'next/server';
import type { User } from '@/types';
import { UserRole } from '@/types';

// This is a mock database for demonstration purposes.
// In a real application, you would connect to a proper database.
const testTeacher: User = { id: "teacher-test-id", email: "teacher-test@example.com", name: "Test Teacher", role: UserRole.TEACHER };
const testStudent: User = { id: "student-test-id", email: "student-test@example.com", name: "Test Student", role: UserRole.STUDENT };

const mockUserDatabase: Record<string, User> = {
  "student@example.com": { id: "student1", email: "student@example.com", name: "Student User", role: UserRole.STUDENT },
  "teacher@example.com": { id: "teacher1", email: "teacher@example.com", name: "Teacher User", role: UserRole.TEACHER },
  "admin@example.com": { id: "admin1", email: "admin@example.com", name: "Admin User", role: UserRole.ADMIN },
  [testTeacher.email]: testTeacher,
  [testStudent.email]: testStudent,
};

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();

    // Basic validation
    if (!email || !role) {
      return NextResponse.json({ message: "Email and role are required" }, { status: 400 });
    }
    // Password is included in the request but not used for validation in this mock
    // In a real app, you would hash the incoming password and compare it to a stored hash.

    const userToLogin = Object.values(mockUserDatabase).find(
      (u) => u.email === email && u.role === role
    );

    if (userToLogin) {
      // In a real app, you would generate a JWT or session token here
      // and set it in a cookie or return it in the response.
      return NextResponse.json({ user: userToLogin, message: "Login successful" });
    } else {
      return NextResponse.json({ message: "Invalid email, password, or role" }, { status: 401 });
    }
  } catch (error) {
    console.error("Login API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: "An unexpected error occurred during login: " + errorMessage }, { status: 500 });
  }
}
