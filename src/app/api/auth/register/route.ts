// This file is no longer needed as registration is handled by AuthContext using Supabase client.
// The creation of a 'profiles' table entry post-signup should be handled by a Supabase Function trigger
// or a separate API endpoint called after successful Supabase signup.
// This file can be safely deleted.
// To prevent build errors if it's still imported somewhere, returning a 404.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({ message: "This register endpoint is deprecated. Use Supabase client-side authentication and a separate mechanism for profile creation." }, { status: 404 });
}
