// src/app/api/auth/register/route.ts
// This file is no longer needed as registration is handled by AuthContext using Supabase client-side.
// The creation of a 'profiles' table entry post-signup should be handled by a Supabase Function trigger
// or the AuthContext's register method calling the userService.
// This file can be safely deleted.
// To prevent build errors if it's still imported somewhere, returning a 404.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({ message: "This register endpoint is deprecated. Use Supabase client-side authentication via AuthContext, which also handles profile creation." }, { status: 404 });
}