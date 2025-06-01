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
import type { Classroom } from "@/types";
import { UploadCloud, Loader2 } from "lucide-react";
import { useState } from "react";
import { generateMapFromProject as aiGenerateMapFromProject } from "@/ai/flows/generate-map-from-project";


// Mock classroom data
const mockClassrooms: Classroom[] = [
  { id: "class1", name: "Introduction to Programming", teacherId: "teacher1", studentIds: [] },
  { id: "class2", name: "Web Development", teacherId: "teacher2", studentIds: [] },
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["application/zip", "application/vnd.rar", "application/x-rar-compressed", "application/octet-stream"]; // octet-stream for .rar on some systems

const projectUploadSchema = z.object({
  projectFile: z
    .custom<FileList>()
    .refine((files) => files && files.length === 1, "Project file is required.")
    .refine((files) => files && files[0].size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => files && ACCEPTED_FILE_TYPES.includes(files[0].type),
      ".zip and .rar files are accepted."
    ),
  classroomId: z.string().optional(), // Optional: select classroom
});

export function ProjectUploadForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingMap, setIsGeneratingMap] = useState(false);

  const form = useForm<z.infer<typeof projectUploadSchema>>({
    resolver: zodResolver(projectUploadSchema),
    defaultValues: {
      projectFile: undefined,
      classroomId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof projectUploadSchema>) {
    setIsSubmitting(true);
    const file = values.projectFile[0];
    console.log("Submitting project:", file.name, values.classroomId);

    // Mock file upload and submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Project Submitted",
      description: `"${file.name}" has been submitted for analysis.`,
    });
    setIsSubmitting(false);
    form.reset();
    
    // Option to trigger AI map generation here
    // For demo, let's add a button or automatically trigger it.
    // This part is a placeholder for more complex logic (e.g. queueing)
    if (confirm("Project submitted. Do you want to attempt to generate a concept map now? (This may take a moment)")) {
      setIsGeneratingMap(true);
      try {
        // In a real app, you'd pass project description and structure.
        // Here, we'll use a placeholder.
        const projectDescription = `Project file: ${file.name}. Submitted for classroom: ${values.classroomId || 'N/A'}`;
        const projectCodeStructure = `File: ${file.name}, Size: ${file.size} bytes. (Mock structure)`;

        const mapResult = await aiGenerateMapFromProject({ projectDescription, projectCodeStructure });
        console.log("AI Map Generation Result:", mapResult.conceptMapData);
        toast({
          title: "AI Concept Map Generated (Mock)",
          description: "A concept map has been generated for your project. You can view it in your submissions.",
        });
        // router.push("/student/projects/submissions"); // Navigate to submissions page
      } catch (error) {
        console.error("AI Map Generation Error:", error);
        toast({
          title: "AI Map Generation Failed",
          description: (error as Error).message || "Could not generate concept map.",
          variant: "destructive",
        });
      } finally {
        setIsGeneratingMap(false);
      }
    } else {
       router.push("/student/projects/submissions");
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
                  accept=".zip,.rar"
                  onChange={(e) => field.onChange(e.target.files)}
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a classroom if this project is for a specific class" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {mockClassrooms.map((classroom) => (
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
        <Button type="submit" className="w-full" disabled={isSubmitting || isGeneratingMap}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
          {isSubmitting ? "Submitting..." : isGeneratingMap ? "Generating Map..." : "Submit Project"}
        </Button>
        {isGeneratingMap && <p className="text-sm text-center text-muted-foreground">AI is generating your concept map. Please wait...</p>}
      </form>
    </Form>
  );
}
