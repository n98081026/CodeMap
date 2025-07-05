'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { PlusCircle, Edit, Trash2, Users } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';

// Mock data for users
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Alice Wonderland',
    email: 'alice@example.com',
    role: UserRole.STUDENT,
  },
  {
    id: '2',
    name: 'Bob The Builder',
    email: 'bob@example.com',
    role: UserRole.TEACHER,
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: UserRole.STUDENT,
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    role: UserRole.ADMIN,
  },
];

export default function AdminUsersPage() {
  // Add logic for fetching and managing users

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title='User Management'
        description='View, edit, and manage all users in the system.'
        icon={Users}
      >
        <Button disabled>
          <PlusCircle className='mr-2 h-4 w-4' /> Add New User
        </Button>
      </DashboardHeader>

      <Card className='shadow-lg'>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>A list of all registered users.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className='text-right'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className='font-medium'>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        user.role === UserRole.ADMIN
                          ? 'destructive'
                          : user.role === UserRole.TEACHER
                            ? 'secondary'
                            : 'default'
                      }
                    >
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className='text-right'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='mr-2'
                      disabled
                    >
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button variant='ghost' size='icon' disabled>
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
