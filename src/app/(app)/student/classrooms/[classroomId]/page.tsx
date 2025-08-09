'use client';

import {
  ArrowLeft,
  BookOpen,
  Share2,
  Loader2,
  AlertTriangle,
  Eye,
  Info,
  Library,
  Users as UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';

import type { Classroom, ConceptMap } from '@/types';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Routes } from '@/lib/routes';
import { UserRole } from '@/types';

export default function StudentClassroomDetailPage() {
  const paramsHook = useParams();
  const routeClassroomId = paramsHook.classroomId as string;

  const { user } = useAuth();
  const { toast } = useToast();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [sharedMaps, setSharedMaps] = useState<ConceptMap[]>([]);
  const [isLoadingClassroom, setIsLoadingClassroom] = useState(true);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [errorClassroom, setErrorClassroom] = useState<string | null>(null);
  const [errorMaps, setErrorMaps] = useState<string | null>(null);

  const studentDashboardLink = Routes.Student.DASHBOARD;

  const fetchClassroomDetails = useCallback(async () => {
    if (!routeClassroomId) return;
    setIsLoadingClassroom(true);
    setErrorClassroom(null);
    try {
      const response = await fetch(`/api/classrooms/${routeClassroomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to fetch classroom details'
        );
      }
      const data: Classroom = await response.json();
      setClassroom(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setErrorClassroom(errorMessage);
      toast({
        title: 'Error Fetching Classroom Details',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingClassroom(false);
    }
  }, [routeClassroomId, toast]);

  const fetchSharedMaps = useCallback(async () => {
    if (!routeClassroomId) return;
    setIsLoadingMaps(true);
    setErrorMaps(null);
    try {
      const response = await fetch(
        `/api/concept-maps?classroomId=${routeClassroomId}`
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to fetch shared concept maps'
        );
      }
      const data: ConceptMap[] = await response.json();
      setSharedMaps(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setErrorMaps(errorMessage);
      toast({
        title: 'Error Fetching Shared Maps',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMaps(false);
    }
  }, [routeClassroomId, toast]);

  useEffect(() => {
    fetchClassroomDetails();
    fetchSharedMaps();
  }, [fetchClassroomDetails, fetchSharedMaps]);

  if (isLoadingClassroom) {
    return (
      <div className='space-y-6 p-4'>
        <DashboardHeader
          title='Loading Classroom...'
          icon={Loader2}
          iconClassName='animate-spin'
          iconLinkHref={studentDashboardLink}
        />
        <div className='flex justify-center items-center py-10'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      </div>
    );
  }

  if (errorClassroom || !classroom) {
    return (
      <div className='space-y-6 p-4'>
        <DashboardHeader
          title='Error'
          icon={AlertTriangle}
          iconLinkHref={studentDashboardLink}
        />
        <Card>
          <CardHeader>
            <CardTitle className='text-destructive flex items-center'>
              <AlertTriangle className='mr-2' />
              Could not load classroom
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{errorClassroom || 'The classroom data could not be found.'}</p>
            <Button
              onClick={fetchClassroomDetails}
              variant='outline'
              className='mt-4'
            >
              Try Again
            </Button>
            <Button asChild variant='secondary' className='mt-4 ml-2'>
              <Link href={Routes.Student.CLASSROOMS}>
                <ArrowLeft className='mr-2 h-4 w-4' /> Back to My Classrooms
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title={classroom.name}
        description={`Teacher: ${classroom.teacherName || 'N/A'}.`}
        icon={BookOpen}
        iconLinkHref={studentDashboardLink}
      >
        <Button asChild variant='outline'>
          <Link href={Routes.Student.CLASSROOMS}>
            <ArrowLeft className='mr-2 h-4 w-4' /> Back to My Classrooms
          </Link>
        </Button>
      </DashboardHeader>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Info className='mr-2 h-5 w-5 text-primary' />
            Classroom Information
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-3'>
          {classroom.description && (
            <div>
              <h3 className='font-semibold text-base mb-1'>Description:</h3>
              <p className='text-sm text-muted-foreground whitespace-pre-wrap'>
                {classroom.description}
              </p>
            </div>
          )}
          <div className='flex items-center space-x-4 pt-2'>
            <div>
              <h3 className='font-semibold text-base mb-1 flex items-center'>
                <UsersIcon className='mr-2 h-4 w-4 text-muted-foreground' />
                Students Enrolled:
              </h3>
              <p className='text-sm text-muted-foreground ml-6'>
                {classroom.studentIds.length}
              </p>
            </div>
            {classroom.inviteCode && (
              <div>
                <h3 className='font-semibold text-base mb-1'>Invite Code:</h3>
                <p className='text-sm text-muted-foreground font-mono ml-6'>
                  {classroom.inviteCode}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className='flex items-center'>
            <Share2 className='mr-2 h-5 w-5 text-primary' /> Shared Concept Maps
          </CardTitle>
          <CardDescription>
            Concept maps shared by the teacher or students in this classroom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMaps && (
            <div className='flex justify-center items-center py-6'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />{' '}
              <p className='ml-2'>Loading shared maps...</p>
            </div>
          )}
          {errorMaps && !isLoadingMaps && (
            <EmptyState
              icon={AlertTriangle}
              title='Error Loading Shared Maps'
              description={errorMaps}
              actionButton={
                <Button onClick={fetchSharedMaps} variant='outline' size='sm'>
                  Try Again
                </Button>
              }
            />
          )}
          {!isLoadingMaps && !errorMaps && sharedMaps.length === 0 && (
            <EmptyState
              icon={Library}
              title='No Shared Maps'
              description='No concept maps have been shared with this classroom yet by the teacher or other students.'
            />
          )}
          {!isLoadingMaps && !errorMaps && sharedMaps.length > 0 && (
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
              {sharedMaps.map((map) => (
                <Card
                  key={map.id}
                  className='shadow-sm hover:shadow-md transition-shadow'
                >
                  <CardHeader>
                    <CardTitle className='text-lg'>{map.name}</CardTitle>
                    <CardDescription>
                      Last updated:{' '}
                      {new Date(map.updatedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className='text-xs text-muted-foreground'>
                      Created by:{' '}
                      {map.ownerId === user?.id
                        ? 'You'
                        : classroom.students?.find((s) => s.id === map.ownerId)
                            ?.name || `User ID ${map.ownerId}`}
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button
                      asChild
                      variant='outline'
                      size='sm'
                      className='w-full'
                    >
                      <Link href={Routes.ConceptMaps.VIEW(map.id)}>
                        <Eye className='mr-2 h-4 w-4' /> View Map
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
