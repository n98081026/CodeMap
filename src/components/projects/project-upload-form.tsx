
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
import type { Classroom } from "@/types"; // Assuming Classroom type is available
import { UploadCloud, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { generateMapFromProject as aiGenerateMapFromProject } from "@/ai/flows/generate-map-from-project";
import { useAuth } from "@/contexts/auth-context"; // To get studentId

// Mock classroom data - In a real app, fetch this if needed for classroom selection
const mockClassroomsForSelection: Classroom[] = [
  // This should ideally be populated by classrooms the student is enrolled in.
  // For now, it might be static or fetched if a studentClasses API exists.
  // For this form, it's less critical as classroomId is optional for submission metadata.
  { id: "class1", name: "Introduction to Programming", teacherId: "teacher1", studentIds: [] },
  { id: "test-classroom-1", name: "Introduction to AI", teacherId: "teacher-test-id", studentIds: [] },
];


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["application/zip", "application/vnd.rar", "application/x-rar-compressed", "application/octet-stream", "application/x-zip-compressed"];

const NONE_CLASSROOM_VALUE = "_NONE_"; // Special value for the "None" option

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);
  const [availableClassrooms, setAvailableClassrooms] = useState<Classroom[]>(mockClassroomsForSelection); // Placeholder

  // TODO: Fetch classrooms student is enrolled in for the dropdown if needed.
  // useEffect(() => {
  //   if (user) { /* fetch student's classrooms for selection */ }
  // }, [user]);


  const form = useForm<z.infer<typeof projectUploadSchema>>({
    resolver: zodResolver(projectUploadSchema),
    defaultValues: {
      projectFile: undefined,
      classroomId: "", // Initial value is empty string, placeholder will show
    },
  });

  async function onSubmit(values: z.infer<typeof projectUploadSchema>) {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to submit a project.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const file = values.projectFile[0];
    
    const submissionPayload = {
      studentId: user.id,
      originalFileName: file.name,
      fileSize: file.size,
      classroomId: values.classroomId === NONE_CLASSROOM_VALUE ? null : (values.classroomId || null),
    };

    try {
      // Actual file upload to a storage service would happen here or before this call.
      // For now, we only send metadata to the backend API.
      const response = await fetch('/api/projects/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create submission record");
      }
      
      const newSubmission = await response.json();
      toast({
        title: "Project Submitted",
        description: `"${file.name}" has been submitted. Record ID: ${newSubmission.id}`,
      });
      form.reset();
      
      // AI Map Generation (Mock or existing flow)
      if (confirm("Project submitted. Do you want to attempt to generate a concept map now? (This may take a moment and is a mock process)")) {
        setIsGeneratingMap(true);
        try {
          const projectDescription = `Project file: ${file.name}. Submitted for classroom: ${values.classroomId === NONE_CLASSROOM_VALUE ? 'N/A' : values.classroomId || 'N/A'}`;
          const projectCodeStructure = `File: ${file.name}, Size: ${file.size} bytes. (Mock structure for AI)`;
          const mapResult = await aiGenerateMapFromProject({ projectDescription, projectCodeStructure });
          
          console.log("AI Map Generation Result (mock):", mapResult.conceptMapData);

          toast({
            title: "AI Concept Map Generation (Mock)",
            description: "A concept map generation process has been initiated (mock).",
          });
           router.push("/application/student/projects/submissions");
        } catch (error) {
          console.error("AI Map Generation Error (Mock):", error);
          toast({
            title: "AI Map Generation Failed (Mock)",
            description: (error as Error).message || "Could not generate concept map.",
            variant: "destructive",
          });
        } finally {
          setIsGeneratingMap(false);
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
      setIsSubmitting(false);
    }
  }

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
                  disabled={isSubmitting || isGeneratingMap}
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
                value={field.value} // Use value for controlled component
                disabled={isSubmitting || isGeneratingMap}
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
        <Button type="submit" className="w-full" disabled={isSubmitting || isGeneratingMap || !form.formState.isValid}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Submitting Record..." : isGeneratingMap ? "AI Processing (Mock)..." : "Submit Project"}
        </Button>
        {isGeneratingMap && <p className="text-sm text-center text-muted-foreground">AI is processing your project. Please wait...</p>}
      </form>
    </Form>
  );
}
