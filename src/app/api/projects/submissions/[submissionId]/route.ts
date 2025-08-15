import { NextResponse } from 'next/server';

// Simplified for debugging the build
export async function GET() {
  return NextResponse.json({ message: 'OK' });
}

export async function PUT() {
  return NextResponse.json({ message: 'OK' });
}
