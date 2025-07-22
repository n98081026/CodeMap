'use client';

import {
  PlusCircle,
  BookOpen,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';

import type { Classroom } from '@/types';

import { ClassroomListItem } from '@/components/classrooms/classroom-list-item';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EditClassroomDialog } from '@/components/teacher/classrooms/edit-classroom-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

const CLASSROOMS_PER_PAGE = 9;

// Define the new memoized component for displaying a single classroom card
interface TeacherClassroomDisplayCardProps {
  classroom: Classroom;
}

const TeacherClassroomDisplayCard: React.FC<TeacherClassroomDisplayCardProps> =
  React.memo(({ classroom }) => {
    return (
      <Card className='flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300'>
        <CardHeader>
          <CardTitle className='text-xl'>{classroom.name}</CardTitle>
          <CardDescription>
            Invite Code:{' '}
            <span className='font-mono text-primary'>
              {classroom.inviteCode}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className='flex-grow'>
          <div className='flex items-center text-sm text-muted-foreground'>
            <span>{classroom.studentIds.length} Students</span>
          </div>
          {/* Add more details like last activity, number of maps/submissions */}
        </CardContent>
        <CardFooter>
          <Button asChild className='w-full'>
            <Link href={`/teacher/classrooms/${classroom.id}`}>
              View Details <ArrowRight className='ml-2 h-4 w-4' />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  });
TeacherClassroomDisplayCard.displayName = 'TeacherClassroomDisplayCard';

export default function TeacherClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalClassrooms, setTotalClassrooms] = useState(0);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(
    null
  );

  const fetchTeacherClassrooms = useCallback(
    async (pageToFetch: number) => {
      setIsLoading(true);
      setError(null);

      if (!user?.id) {
        setError('User not authenticated.');
        setIsLoading(false);
        toast({
          title: 'Authentication Error',
          description: 'User not authenticated.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const response = await fetch(
          `/api/classrooms?teacherId=${user.id}&page=${pageToFetch}&limit=${CLASSROOMS_PER_PAGE}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch classrooms');
        }
        const data = await response.json();
        setClassrooms(data.classrooms);
        setTotalClassrooms(data.totalCount);
        setTotalPages(data.totalPages);
        setCurrentPage(data.page);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast({
          title: 'Error Fetching Classrooms',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, toast]
  );

  useEffect(() => {
    if (user?.id) {
      fetchTeacherClassrooms(currentPage);
    }
  }, [user?.id, currentPage, fetchTeacherClassrooms]);

  const openEditModal = useCallback((classroom: Classroom) => {
    setEditingClassroom(classroom);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteClassroom = useCallback(
    async (classroomId: string, classroomName: string) => {
      try {
        const response = await fetch(`/api/classrooms/${classroomId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete classroom');
        }
        toast({
          title: 'Classroom Deleted',
          description: `"${classroomName}" has been successfully deleted.`,
        });
        // Refetch or adjust page
        if (classrooms.length === 1 && currentPage > 1) {
          setCurrentPage((prevPage) => prevPage - 1); // Go to previous page if last item on current page deleted
        } else {
          fetchTeacherClassrooms(currentPage);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({
          title: 'Error Deleting Classroom',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [toast, fetchTeacherClassrooms, currentPage, classrooms.length]
  );

  const handlePreviousPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const renderContent = () => {
    if (isLoading && classrooms.length === 0) {
      return (
        <div className='flex justify-center items-center h-64'>
          <Loader2 className='h-12 w-12 animate-spin text-primary' />
        </div>
      );
    }

    if (error) {
      return (
        <div className='flex flex-col items-center justify-center h-64'>
          <AlertTriangle className='h-12 w-12 text-destructive' />
          <h2 className='mt-4 text-xl font-semibold'>
            Error Loading Classrooms
          </h2>
          <p className='mt-2 text-muted-foreground'>{error}</p>
          <Button
            onClick={() => fetchTeacherClassrooms(currentPage)}
            className='mt-4'
          >
            Retry
          </Button>
        </div>
      );
    }

    if (classrooms.length === 0) {
      return (
        <div className='flex flex-col items-center justify-center h-64'>
          <BookOpen className='h-12 w-12 text-muted-foreground' />
          <h2 className='mt-4 text-xl font-semibold'>No Classrooms Yet</h2>
          <p className='mt-2 text-muted-foreground'>
            You haven&apos;t created or been assigned to any classrooms.
          </p>
          <Button asChild className='mt-4'>
            <Link href='/teacher/classrooms/new'>
              <PlusCircle className='mr-2 h-4 w-4' /> Create Classroom
            </Link>
          </Button>
        </div>
      );
    }

    return (
      <>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {classrooms.map((classroom) => (
            <ClassroomListItem
              key={classroom.id}
              classroom={classroom}
              userRole={UserRole.TEACHER}
              onEdit={() => openEditModal(classroom)}
              onDelete={() =>
                handleDeleteClassroom(classroom.id, classroom.name)
              }
            />
          ))}
        </div>
        {totalPages > 1 && (
          <div className='mt-8 flex justify-center items-center space-x-4'>
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || isLoading}
              variant='outline'
            >
              <ArrowLeft className='mr-2 h-4 w-4' /> Previous
            </Button>
            <span className='text-sm text-muted-foreground'>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isLoading}
              variant='outline'
            >
              Next <ArrowRight className='ml-2 h-4 w-4' />
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title='Manage Classrooms'
        description='View, edit, and manage your classrooms.'
        icon={BookOpen}
      >
        <Button asChild>
          <Link href='/teacher/classrooms/new'>
            <PlusCircle className='mr-2 h-4 w-4' /> Create Classroom
          </Link>
        </Button>
      </DashboardHeader>

      {renderContent()}

      {isEditModalOpen && editingClassroom && (
        <EditClassroomDialog
          isOpen
          onOpenChange={setIsEditModalOpen}
          classroomToEdit={editingClassroom}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}
    </div>
  );
}
