
import { NextResponse } from 'next/server';
import type { User } from '@/types';
import { UserRole } from '@/types'; // Assuming UserRole is defined in your types

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


export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json();

    // Basic validation
    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: "Name, email, password, and role are required" }, { status: 400 });
    }

    if (mockUserDatabase[email]) {
      return NextResponse.json({ message: "User already exists with this email" }, { status: 409 });
    }

    // In a real app, you would hash the password before saving
    const newUser: User = { 
      id: `user-${Date.now()}-${Math.random().toString(36).substring(7)}`, 
      email, 
      name, 
      role 
    };
    
    mockUserDatabase[email] = newUser; // Add to our in-memory "DB"

    // In a real app, you'd save to DB and typically generate a token/session
    // and set it in a cookie or return it. For now, just return the user.
    return NextResponse.json({ user: newUser, message: "Registration successful" }, { status: 201 });

  } catch (error) {
    console.error("Register API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: "An unexpected error occurred during registration: " + errorMessage }, { status: 500 });
  }
}
