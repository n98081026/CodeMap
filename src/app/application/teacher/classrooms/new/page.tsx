
// src/app/application/teacher/classrooms/new/page.tsx
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Users, BookOpen, Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useAuth } from "@/contexts/auth-context"; 
import { UserRole } from "@/types";

const classroomFormSchema = z.object({
  name: z.string().min(3, { message: "Classroom name must be at least 3 characters." }).max(100),
  description: z.string().max(250).optional(),
});

export default function CreateClassroomPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth(); 

  let headerIconLink = "/application/teacher/dashboard"; // Default for teachers
  if (user && user.role === UserRole.ADMIN) {
     headerIconLink = "/application/admin/dashboard"; // Admins go to admin dashboard
  }

  const form = useForm<z.infer<typeof classroomFormSchema>>({
    resolver: zodResolver(classroomFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof classroomFormSchema>) {
    if (!user || !user.id) {
      toast({
        title: "Authentication Error",
        description: "Could not identify the teacher. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/classrooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, teacherId: user.id }),
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
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Create New Classroom"
        description="Set up a new classroom for your students."
        icon={BookOpen}
        iconLinkHref={headerIconLink}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Classroom Details</CardTitle>
          <CardDescription>Enter the name and an optional description for your new classroom.</CardDescription>
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
                      <Input placeholder="e.g., Introduction to Computer Science" {...field} disabled={form.formState.isSubmitting}/>
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
              <div className="flex justify-end space-x-2">
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

