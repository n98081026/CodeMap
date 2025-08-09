'use client';

import {
  ArrowLeft,
  Compass,
  Share2,
  EyeOff,
  HelpCircle,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';

interface EditorHeaderProps {
  mapName: string;
  isViewOnlyMode: boolean;
  isSaving: boolean;
  onSaveMap: () => void;
  onStartTutorial: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  mapName,
  isViewOnlyMode,
  isSaving,
  onSaveMap,
  onStartTutorial,
}) => {
  const { user } = useAuth();
  const router = useRouter();

  const handleBackClick = () => {
    if (user?.role === 'student') {
      router.push(Routes.Student.CONCEPT_MAPS);
    } else if (user?.role === 'teacher') {
      router.push(Routes.Teacher.DASHBOARD);
    } else if (user?.role === 'admin') {
      router.push(Routes.Admin.DASHBOARD);
    } else {
      router.push(Routes.Examples);
    }
  };

  return (
    <DashboardHeader
      title={
        <div className='flex items-center gap-3'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleBackClick}
            className='p-2'
          >
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <div className='flex items-center gap-2'>
            <Compass className='h-5 w-5 text-primary' />
            <span className='font-semibold text-lg'>
              {mapName || 'Untitled Map'}
            </span>
            {isViewOnlyMode && (
              <div className='flex items-center gap-1 px-2 py-1 bg-muted rounded-md'>
                <EyeOff className='h-3 w-3 text-muted-foreground' />
                <span className='text-xs text-muted-foreground'>View Only</span>
              </div>
            )}
          </div>
        </div>
      }
      children={
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onStartTutorial}
            className='hidden sm:flex'
          >
            <HelpCircle className='h-4 w-4 mr-2' />
            Tutorial
          </Button>

          {!isViewOnlyMode && (
            <>
              <Button variant='ghost' size='sm' className='hidden sm:flex'>
                <Share2 className='h-4 w-4 mr-2' />
                Share
              </Button>

              <Button
                onClick={onSaveMap}
                disabled={isSaving}
                size='sm'
                className={cn(
                  'transition-all duration-200',
                  isSaving && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Save className='h-4 w-4 mr-2' />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      }
    />
  );
};
