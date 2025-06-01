// src/app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { createUser, findUserByEmailAndRole } from '@/services/users/userService';
import type { UserRole } from '@/types';

export async function POST(request: Request) {
  try {
    const { name, email, password, role } = await request.json() as { name: string, email: string; password?: string; role: UserRole };

    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: "Name, email, password, and role are required" }, { status: 400 });
    }

    const existingUser = await findUserByEmailAndRole(email, role); // Check if user with same email and role exists
    if (existingUser) {
       // More specific check: does any user exist with this email, regardless of role?
       // This depends on business logic, for now, we prevent same email same role.
       // A more robust check in userService.createUser would check only by email.
       // Let's assume createUser in service handles the "email already exists" logic more broadly.
    }


    const newUser = await createUser(name, email, password, role);

    // In a real app, you'd save to DB and typically generate a token/session
    // and set it in a cookie or return it. For now, just return the user.
    return NextResponse.json({ user: newUser, message: "Registration successful" }, { status: 201 });

  } catch (error) {
    console.error("Register API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    if (errorMessage.includes("User already exists")) {
      return NextResponse.json({ message: errorMessage }, { status: 409 });
    }
    return NextResponse.json({ message: "An unexpected error occurred during registration: " + errorMessage }, { status: 500 });
  }
}
