'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Routes } from '@/lib/routes';

export default function NewConceptMapPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace(Routes.Legacy.CONCEPT_MAPS_NEW);
  }, [router]);
  return null; // Or a loading indicator
}
