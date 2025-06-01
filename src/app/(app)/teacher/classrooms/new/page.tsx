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
import { Users, BookOpen } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

const classroomFormSchema = z.object({
  name: z.string().min(3, { message: "Classroom name must be at least 3 characters." }).max(100),
  description: z.string().max(250).optional(),
});

export default function CreateClassroomPage() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof classroomFormSchema>>({
    resolver: zodResolver(classroomFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function onSubmit(values: z.infer<typeof classroomFormSchema>) {
    // Mock API call
    console.log("Creating classroom:", values);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast({
      title: "Classroom Created",
      description: `Classroom "${values.name}" has been successfully created.`,
    });
    router.push("/teacher/classrooms"); // Redirect to classrooms list
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Create New Classroom"
        description="Set up a new classroom for your students."
        icon={BookOpen}
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
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
                      <Input placeholder="e.g., Introduction to Computer Science" {...field} />
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating..." : <><Users className="mr-2 h-4 w-4" /> Create Classroom</>}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
