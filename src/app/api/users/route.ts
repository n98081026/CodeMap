// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers } from '@/services/users/userService';

export async function GET(request: Request) {
  try {
    // TODO: Add authentication and authorization checks here to ensure only admins can access this.
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
      return NextResponse.json({ message: "Invalid page or limit parameters" }, { status: 400 });
    }

    const { users, totalCount } = await getAllUsers(page, limit);
    return NextResponse.json({ users, totalCount });

  } catch (error) {
    console.error("Get All Users API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: "Failed to fetch users: " + errorMessage }, { status: 500 });
  }
}
```