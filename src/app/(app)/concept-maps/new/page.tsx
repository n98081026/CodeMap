'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { Routes } from '@/lib/routes';

export default function NewConceptMapPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(Routes.ConceptMaps.EDIT('new'));
  }, [router]);
  return null; // Or a loading indicator
}
