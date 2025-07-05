// src/app/api/auth/login/route.ts
// This file is no longer needed as login is handled by AuthContext using Supabase client-side.
// It can be safely deleted.
// To prevent build errors if it's still imported somewhere, returning a 404.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json(
    {
      message:
        'This login endpoint is deprecated. Use Supabase client-side authentication via AuthContext.',
    },
    { status: 404 }
  );
}
