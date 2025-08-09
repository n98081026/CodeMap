'use client';

import {
  ArrowLeft,
  Compass,
  Share2,
  EyeOff,
  Save,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';

interface EditorHeaderProps {
  mapName: string;
  isViewOnlyMode: boolean;
  isNewMapMode: boolean;
  storeMapId: string | null;
  getRoleBasedDashboardLink: () => string;
  handleSaveMap: () => void;
  isStoreSaving: boolean;
  getBackLink: () => string;
  getBackButtonText: () => string;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  mapName,
  isViewOnlyMode,
  isNewMapMode,
  storeMapId,
  getRoleBasedDashboardLink,
  handleSaveMap,
  isStoreSaving,
  getBackLink,
  getBackButtonText,
}) => {
  return (
    <DashboardHeader
      title={mapName}
      description={
        isViewOnlyMode
          ? 'Currently in view-only mode.'
          : 'Create, edit, and visualize your ideas.'
      }
      icon={
        isViewOnlyMode
          ? EyeOff
          : isNewMapMode || storeMapId === 'new'
            ? Compass
            : Share2
      }
      iconLinkHref={getRoleBasedDashboardLink()}
    >
      {!isViewOnlyMode && (
        <Button onClick={handleSaveMap} disabled={isStoreSaving}>
          {isStoreSaving ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Save className='mr-2 h-4 w-4' />
          )}
          Save
        </Button>
      )}
      <Button asChild variant='outline'>
        <Link href={getBackLink()}>
          <ArrowLeft className='mr-2 h-4 w-4' /> {getBackButtonText()}
        </Link>
      </Button>
    </DashboardHeader>
  );
};
