
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Classroom, ProjectSubmission, ConceptMapData, ConceptMap } from "@/types"; 
import { ProjectSubmissionStatus } from "@/types";
import { UploadCloud, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { generateMapFromProject as aiGenerateMapFromProject } from "@/ai/flows/generate-map-from-project";
import { useAuth } from "@/contexts/auth-context"; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const mockClassroomsForSelection: Classroom[] = [
  { id: "class1", name: "Introduction to Programming", teacherId: "teacher1", studentIds: [] },
  { id: "test-classroom-1", name: "Introduction to AI", teacherId: "teacher-test-id", studentIds: [] },
];


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["application/zip", "application/vnd.rar", "application/x-rar-compressed", "application/octet-stream", "application/x-zip-compressed"];

const NONE_CLASSROOM_VALUE = "_NONE_";

const projectUploadSchema = z.object({
  projectFile: z
    .custom<FileList>()
    .refine((files) => files && files.length === 1, "Project file is required.")
    .refine((files) => files && files[0].size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => files && ACCEPTED_FILE_TYPES.includes(files[0].type),
      ".zip and .rar files are accepted."
    ),
  classroomId: z.string().optional(),
});

export function ProjectUploadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmittingMetadata, setIsSubmittingMetadata] = useState(false);
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>(mockClassroomsForSelection);

  const [isConfirmAIDialogOpen, setIsConfirmAIDialogOpen] = useState(false);
  const [currentSubmissionForAI, setCurrentSubmissionForAI] = useState<ProjectSubmission | null>(null);
  const [isProcessingAIInDialog, setIsProcessingAIInDialog] = useState(false);


  const form = useForm<z.infer<typeof projectUploadSchema>>({
    resolver: zodResolver(projectUploadSchema),
    defaultValues: {
      projectFile: undefined,
      classroomId: "", 
    },
  });

  async function updateSubmissionStatusOnServer(submissionId: string, status: ProjectSubmissionStatus, generatedConceptMapId?: string | null, analysisError?: string | null) {
    try {
      const payload: any = { status };
      if (generatedConceptMapId) payload.generatedConceptMapId = generatedConceptMapId;
      if (analysisError) payload.analysisError = analysisError;

      const response = await fetch(`/api/projects/submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update submission status to ${status}`);
      }
      console.log(`Submission ${submissionId} status updated to ${status}`);
    } catch (error) {
      console.error(`Error updating submission status for ${submissionId}:`, error);
      throw error; 
    }
  }

  async function onSubmit(values: z.infer<typeof projectUploadSchema>) {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to submit a project.", variant: "destructive" });
      return;
    }

    setIsSubmittingMetadata(true);
    const file = values.projectFile[0];
    
    const submissionPayload = {
      studentId: user.id,
      originalFileName: file.name,
      fileSize: file.size,
      classroomId: values.classroomId === NONE_CLASSROOM_VALUE ? null : (values.classroomId || null),
    };

    try {
      const response = await fetch('/api/projects/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create submission record");
      }
      
      const newSubmission: ProjectSubmission = await response.json();
      toast({
        title: "Project Submitted",
        description: `"${file.name}" record created. ID: ${newSubmission!.id}`,
      });
      form.reset();
      setCurrentSubmissionForAI(newSubmission);
      setIsConfirmAIDialogOpen(true); // Open dialog after successful metadata submission
      
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingMetadata(false);
    }
  }

  const handleConfirmAIGeneration = async () => {
    if (!currentSubmissionForAI || !user) return;

    setIsProcessingAIInDialog(true);
    toast({ title: "AI Processing Started", description: "AI map generation is now processing..." });
    
    try {
      await updateSubmissionStatusOnServer(currentSubmissionForAI.id, ProjectSubmissionStatus.PROCESSING);
      await new Promise(resolve => setTimeout(resolve, 1000)); 
      
      const projectDescription = `Project file: ${currentSubmissionForAI.originalFileName}. Submitted by ${user.name}. Project submitted for classroom: ${currentSubmissionForAI.classroomId || 'Personal Project'}. Focus on identifying main components and their interactions.`;
      
      // Enhanced mock projectCodeStructure
      const projectCodeStructure = `
        Project Root: ${currentSubmissionForAI.originalFileName} (Size: ${(currentSubmissionForAI.fileSize / 1024).toFixed(2)} KB)
        
        Key Directories & Files (Example):
        /src
          /components
            - Button.tsx (exports: ButtonComponent; details: Reusable UI button)
            - UserProfile.tsx (exports: UserProfileDisplay; uses: AvatarComponent)
          /services
            - authService.ts (exports: loginUser, logoutUser; depends_on: apiHelper)
            - dataService.ts (exports: fetchData, saveData; details: Handles API calls for core data)
          /pages
            - HomePage.tsx (uses: ButtonComponent, dataService)
            - SettingsPage.tsx (uses: UserProfileDisplay)
          - app.ts (main entry; imports: authService, dataService, HomePage)
        /utils
          - helpers.ts (exports: formatUtility, validationUtility)
        package.json (dependencies: react, nextjs, zod, lucide-react)
      `;
      
      const mapResult = await aiGenerateMapFromProject({ projectDescription, projectCodeStructure });
      
      let parsedMapData: ConceptMapData;
      try {
        parsedMapData = JSON.parse(mapResult.conceptMapData);
        if (!parsedMapData.nodes || !parsedMapData.edges) {
            throw new Error("AI output is not in the expected map data format (missing nodes/edges).");
        }
      } catch (parseError) {
        throw new Error(`Failed to parse AI-generated map data: ${(parseError as Error).message}`);
      }

      const newMapPayload = {
        name: `AI Map for ${currentSubmissionForAI.originalFileName}`,
        ownerId: user.id,
        mapData: parsedMapData,
        isPublic: false,
        sharedWithClassroomId: currentSubmissionForAI.classroomId,
      };

      const mapCreateResponse = await fetch('/api/concept-maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMapPayload),
      });

      if (!mapCreateResponse.ok) {
        const errorData = await mapCreateResponse.json();
        throw new Error(errorData.message || "Failed to save the AI-generated concept map.");
      }
      const createdMap: ConceptMap = await mapCreateResponse.json();

      await updateSubmissionStatusOnServer(currentSubmissionForAI.id, ProjectSubmissionStatus.COMPLETED, createdMap.id);
      
      toast({
        title: "AI Concept Map Generated",
        description: `Map "${createdMap.name}" created and linked to your submission.`,
      });

    } catch (aiError) {
      console.error("AI Map Generation or Saving Error:", aiError);
      if (currentSubmissionForAI) { // Check if still valid
        await updateSubmissionStatusOnServer(currentSubmissionForAI.id, ProjectSubmissionStatus.FAILED, null, (aiError as Error).message || "AI processing or map saving failed");
      }
      toast({
        title: "AI Map Generation Failed",
        description: (aiError as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsProcessingAIInDialog(false);
      setIsConfirmAIDialogOpen(false);
      setCurrentSubmissionForAI(null);
      router.push("/application/student/projects/submissions");
    }
  };

  const handleDeclineAIGeneration = () => {
    setIsConfirmAIDialogOpen(false);
    setCurrentSubmissionForAI(null);
    // Submission status remains PENDING, which is correct.
    router.push("/application/student/projects/submissions");
  };
  
  const isBusy = isSubmittingMetadata || isProcessingAIInDialog;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="projectFile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Archive (.rar or .zip)</FormLabel>
                <FormControl>
                  <Input 
                    type="file" 
                    accept=".zip,.rar,.ZIP,.RAR"
                    onChange={(e) => field.onChange(e.target.files)}
                    disabled={isBusy}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">Max file size: 5MB.</p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="classroomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Classroom (Optional)</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value} 
                  disabled={isBusy}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a classroom if this project is for a specific class" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={NONE_CLASSROOM_VALUE}>None</SelectItem>
                    {availableClassrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isBusy || !form.formState.isValid}>
            {isSubmittingMetadata ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isSubmittingMetadata ? "Submitting Record..." : isProcessingAIInDialog ? "AI is Processing..." : "Submit Project"}
          </Button>
          {isProcessingAIInDialog && <p className="text-sm text-center text-muted-foreground">AI is processing your project through the dialog action. Please wait...</p>}
        </form>
      </Form>

      {currentSubmissionForAI && (
        <AlertDialog open={isConfirmAIDialogOpen} onOpenChange={setIsConfirmAIDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>AI Map Generation</AlertDialogTitle>
              <AlertDialogDescription>
                Project record for "{currentSubmissionForAI.originalFileName}" submitted successfully.
                Do you want to attempt to generate a concept map for it now? This may take a moment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDeclineAIGeneration} disabled={isProcessingAIInDialog}>
                Later
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAIGeneration} disabled={isProcessingAIInDialog}>
                {isProcessingAIInDialog && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessingAIInDialog ? "Generating..." : "Generate Map"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

