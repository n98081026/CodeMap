'use client';

import { Info, UserPlus, LogIn } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useConceptMapStore } from '@/stores/concept-map-store';

interface EditorGuestCtaBannerProps {
  routeMapId: string;
}

export const EditorGuestCtaBanner: React.FC<EditorGuestCtaBannerProps> = ({
  routeMapId,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const storeIsViewOnlyMode = useConceptMapStore(
    (state) => state.isViewOnlyMode
  );

  const isActuallyGuest = !isLoading && !isAuthenticated;
  const isExampleMap = routeMapId && routeMapId.startsWith('example-');

  if (!isActuallyGuest || !storeIsViewOnlyMode || !isExampleMap) {
    return null;
  }

  return (
    <Alert className='mx-4 my-2 border-primary/50 bg-primary/5 text-primary-foreground text-sm rounded-md'>
      <Info className='h-4 w-4 !text-primary mr-2' />
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
        <span className='text-primary/90'>
          You&apos;re viewing an example. To create maps, save your work, or use
          AI tools, please
        </span>
        <div className='flex gap-2 mt-2 sm:mt-0'>
          <Button
            asChild
            size='sm'
            variant='outline'
            className='py-1 px-2 h-auto text-xs'
          >
            <Link href='/register'>
              <UserPlus className='mr-1 h-3 w-3' /> Sign Up
            </Link>
          </Button>
          <Button
            asChild
            size='sm'
            variant='outline'
            className='py-1 px-2 h-auto text-xs'
          >
            <Link href='/login'>
              <LogIn className='mr-1 h-3 w-3' /> Log In
            </Link>
          </Button>
        </div>
      </div>
    </Alert>
  );
};