'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewConceptMapPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/concept-maps/editor/new');
  }, [router]);
  return null; // Or a loading indicator
}
