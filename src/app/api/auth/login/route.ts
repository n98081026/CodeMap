// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { findUserByEmailAndRole } from '@/services/users/userService';
import type { UserRole } from '@/types';


export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json() as { email: string; password?: string; role: UserRole };

    if (!email || !role) {
      return NextResponse.json({ message: "Email and role are required" }, { status: 400 });
    }
    // Password is included in the request but not used for validation in this mock service
    // In a real app, the service would handle password verification.

    const userToLogin = await findUserByEmailAndRole(email, role);

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
