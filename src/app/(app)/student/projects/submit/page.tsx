'use client';

import { FileText } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react'; // Import useCallback

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProjectUploadForm } from '@/components/projects/project-upload-form';
import AppTutorial from '@/components/tutorial/app-tutorial';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';

// AppTutorial is now globally managed via AppLayout and tutorial-store
// import AppTutorial from "@/components/tutorial/app-tutorial";
import useTutorialStore from '@/stores/tutorial-store'; // Import tutorial store

export default function SubmitProjectPage() {
  // const [runTutorial, setRunTutorial] = useState(false); // Removed local state
  const { user, isLoading } = useAuth();
  const { startOrResumeTutorial } = useTutorialStore(
    useCallback((s) => ({ startOrResumeTutorial: s.startOrResumeTutorial }), [])
  );

  useEffect(() => {
    if (!isLoading && user) {
      const tutorialCompleted =
        localStorage.getItem('projectUploadTutorial_completed') === 'true';
      if (!tutorialCompleted) {
        // Use a slight delay to ensure the page elements are likely rendered
        setTimeout(() => startOrResumeTutorial('projectUploadTutorial'), 200);
      }
    }
  }, [user, isLoading, startOrResumeTutorial]);

  return (
    <div className='space-y-6 project-upload-form-container'>
      {' '}
      {/* Added class for tutorial targeting */}
      <DashboardHeader
        title='Submit Project'
        description='Upload your project archive (.rar or .zip) for analysis and concept map generation.'
        icon={FileText}
      />
      <Card className='max-w-2xl mx-auto shadow-lg'>
        <CardHeader>
          <CardTitle>Upload Project File</CardTitle>
          <CardDescription>
            Ensure your project is archived into a single .rar or .zip file. The
            system will attempt to analyze its structure and generate a concept
            map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectUploadForm />
        </CardContent>
      </Card>
      {/* AppTutorial component is now likely rendered in a higher-level layout (e.g., AppLayout)
          and controlled by the tutorial-store, so it's not needed here directly. */}
    </div>
  );
}
