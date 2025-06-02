
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
import type { Classroom, ProjectSubmission } from "@/types"; 
import { ProjectSubmissionStatus } from "@/types";
import { UploadCloud, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { generateMapFromProject as aiGenerateMapFromProject } from "@/ai/flows/generate-map-from-project";
import { useAuth } from "@/contexts/auth-context"; 

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
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>(mockClassroomsForSelection);

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
      toast({
        title: "Status Update Failed",
        description: `Could not update submission status to ${status}. ${(error as Error).message}`,
        variant: "destructive",
      });
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

    let newSubmission: ProjectSubmission | null = null;

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
      
      newSubmission = await response.json();
      toast({
        title: "Project Submitted",
        description: `"${file.name}" record created. ID: ${newSubmission!.id}`,
      });
      form.reset();
      
      if (confirm("Project record submitted. Do you want to attempt to generate a concept map now? (This is a mock AI process and may take a moment)")) {
        setIsProcessingAI(true);
        toast({ title: "AI Processing Started", description: "Mock AI map generation is now 'processing'..." });
        
        await updateSubmissionStatusOnServer(newSubmission!.id, ProjectSubmissionStatus.PROCESSING);

        try {
          // Simulate some delay for AI processing
          await new Promise(resolve => setTimeout(resolve, 3000)); 
          
          const projectDescription = `Project file: ${file.name}. Submitted for classroom: ${values.classroomId === NONE_CLASSROOM_VALUE ? 'N/A' : values.classroomId || 'N/A'}`;
          const projectCodeStructure = `File: ${file.name}, Size: ${file.size} bytes. (Mock structure for AI)`;
          
          // Call the actual AI flow (which is a server action)
          const mapResult = await aiGenerateMapFromProject({ projectDescription, projectCodeStructure });
          console.log("AI Map Generation Result (mock data):", mapResult.conceptMapData);

          const mockGeneratedMapId = `genmap-${newSubmission!.id}`;
          await updateSubmissionStatusOnServer(newSubmission!.id, ProjectSubmissionStatus.COMPLETED, mockGeneratedMapId);
          
          toast({
            title: "AI Concept Map Generation (Mock)",
            description: "Mock AI process 'completed'. A map ID has been associated.",
          });
        } catch (aiError) {
          console.error("AI Map Generation Error (Mock):", aiError);
          await updateSubmissionStatusOnServer(newSubmission!.id, ProjectSubmissionStatus.FAILED, null, (aiError as Error).message || "AI processing failed");
          toast({
            title: "AI Map Generation Failed (Mock)",
            description: (aiError as Error).message || "Could not generate concept map.",
            variant: "destructive",
          });
        } finally {
          setIsProcessingAI(false);
          router.push("/application/student/projects/submissions");
        }
      } else {
         router.push("/application/student/projects/submissions");
      }

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
  
  const isBusy = isSubmittingMetadata || isProcessingAI;

  return (
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
          {isSubmittingMetadata ? "Submitting Record..." : isProcessingAI ? "AI Processing (Mock)..." : "Submit Project"}
        </Button>
        {isProcessingAI && <p className="text-sm text-center text-muted-foreground">AI is 'processing' your project. Please wait...</p>}
      </form>
    </Form>
  );
}
