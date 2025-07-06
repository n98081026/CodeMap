'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NewConceptMapPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/application/concept-maps/editor/new');
  }, [router]);
  return null; // Or a loading indicator
}
