
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { Classroom, ProjectSubmission, ConceptMapData, ConceptMap } from "@/types";
import { ProjectSubmissionStatus } from "@/types";
import { UploadCloud, Loader2, AlertTriangle, FileUp, Brain, Zap } from "lucide-react";
import { generateMapFromProject as aiGenerateMapFromProject } from "@/ai/flows/generate-map-from-project";
import { useAuth } from "@/contexts/auth-context";
import { useSupabaseStorageUpload } from "@/hooks/useSupabaseStorageUpload"; 
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
import { BYPASS_AUTH_FOR_TESTING } from '@/lib/config'; // Import bypass flag

const MAX_FILE_SIZE_MB_FROM_ENV = parseInt(process.env.NEXT_PUBLIC_MAX_PROJECT_FILE_SIZE_MB || "10", 10);
const MAX_FILE_SIZE = (MAX_FILE_SIZE_MB_FROM_ENV || 10) * 1024 * 1024; 

const ACCEPTED_FILE_TYPES_MIME = [
  "application/zip", "application/x-zip-compressed",
  "application/vnd.rar", "application/x-rar-compressed", 
  "application/gzip", "application/x-tar", 
  "application/octet-stream", 
];
const ACCEPTED_FILE_EXTENSIONS_STRING = ".zip, .rar, .tar, .gz, .tgz";


const NONE_CLASSROOM_VALUE = "_NONE_";
const SUPABASE_PROJECT_ARCHIVES_BUCKET = 'project_archives';

const projectUploadSchema = z.object({
  projectFile: z
    .custom<FileList>((val) => val instanceof FileList, "Project archive file is required.")
    .refine((files) => files && files.length === 1, "Exactly one project archive file is required.")
    .refine((files) => files && files[0].size <= MAX_FILE_SIZE, `Max file size is ${MAX_FILE_SIZE / (1024*1024)}MB.`)
    .refine(
      (files) => {
        if (!files || files.length === 0) return false;
        const file = files[0];
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const acceptedExtensions = ['zip', 'rar', 'tar', 'gz', 'tgz']; 
        
        if (ACCEPTED_FILE_TYPES_MIME.includes(file.type)) return true; 
        if (fileExtension && acceptedExtensions.includes(fileExtension)) return true; 
        if ((file.name.endsWith('.tar.gz') || file.name.endsWith('.tar.tgz')) && file.type === 'application/gzip') return true;

        return false;
      },
      `Accepted file types: ${ACCEPTED_FILE_EXTENSIONS_STRING}. Ensure your file has one of these extensions. If your .tar.gz or .tgz is not accepted, please try zipping it.`
    ).optional(), // Make optional for dev button
  classroomId: z.string().optional(),
  userGoals: z.string().max(500, "Goals/hints should be max 500 characters.").optional(),
});

export function ProjectUploadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  
  const { 
    isUploading: isUploadingFileWithHook, 
    error: uploadError, 
    uploadFile 
  } = useSupabaseStorageUpload({ bucketName: SUPABASE_PROJECT_ARCHIVES_BUCKET });

  const [isSubmittingMetadata, setIsSubmittingMetadata] = useState(false);
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>([]);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(false);
  const [errorLoadingClassrooms, setErrorLoadingClassrooms] = useState<string | null>(null);

  const [isConfirmAIDialogOpen, setIsConfirmAIDialogOpen] = useState(false);
  const [currentSubmissionForAI, setCurrentSubmissionForAI] = useState<ProjectSubmission | null>(null);
  const [currentUserGoalsForAI, setCurrentUserGoalsForAI] = useState<string | undefined>(undefined);
  const [isProcessingAIInDialog, setIsProcessingAIInDialog] = useState(false);
  const [isDevGenerating, setIsDevGenerating] = useState(false);

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
    } finally {
      setIsLoadingClassrooms(false);
    }
  }, [user]);

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
      userGoals: "",
    },
  });

  const updateSubmissionStatusOnServer = useCallback(async (submissionId: string, status: ProjectSubmissionStatus, generatedConceptMapId?: string | null, analysisError?: string | null) => {
    try {
      const payload: any = { status };
      if (generatedConceptMapId !== undefined) payload.generatedConceptMapId = generatedConceptMapId;
      if (analysisError !== undefined) payload.analysisError = analysisError;

      const response = await fetch(`/api/projects/submissions/${submissionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update submission status to ${status}`);
      }
    } catch (error) {
      console.error(`Error updating submission status for ${submissionId}:`, error);
      throw error; 
    }
  }, []);

  const processAISteps = useCallback(async (submission: ProjectSubmission, userGoals?: string) => {
    if (!user) throw new Error("User not authenticated for AI processing.");
    setIsProcessingAIInDialog(true); // Also use this for dev button visual cue
    toast({ title: "AI Processing Started", description: `Analysis of "${submission.originalFileName}" is starting...` });

    try {
      await updateSubmissionStatusOnServer(submission.id, ProjectSubmissionStatus.PROCESSING);
      const projectStoragePath = submission.fileStoragePath;
      if (!projectStoragePath) {
          throw new Error("File storage path is missing. Cannot proceed with AI analysis.");
      }
      const aiInputUserGoals = userGoals || `Analyze the project: ${submission.originalFileName}`;
      const mapResult = await aiGenerateMapFromProject({ projectStoragePath, userGoals: aiInputUserGoals });

      let parsedMapData: ConceptMapData;
      try {
        parsedMapData = JSON.parse(mapResult.conceptMapData);
        if (!parsedMapData.nodes || !parsedMapData.edges) {
            throw new Error("AI output format error (missing nodes/edges).");
        }
      } catch (parseError) {
        throw new Error(`Failed to parse AI map data: ${(parseError as Error).message}`);
      }

      const newMapPayload = {
        name: `AI Map for ${submission.originalFileName.split('.')[0]}`,
        ownerId: user.id, mapData: parsedMapData, isPublic: false,
        sharedWithClassroomId: submission.classroomId,
      };
      const mapCreateResponse = await fetch('/api/concept-maps', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newMapPayload),
      });
      if (!mapCreateResponse.ok) {
        const errorData = await mapCreateResponse.json();
        throw new Error(errorData.message || "Failed to save AI-generated map.");
      }
      const createdMap: ConceptMap = await mapCreateResponse.json();
      await updateSubmissionStatusOnServer(submission.id, ProjectSubmissionStatus.COMPLETED, createdMap.id);
      toast({ title: "AI Map Generated!", description: `Map "${createdMap.name}" created and linked.`, duration: 7000 });
      return createdMap;
    } catch (aiError) {
      console.error("AI Map Generation/Saving Error:", aiError);
      await updateSubmissionStatusOnServer(submission.id, ProjectSubmissionStatus.FAILED, null, (aiError as Error).message || "AI processing failed");
      throw aiError; // Re-throw to be caught by caller
    } finally {
      setIsProcessingAIInDialog(false);
    }
  }, [user, toast, updateSubmissionStatusOnServer]);


  const onSubmit = useCallback(async (values: z.infer<typeof projectUploadSchema>) => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!values.projectFile || values.projectFile.length === 0) {
        toast({ title: "File Required", description: "Please select a project archive file.", variant: "destructive" });
        return;
    }
    const file = values.projectFile[0];
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'dat';
    const filePathInBucket = `user-${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.${fileExtension}`;
    
    const uploadedFilePath = await uploadFile({ file, filePathInBucket });

    if (!uploadedFilePath) {
      return;
    }

    setIsSubmittingMetadata(true);
    const submissionPayload = {
      studentId: user.id,
      originalFileName: file.name,
      fileSize: file.size,
      classroomId: values.classroomId === NONE_CLASSROOM_VALUE ? null : (values.classroomId || null),
      fileStoragePath: uploadedFilePath, 
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
      
      toast({ title: "Project Submitted", description: `Record for "${file.name}" created. Confirm AI analysis next.`});
      form.reset(); 
      setCurrentSubmissionForAI(newSubmission);
      setCurrentUserGoalsForAI(values.userGoals || undefined);
      setIsConfirmAIDialogOpen(true);
    } catch (error) {
      toast({ title: "Submission Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmittingMetadata(false);
    }
  }, [user, toast, form, uploadFile]);

  const handleConfirmAIGeneration = useCallback(async () => {
    if (!currentSubmissionForAI) return;
    try {
      await processAISteps(currentSubmissionForAI, currentUserGoalsForAI);
    } catch (aiError) {
      toast({ title: "AI Map Generation Failed", description: (aiError as Error).message, variant: "destructive", duration: 7000 });
    } finally {
      setIsConfirmAIDialogOpen(false);
      setCurrentSubmissionForAI(null);
      setCurrentUserGoalsForAI(undefined);
      router.push("/application/student/projects/submissions");
    }
  }, [currentSubmissionForAI, currentUserGoalsForAI, processAISteps, toast, router]);

  const handleDeclineAIGeneration = useCallback(() => {
    toast({ title: "AI Analysis Skipped", description: `Your project "${currentSubmissionForAI?.originalFileName}" was submitted but AI analysis was not initiated. You can track it in 'My Submissions'.`, duration: 7000});
    setIsConfirmAIDialogOpen(false);
    setCurrentSubmissionForAI(null);
    setCurrentUserGoalsForAI(undefined);
    router.push("/application/student/projects/submissions");
  }, [router, currentSubmissionForAI?.originalFileName, toast]);

  const handleDevGenerateAIMap = useCallback(async () => {
    if (!user) {
      toast({ title: "Auth Error", description: "User not found for dev generation.", variant: "destructive" });
      return;
    }
    setIsDevGenerating(true);
    const mockProjectName = "Dev Mock Project.zip";
    const mockStoragePath = "mock/dev-test-project.zip"; // Path for AI flow
    const mockUserGoals = form.getValues("userGoals") || "Dev test: Analyze key components and data flow.";

    // 1. Create a submission record first
    const submissionPayload = {
      studentId: user.id,
      originalFileName: mockProjectName,
      fileSize: 1024 * 1024, // Dummy size
      classroomId: form.getValues("classroomId") === NONE_CLASSROOM_VALUE ? null : (form.getValues("classroomId") || null),
      fileStoragePath: mockStoragePath, 
    };

    try {
      const subResponse = await fetch('/api/projects/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });
      if (!subResponse.ok) {
        const errorData = await subResponse.json();
        throw new Error(errorData.message || "Failed to create mock submission record");
      }
      const newSubmission: ProjectSubmission = await subResponse.json();
      toast({ title: "Mock Submission Created", description: `ID: ${newSubmission.id}` });

      // 2. Now process AI using this submission (which contains mockStoragePath)
      await processAISteps(newSubmission, mockUserGoals);
      router.push("/application/student/projects/submissions");

    } catch (error) {
      toast({ title: "Dev AI Map Gen Failed", description: (error as Error).message, variant: "destructive", duration: 8000 });
    } finally {
      setIsDevGenerating(false);
    }
  }, [user, toast, form, processAISteps, router]);


  const isBusyOverall = isUploadingFileWithHook || isSubmittingMetadata || isProcessingAIInDialog || isDevGenerating;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="projectFile"
            render={({ field: { onChange, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>Project Archive File</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept={ACCEPTED_FILE_EXTENSIONS_STRING}
                    onChange={(e) => onChange(e.target.files)}
                    disabled={isBusyOverall}
                    {...fieldProps}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">Accepted: {ACCEPTED_FILE_EXTENSIONS_STRING}. Max size: {MAX_FILE_SIZE / (1024*1024)}MB.</p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="userGoals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Analysis Goals/Hints (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Focus on API routes, user authentication flow, or key data models."
                    {...field}
                    rows={3}
                    className="resize-none"
                    disabled={isBusyOverall}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-sm text-muted-foreground">Provide hints for the AI. Max 500 characters.</p>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="classroomId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Share with Classroom (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""} disabled={isBusyOverall || isLoadingClassrooms}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        isLoadingClassrooms ? "Loading classrooms..." :
                        errorLoadingClassrooms ? "Error loading classrooms" :
                        availableClassrooms.length === 0 ? "No classrooms enrolled" :
                        "Select a classroom (optional)"
                      } />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingClassrooms && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                    {errorLoadingClassrooms && <SelectItem value="error" disabled>Error loading</SelectItem>}
                    {!isLoadingClassrooms && !errorLoadingClassrooms && (
                      <>
                        <SelectItem value={NONE_CLASSROOM_VALUE}>None (Personal Project)</SelectItem>
                        {availableClassrooms.length === 0 && <SelectItem value="no_classrooms_available" disabled>No classrooms enrolled in</SelectItem>}
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
          <Button type="submit" className="w-full" disabled={isBusyOverall || !form.formState.isValid || !form.getValues("projectFile")}>
            {isUploadingFileWithHook ? <FileUp className="mr-2 h-4 w-4 animate-pulse" /> : isSubmittingMetadata ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isUploadingFileWithHook ? "Uploading..." : isSubmittingMetadata ? "Submitting..." : isProcessingAIInDialog ? "AI Processing..." : "Submit Project"}
          </Button>
          
          {BYPASS_AUTH_FOR_TESTING && (
            <Button type="button" variant="outline" className="w-full mt-4" onClick={handleDevGenerateAIMap} disabled={isBusyOverall}>
              {isDevGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
              Dev: Quick AI Map Gen (Mock Project)
            </Button>
          )}
        </form>
      </Form>

      {currentSubmissionForAI && (
        <AlertDialog open={isConfirmAIDialogOpen} onOpenChange={(open) => { if (!open && !isProcessingAIInDialog) { handleDeclineAIGeneration(); } setIsConfirmAIDialogOpen(open);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><Brain className="mr-2 h-5 w-5 text-primary"/> AI Concept Map Generation</AlertDialogTitle>
              <AlertDialogDescription>
                Project archive "{currentSubmissionForAI.originalFileName}" has been successfully submitted (file uploaded to secure storage).
                {currentUserGoalsForAI && <span className="block mt-2 text-sm">Analysis goals: "{currentUserGoalsForAI}"</span>}
                <br/>Would you like to proceed with AI-powered concept map generation now? This may take a few moments.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDeclineAIGeneration} disabled={isProcessingAIInDialog}>
                No, Later
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAIGeneration} disabled={isProcessingAIInDialog}>
                {isProcessingAIInDialog && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessingAIInDialog ? "Generating..." : "Yes, Generate Map"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
