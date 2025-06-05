// src/app/application/teacher/classrooms/new/page.tsx
"use client";

import React, { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Users, BookOpen, Loader2, FilePlus, BrainCog } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";

const classroomFormSchema = z.object({
  name: z.string().min(3, { message: "Classroom name must be at least 3 characters." }).max(100),
  description: z.string().max(250).optional(),
  subject: z.string().max(100).optional(),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  enableStudentAiAnalysis: z.boolean().default(true).optional(),
});

export default function CreateClassroomPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth(); 

  const headerIconLink = "/application/teacher/dashboard";

  const form = useForm<z.infer<typeof classroomFormSchema>>({
    resolver: zodResolver(classroomFormSchema),
    defaultValues: {
      name: "",
      description: "",
      subject: "",
      difficulty: undefined,
      enableStudentAiAnalysis: true,
    },
  });

  const onSubmit = useCallback(async (values: z.infer<typeof classroomFormSchema>) => {
    if (!user || !user.id) {
      toast({
        title: "Authentication Error",
        description: "Could not identify the teacher. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        name: values.name,
        description: values.description,
        teacherId: user.id,
        subject: values.subject,
        difficulty: values.difficulty,
        enableStudentAiAnalysis: values.enableStudentAiAnalysis,
      };

      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create classroom");
      }

      const newClassroom = await response.json();
      toast({
        title: "Classroom Created",
        description: `Classroom "${newClassroom.name}" has been successfully created.`,
      });
      router.push("/application/teacher/classrooms"); 
    } catch (error) {
      toast({
        title: "Error Creating Classroom",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [user, toast, router]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Create New Classroom"
        description="Set up a new classroom for your students with detailed options."
        icon={FilePlus}
        iconLinkHref={headerIconLink}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Classroom Details</CardTitle>
          <CardDescription>Enter the information for your new classroom.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classroom Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Introduction to AI" {...field} disabled={form.formState.isSubmitting}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="A brief description of the classroom's focus or goals."
                        className="resize-none"
                        {...field}
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Computer Science, Web Development" {...field} disabled={form.formState.isSubmitting}/>
                    </FormControl>
                     <FormDescription>
                      The main subject or topic of this classroom.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty Level (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={form.formState.isSubmitting}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enableStudentAiAnalysis"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center">
                        <BrainCog className="mr-2 h-5 w-5 text-primary" /> Enable AI Project Analysis for Students
                      </FormLabel>
                      <FormDescription>
                        Allow students in this classroom to submit projects for AI-powered concept map generation.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={form.formState.isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
                  {form.formState.isSubmitting ? "Creating..." : "Create Classroom"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
