
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectUploadForm } from "@/components/projects/project-upload-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FileText } from "lucide-react";
// UserRole might not be directly needed here, useAuth is for user object
// import { UserRole } from "@/types";
// import { useAuth } from "@/contexts/auth-context"; // user object is not directly used in this component for tutorial logic now
import Shepherd from 'shepherd.js';
import 'shepherd.js/dist/css/shepherd.css'; // Basic Shepherd CSS
import useConceptMapStore from '@/stores/concept-map-store';


export default function SubmitProjectPage() {
  const studentDashboardLink = "/application/student/dashboard";
  const tourRef = useRef<Shepherd.Tour | null>(null);
  const { tutorialState, setTutorialState } = useConceptMapStore(s => ({
    tutorialState: s.tutorialState,
    setTutorialState: s.setTutorialState,
  }));

  useEffect(() => {
    // Ensure Shepherd's CSS is dynamically applied or globally imported.
    // For this example, direct import is fine but can cause issues with Next.js if not handled correctly globally.
    // A better approach for CSS might be a global import in layout.tsx or _app.tsx.
    // However, for this tool's constraints, direct import is the simplest representation.

    // Check if the tutorial for project upload has been seen
    // In a real app, this `projectUploadSeen` might come from user profile/DB for persistence.
    if (tutorialState && !tutorialState.projectUploadSeen) {
      const tour = new Shepherd.Tour({
        useModalOverlay: true,
        defaultStepOptions: {
          classes: 'shadow-md bg-background text-foreground border border-border rounded-lg', // Example custom class for popups
          scrollTo: { behavior: 'smooth', block: 'center' },
          cancelIcon: {
            enabled: true,
            label: 'Skip tutorial'
          },
        }
      });
      tourRef.current = tour;

      tour.addStep({
        id: 'welcome',
        title: 'Welcome to Project Upload!',
        text: "Let's quickly walk through how to upload your project and generate a concept map. This will only take a moment.",
        buttons: [{ text: 'Next', action: tour.next }]
      });

      tour.addStep({
        id: 'file-input',
        title: '1. Select Your Project File',
        text: "Click here or drag & drop your project's archive file (e.g., .zip, .tar.gz). This file will be analyzed by AI.",
        attachTo: { element: 'input[type="file"]', on: 'bottom' }, // Assuming a generic selector, an ID would be better
        buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
      });

      tour.addStep({
        id: 'user-goals',
        title: '2. Guide the AI (Optional)',
        text: "Provide hints to the AI about what aspects of your project you're most interested in (e.g., 'focus on API routes', 'understand data models'). This helps create a more relevant map.",
        attachTo: { element: 'textarea[name="userGoals"]', on: 'bottom' }, // Assuming name attribute
        buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }]
      });

      // Conditional step for classroom - this is a best effort.
      // Shepherd will try to attach; if element not found, it might skip or error based on config.
      // For robustness, ProjectUploadForm could emit an event or have a known ID for this element.
      tour.addStep({
        id: 'classroom-select',
        title: '3. Share with Classroom (Optional)',
        text: "If you're part of a classroom, you can choose to share this project and its map here. Otherwise, select 'None'.",
        attachTo: { element: 'button[role="combobox"]', on: 'bottom' }, // General selector for Radix Select trigger
        buttons: [{ text: 'Back', action: tour.back }, { text: 'Next', action: tour.next }],
        when: { // This is a Shepherd feature, but might need custom logic if element presence varies
          show: () => {
            // Basic check, might need a more reliable way to know if classroom select is relevant/visible
            return !!document.querySelector('button[role="combobox"]');
          }
        }
      });

      tour.addStep({
        id: 'submit-button',
        title: '4. Start the Analysis!',
        text: "Once you've selected your file, click here. Your project will be submitted, and then you'll be asked to confirm the AI analysis to generate the concept map.",
        attachTo: { element: 'button[type="submit"]', on: 'top' }, // Assuming this is the main submit button
        buttons: [{ text: 'Back', action: tour.back }, { text: 'Done', action: tour.complete }]
      });

      tour.on('complete', () => {
        setTutorialState({ ...tutorialState, projectUploadSeen: true });
      });
      tour.on('cancel', () => {
        setTutorialState({ ...tutorialState, projectUploadSeen: true }); // Also mark as seen if skipped
      });

      tour.start();
    }

    return () => {
      if (tourRef.current) {
        // tourRef.current.complete(); // Complete to ensure it doesn't linger
        tourRef.current.cancel(); // Or cancel if unmounting mid-tour
        tourRef.current = null;
      }
    };
  }, [tutorialState, setTutorialState]);


  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Submit Project"
        description="Upload your project archive (.rar or .zip) for analysis and concept map generation."
        icon={FileText}
        iconLinkHref={studentDashboardLink}
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Upload Project File</CardTitle>
          <CardDescription>
            Ensure your project is archived into a single .rar or .zip file. 
            The system will attempt to analyze its structure and generate a concept map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectUploadForm />
        </CardContent>
      </Card>
    </div>
  );
}
