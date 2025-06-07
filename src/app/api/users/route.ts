
// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { getAllUsers } from '@/services/users/userService';

export async function GET(request: Request) {
  try {
    // TODO: Add authentication and authorization checks here to ensure only admins can access this.
    
    const { searchParams } = new URL(request.url);
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const searchTerm = searchParams.get('search') || undefined;

    // If page and limit are not provided, service layer should handle fetching all users.
    // The service function getAllUsers itself needs to be adapted to handle optional pagination.
    // For now, we assume the service will fetch all if page/limit are undefined.
    const page = pageParam ? parseInt(pageParam, 10) : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    if ((page !== undefined && (isNaN(page) || page < 1)) || (limit !== undefined && (isNaN(limit) || limit < 1))) {
      return NextResponse.json({ message: "Invalid page or limit parameters" }, { status: 400 });
    }
    
    // Pass page and limit as potentially undefined. The service layer will handle this.
    const { users, totalCount } = await getAllUsers(page, limit, searchTerm);
    
    // If paginating, include pagination info. Otherwise, just users and totalCount.
    if (page !== undefined && limit !== undefined) {
        return NextResponse.json({ users, totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) });
    } else {
        return NextResponse.json({ users, totalCount });
    }

  } catch (error) {
    console.error("Get All Users API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: "Failed to fetch users: " + errorMessage }, { status: 500 });
  }
}

