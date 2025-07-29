'use client';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  PlusCircle,
  Edit,
  Trash2,
  Users,
  Loader2,
  AlertTriangle,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import React, {
  useEffect,
  useState,
  useCallback,
  useDeferredValue,
  useRef,
} from 'react';

import type { User } from '@/types';

import { EditUserDialog } from '@/components/admin/users/edit-user-dialog';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EmptyState } from '@/components/layout/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import {
  MOCK_ADMIN_USER_V3,
  MOCK_STUDENT_USER,
  MOCK_TEACHER_USER,
} from '@/lib/config';
import { UserRole } from '@/types';

const USERS_PER_PAGE = 15;
const PREDEFINED_MOCK_USER_IDS = [
  MOCK_STUDENT_USER.id,
  MOCK_TEACHER_USER.id,
  MOCK_ADMIN_USER_V3.id,
];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const adminDashboardLink = '/application/admin/dashboard';
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Approximate height of a TableRow
    overscan: 10,
  });

  const fetchUsers = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: USERS_PER_PAGE.toString(),
      });
      if (search.trim()) {
        searchParams.append('search', search.trim());
      }

      const response = await fetch(`/api/users?${searchParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users);
      setTotalUsers(data.totalCount);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage, deferredSearchTerm);
  }, [currentPage, deferredSearchTerm, fetchUsers]);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm]);

  const handleDeleteUser = useCallback(
    async (userId: string, userName: string) => {
      if (
        PREDEFINED_MOCK_USER_IDS.includes(userId) ||
        userId === adminUser?.id
      ) {
        toast({
          title: 'Operation Denied',
          description:
            'Pre-defined test users, or your own account cannot be deleted.',
          variant: 'destructive',
        });
        return;
      }
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete user');
        }
        toast({
          title: 'User Deleted',
          description: `User "${userName}" has been deleted.`,
        });
        if (users.length === 1 && currentPage > 1) {
          // If last user on a page, go to prev page
          setCurrentPage((prev) => prev - 1);
        } else {
          fetchUsers(currentPage, deferredSearchTerm); // Re-fetch current page
        }
      } catch (err) {
        toast({
          title: 'Error Deleting User',
          description: (err as Error).message,
          variant: 'destructive',
        });
      }
    },
    [
      toast,
      fetchUsers,
      adminUser?.id,
      deferredSearchTerm,
      users.length,
      currentPage,
    ]
  );

  const openEditModal = useCallback(
    (userToEdit: User) => {
      if (
        PREDEFINED_MOCK_USER_IDS.includes(userToEdit.id) ||
        userToEdit.id === adminUser?.id
      ) {
        toast({
          title: 'Operation Denied',
          description:
            'Pre-defined test users, or your own account cannot be edited.',
          variant: 'destructive',
        });
        return;
      }
      setEditingUser(userToEdit);
      setIsEditModalOpen(true);
    },
    [toast, adminUser?.id]
  );

  const handleUserUpdateSuccess = useCallback(() => {
    fetchUsers(currentPage, deferredSearchTerm);
  }, [currentPage, deferredSearchTerm, fetchUsers]);

  const handlePreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title='User Management'
        description='View, edit, and manage all users in the system.'
        icon={Users}
        iconLinkHref={adminDashboardLink}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button disabled>
                  <PlusCircle className='mr-2 h-4 w-4' /> Add New User
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>New users should register via the public registration page.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DashboardHeader>

      <div className='mb-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Filter by name or email...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10 w-full max-w-sm'
          />
        </div>
      </div>

      {isLoading && (
        <div className='flex justify-center items-center py-10'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
          <p className='ml-2'>Loading users...</p>
        </div>
      )}

      {error && !isLoading && (
        <EmptyState
          icon={AlertTriangle}
          title='Error Loading Users'
          description={error}
          actionButton={
            <Button
              onClick={() => fetchUsers(currentPage, deferredSearchTerm)}
              variant='outline'
              size='sm'
            >
              Try Again
            </Button>
          }
        />
      )}

      {!isLoading && !error && users.length === 0 && (
        <EmptyState
          icon={Users}
          title='No Users Found'
          description={
            deferredSearchTerm
              ? 'No users match your search criteria.'
              : 'There are no users in the system yet. New users can register through the public registration page.'
          }
        />
      )}

      {!isLoading && !error && users.length > 0 && (
        <Card className='shadow-lg'>
          <CardHeader>
            <CardTitle>All Users ({totalUsers})</CardTitle>
            <CardDescription>
              A list of all registered users. Predefined test users and your own
              account have restricted actions.
            </CardDescription>
          </CardHeader>
          <CardContent
            ref={parentRef}
            className='overflow-auto'
            style={{ maxHeight: 'calc(100vh - 420px)' }}
          >
            <Table>
              <TableHeader className='sticky top-0 bg-card z-10'>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <tbody
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const userRow = users[virtualRow.index];
                  if (!userRow) return null;
                  const isRestricted =
                    PREDEFINED_MOCK_USER_IDS.includes(userRow.id) ||
                    userRow.id === adminUser?.id;
                  return (
                    <TableRow
                      key={userRow.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      ref={(el) => rowVirtualizer.measureElement(el)}
                      data-index={virtualRow.index}
                    >
                      <TableCell className='font-medium'>
                        {userRow.name}
                      </TableCell>
                      <TableCell>{userRow.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            userRow.role === UserRole.ADMIN
                              ? 'destructive'
                              : userRow.role === UserRole.TEACHER
                                ? 'secondary'
                                : 'default'
                          }
                        >
                          {userRow.role.charAt(0).toUpperCase() +
                            userRow.role.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className='text-right'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='mr-2'
                          title={
                            isRestricted ? 'Cannot edit this user' : 'Edit user'
                          }
                          onClick={() => openEditModal(userRow)}
                          disabled={isRestricted}
                        >
                          <Edit className='h-4 w-4' />
                        </Button>
                        <AlertDialog>
                          <Button
                            asChild
                            variant='ghost'
                            size='icon'
                            title={
                              isRestricted
                                ? 'Cannot delete this user'
                                : 'Delete user'
                            }
                            disabled={isRestricted}
                          >
                            <Trash2 className='h-4 w-4 text-destructive' />
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the user &quot;{userRow.name}
                                &quot;. Associated authentication user in
                                Supabase will need to be handled separately.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  handleDeleteUser(userRow.id, userRow.name);
                                }}
                              >
                                Delete User Profile
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </Table>
          </CardContent>
          {totalPages > 0 && (
            <CardFooter className='flex items-center justify-between border-t pt-4'>
              <span className='text-sm text-muted-foreground'>
                Page {currentPage} of {totalPages} ({totalUsers} users)
              </span>
              <div className='flex space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className='mr-2 h-4 w-4' />
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                  <ChevronRight className='ml-2 h-4 w-4' />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      {editingUser && (
        <EditUserDialog
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          user={editingUser}
          onUserUpdated={handleUserUpdateSuccess}
        />
      )}
    </div>
  );
}
