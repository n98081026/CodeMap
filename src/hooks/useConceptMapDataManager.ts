// src/hooks/useConceptMapDataManager.ts
'use client';

import { useState } from 'react';

import type { User } from '@/types';

import { useMapLoader } from './useMapLoader';
import { useMapSaver } from './useMapSaver';

interface UseConceptMapDataManagerProps {
  routeMapId?: string;
  user: User | null;
}

export function useConceptMapDataManager({
  routeMapId,
  user,
}: UseConceptMapDataManagerProps) {
  const [currentSubmissionId, setCurrentSubmissionId] = useState<string | null>(
    null
  );
  const { loadMapData } = useMapLoader({ routeMapId, user });
  const { saveMap } = useMapSaver({ user });

  return { saveMap, loadMapData, currentSubmissionId };
}
