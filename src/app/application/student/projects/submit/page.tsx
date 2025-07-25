'use client';

import { FileText } from 'lucide-react';

// UserRole might not be directly needed here, useAuth is for user object
// import { UserRole } from "@/types";
// import { useAuth } from "@/contexts/auth-context"; // user object is not directly used in this component for tutorial logic now
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { ProjectUploadForm } from '@/components/projects/project-upload-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import 'shepherd.js/dist/css/shepherd.css'; // Basic Shepherd CSS
import useConceptMapStore from '@/stores/concept-map-store';

export default function SubmitProjectPage() {
  const studentDashboardLink = '/application/student/dashboard';

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title='Submit Project'
        description='Upload your project archive (.rar or .zip) for analysis and concept map generation.'
        icon={FileText}
        iconLinkHref={studentDashboardLink}
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
    </div>
  );
}
