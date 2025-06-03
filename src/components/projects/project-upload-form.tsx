"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { UploadCloud, Loader2, AlertTriangle } from "lucide-react";
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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ACCEPTED_FILE_TYPES_MIME = [
  "application/zip", // .zip
  "application/vnd.rar", // .rar (official)
  "application/x-rar-compressed", // .rar (common)
  "application/x-zip-compressed", // .zip (common)
  "application/gzip", // .gz, .tar.gz (for tar.gz, file name check is better)
  "application/x-tar", // .tar (often part of .tar.gz)
  "application/octet-stream", // Fallback for some archives
];
// For display and more lenient client-side check
const ACCEPTED_FILE_EXTENSIONS_STRING = ".zip, .rar, .tar.gz, .tgz";


const NONE_CLASSROOM_VALUE = "_NONE_";

const projectUploadSchema = z.object({
  projectFile: z
    .custom<FileList>()
    .refine((files) => files && files.length === 1, "Project archive file is required.")
    .refine((files) => files && files[0].size <= MAX_FILE_SIZE, `Max file size is ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(
      (files) => {
        if (!files || files.length === 0) return false;
        const file = files[0];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const acceptedExtensions = ['zip', 'rar', 'gz', 'tgz', 'tar']; // tar.gz and tgz are variants
        
        // Check MIME type first, then extension as fallback
        if (ACCEPTED_FILE_TYPES_MIME.includes(file.type)) return true;
        if (fileExtension && acceptedExtensions.includes(fileExtension)) return true;
        // Special case for .tar.gz where MIME might be application/gzip but name indicates .tar.gz
        if (file.name.endsWith('.tar.gz') && file.type === 'application/gzip') return true;

        return false;
      },
      `Accepted file types: ${ACCEPTED_FILE_EXTENSIONS_STRING}. If your .tar.gz or .tgz is not accepted, please try zipping it.`
    ),
  classroomId: z.string().optional(),
});

export function ProjectUploadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmittingMetadata, setIsSubmittingMetadata] = useState(false);
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>([]);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(false);
  const [errorLoadingClassrooms, setErrorLoadingClassrooms] = useState<string | null>(null);


  const [isConfirmAIDialogOpen, setIsConfirmAIDialogOpen] = useState(false);
  const [currentSubmissionForAI, setCurrentSubmissionForAI] = useState<ProjectSubmission | null>(null);
  const [isProcessingAIInDialog, setIsProcessingAIInDialog] = useState(false);

  const fetchAvailableClassrooms = useCallback(async () => {
    if (!user) return;
    setIsLoadingClassrooms(true);
    setErrorLoadingClassrooms(null);
    try {
      const response = await fetch(`/api/classrooms?studentId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch student's classrooms");
      }
      const data: Classroom[] = await response.json();
      setAvailableClassrooms(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setErrorLoadingClassrooms(errorMessage);
      toast({ title: "Error Loading Classrooms", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingClassrooms(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchAvailableClassrooms();
    }
  }, [user, fetchAvailableClassrooms]);


  const form = useForm<z.infer<typeof projectUploadSchema>>({
    resolver: zodResolver(projectUploadSchema),
    defaultValues: {
      projectFile: undefined,
      classroomId: "",
    },
  });

  const updateSubmissionStatusOnServer = useCallback(async (submissionId: string, status: ProjectSubmissionStatus, generatedConceptMapId?: string | null, analysisError?: string | null) => {
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
  }, []);

  const onSubmit = useCallback(async (values: z.infer<typeof projectUploadSchema>) => {
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
      // Simulate file upload to storage here if needed - for now, we proceed to metadata creation
      // In a real app:
      // 1. Upload file to Supabase Storage (or other)
      // 2. Get storagePath
      // 3. Include storagePath in submissionPayload

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
        title: "Project Archive Submitted",
        description: `Record for "${file.name}" created. Next, confirm AI analysis.`,
      });
      form.reset();
      setCurrentSubmissionForAI(newSubmission);
      setIsConfirmAIDialogOpen(true);

    } catch (error) {
      toast({
        title: "Submission Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingMetadata(false);
    }
  }, [user, toast, form]);

  const handleConfirmAIGeneration = useCallback(async () => {
    if (!currentSubmissionForAI || !user) return;

    setIsProcessingAIInDialog(true);
    toast({ title: "AI Processing Started", description: `Analysis of "${currentSubmissionForAI.originalFileName}" is now processing...` });

    try {
      await updateSubmissionStatusOnServer(currentSubmissionForAI.id, ProjectSubmissionStatus.PROCESSING);
      // Simulate backend processing time for file analysis before AI call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // For now, projectCodeStructure is still a mock.
      // In the future, this structure would come from a Genkit tool that analyzes the uploaded file.
      const projectDescription = `Project archive: ${currentSubmissionForAI.originalFileName}. Submitted by ${user.name}. This analysis is based on a conceptual understanding of the project. Classroom: ${currentSubmissionForAI.classroomId || 'Personal Project'}.`;
      const projectCodeStructure = `
        File: ${currentSubmissionForAI.originalFileName} (Size: ${(currentSubmissionForAI.fileSize / (1024*1024)).toFixed(2)} MB)
        (Mocked Structure - Full analysis from archive content is pending implementation)
        /src
          /components
            - ExampleComponent.tsx (UI element)
            - AnotherComponent.tsx
          /services
            - apiService.ts (Handles external calls)
          /utils
            - formatters.ts
          - App.tsx (Main application component)
        package.json (dependencies: react, typescript)
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
        name: `AI Map for ${currentSubmissionForAI.originalFileName.split('.')[0]}`, // Use filename without extension
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
        description: `Map "${createdMap.name}" created from "${currentSubmissionForAI.originalFileName}" and linked.`,
      });

    } catch (aiError) {
      console.error("AI Map Generation or Saving Error:", aiError);
      if (currentSubmissionForAI) {
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
  }, [currentSubmissionForAI, user, toast, router, updateSubmissionStatusOnServer]);

  const handleDeclineAIGeneration = useCallback(() => {
    setIsConfirmAIDialogOpen(false);
    // Update status to PENDING if it was set to PROCESSING optimistically before dialog,
    // or leave as is if the server already knows it's PENDING from creation.
    // For this flow, it's PENDING from creation.
    setCurrentSubmissionForAI(null);
    router.push("/application/student/projects/submissions");
  }, [router]);

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
                <FormLabel>Project Archive File</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept={ACCEPTED_FILE_EXTENSIONS_STRING}
                    onChange={(e) => field.onChange(e.target.files)}
                    disabled={isBusy}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">Accepted: {ACCEPTED_FILE_EXTENSIONS_STRING}. Max size: {MAX_FILE_SIZE / (1024*1024)}MB.</p>
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
                  disabled={isBusy || isLoadingClassrooms || !!errorLoadingClassrooms}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        isLoadingClassrooms ? "Loading classrooms..." :
                        errorLoadingClassrooms ? "Error loading classrooms" :
                        "Select a classroom (optional)"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingClassrooms ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : errorLoadingClassrooms ? (
                      <SelectItem value="error" disabled>Error loading</SelectItem>
                    ) : (
                      <>
                        <SelectItem value={NONE_CLASSROOM_VALUE}>None (Personal Project)</SelectItem>
                        {availableClassrooms.length === 0 && (
                           <SelectItem value="no_classrooms" disabled>No classrooms enrolled</SelectItem>
                        )}
                        {availableClassrooms.map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.id}>
                            {classroom.name}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
                {errorLoadingClassrooms && !isLoadingClassrooms && (
                    <p className="text-xs text-destructive flex items-center mt-1">
                        <AlertTriangle className="mr-1 h-3 w-3" /> {errorLoadingClassrooms}.
                        <Button variant="link" size="sm" className="p-0 h-auto ml-1" onClick={fetchAvailableClassrooms}>Retry?</Button>
                    </p>
                )}
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isBusy || !form.formState.isValid}>
            {isSubmittingMetadata ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isSubmittingMetadata ? "Submitting Record..." : isProcessingAIInDialog ? "AI is Processing..." : "Submit Project Archive"}
          </Button>
          {isProcessingAIInDialog && <p className="text-sm text-center text-muted-foreground">AI analysis is processing via the dialog action. Please wait...</p>}
        </form>
      </Form>

      {currentSubmissionForAI && (
        <AlertDialog open={isConfirmAIDialogOpen} onOpenChange={setIsConfirmAIDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>AI Map Generation</AlertDialogTitle>
              <AlertDialogDescription>
                Project archive record for "{currentSubmissionForAI.originalFileName}" created.
                Do you want to attempt to generate a concept map from this project? This may take a moment.
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
