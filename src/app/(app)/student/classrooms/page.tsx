'use client';

import { BookOpen, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import type { Classroom } from '@/types';

import { ClassroomListItem } from '@/components/classrooms/classroom-list-item';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

export default function StudentClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [enrolledClassrooms, setEnrolledClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrolledClassrooms = useCallback(async () => {
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
      const response = await fetch(`/api/classrooms?studentId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch classrooms');
      }
      const data: Classroom[] = await response.json(); // API returns Classroom[] directly
      setEnrolledClassrooms(data);
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
  }, [user?.id, toast]);

  useEffect(() => {
    if (user?.id) {
      fetchEnrolledClassrooms();
    }
  }, [user?.id, fetchEnrolledClassrooms]);

  const renderContent = () => {
    if (isLoading) {
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
          <Button onClick={fetchEnrolledClassrooms} className='mt-4'>
            Retry
          </Button>
        </div>
      );
    }

    if (enrolledClassrooms.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Not Enrolled in Any Classrooms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>
              You are not currently enrolled in any classrooms. If you have an
              invite code, your teacher can provide instructions on how to join.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {enrolledClassrooms.map((classroom) => (
          <ClassroomListItem
            key={classroom.id}
            classroom={classroom}
            userRole={UserRole.STUDENT}
            // No onEdit or onDelete for students
            // detailLinkHref={`/application/student/classrooms/${classroom.id}`} // Optional: if a specific student view exists
          />
        ))}
      </div>
    );
  };

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title='My Classrooms'
        description='Here are the classrooms you are currently enrolled in.'
        icon={BookOpen}
      />
      {renderContent()}
    </div>
  );
}
