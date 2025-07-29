'use client';

import {
  PlusCircle,
  Share2,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'; // Added ArrowLeft, ArrowRight
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

import type { ConceptMap } from '@/types';

import { ConceptMapListItem } from '@/components/concept-map/concept-map-list-item';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const MAPS_PER_PAGE = 9; // Or 10, as you prefer

export default function StudentConceptMapsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [conceptMaps, setConceptMaps] = useState<ConceptMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalMaps, setTotalMaps] = useState(0);

  const fetchStudentConceptMaps = useCallback(
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
          `/api/concept-maps?ownerId=${user.id}&page=${pageToFetch}&limit=${MAPS_PER_PAGE}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch concept maps');
        }
        const data = await response.json();
        setConceptMaps(data.maps);
        setTotalMaps(data.totalCount);
        setTotalPages(data.totalPages);
        setCurrentPage(data.page);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast({
          title: 'Error Fetching Concept Maps',
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
      fetchStudentConceptMaps(currentPage);
    }
  }, [user?.id, currentPage, fetchStudentConceptMaps]);

  const handleDeleteMap = useCallback(
    async (mapId: string, mapName: string) => {
      try {
        const response = await fetch(`/api/concept-maps/${mapId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete concept map');
        }
        toast({
          title: 'Concept Map Deleted',
          description: `"${mapName}" has been successfully deleted.`,
        });
        // Refetch current page, or previous if it was the last item on a page > 1
        if (conceptMaps.length === 1 && currentPage > 1) {
          setCurrentPage((prevPage) => prevPage - 1);
        } else {
          fetchStudentConceptMaps(currentPage);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred.';
        toast({
          title: 'Error Deleting Map',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    },
    [toast, fetchStudentConceptMaps, currentPage, conceptMaps.length]
  );

  const handlePreviousPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const renderContent = () => {
    if (isLoading && conceptMaps.length === 0) {
      // Show full page loader only on initial load
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
            Error Loading Concept Maps
          </h2>
          <p className='mt-2 text-muted-foreground'>{error}</p>
          <Button
            onClick={() => fetchStudentConceptMaps(currentPage)}
            className='mt-4'
          >
            Retry
          </Button>
        </div>
      );
    }

    if (totalMaps === 0 && !isLoading) {
      // Check totalMaps for the true empty state
      return (
        <Card>
          <CardHeader>
            <CardTitle>No Concept Maps Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>
              You haven&apos;t created any concept maps. Click the button below
              to get started!
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {conceptMaps.map((map) => (
            <ConceptMapListItem
              key={map.id}
              map={map}
              onDelete={() => handleDeleteMap(map.id, map.name)}
            />
          ))}
        </div>
        {totalPages > 1 && (
          <div className='mt-8 flex justify-center items-center space-x-4'>
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage <= 1 || isLoading}
              variant='outline'
            >
              <ArrowLeft className='mr-2 h-4 w-4' /> Previous
            </Button>
            <span className='text-sm text-muted-foreground'>
              Page {currentPage} of {totalPages} ({totalMaps} maps)
            </span>
            <Button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isLoading}
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
        title='My Concept Maps'
        description='Manage all your created and shared concept maps.'
        icon={Share2}
      >
        <Button asChild>
          <Link href='/concept-maps/editor/new'>
            <PlusCircle className='mr-2 h-4 w-4' /> Create New Map
          </Link>
        </Button>
      </DashboardHeader>
      {renderContent()}
    </div>
  );
}
