
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription as FormDesc, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Loader2 } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import Link from "next/link";
import { UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

const settingsFormSchema = z.object({
  enableAiProjectAnalysis: z.boolean().default(true),
  defaultConceptMapVisibility: z.enum(["public", "private"]).default("private"),
  maxProjectFileSizeMb: z.coerce // Coerce to number
    .number({ invalid_type_error: "Must be a number" })
    .min(1, { message: "Must be at least 1MB" })
    .max(100, { message: "Cannot exceed 100MB" })
    .default(10),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

// Simulate fetching and storing settings
const initialSettings: SettingsFormValues = {
  enableAiProjectAnalysis: true,
  defaultConceptMapVisibility: "private",
  maxProjectFileSizeMb: 10,
};


export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentSettings, setCurrentSettings] = useState<SettingsFormValues>(initialSettings);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    values: currentSettings, // Use 'values' to make it controlled by 'currentSettings'
    mode: "onChange", // Enable isDirty state
  });

  useEffect(() => {
    // When currentSettings changes (e.g., after a "save"), reset the form to reflect these new values
    // and mark it as not dirty.
    form.reset(currentSettings, { keepValues: true, keepDirty: false, keepDefaultValues: false });
  }, [currentSettings, form]);


  const onSubmit = async (data: SettingsFormValues) => {
    console.log("Saving settings (mock):", data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setCurrentSettings(data); // Update "persisted" settings
    toast({
      title: "Settings Saved (Mock)",
      description: "Your configuration has been updated.",
    });
    // Form will re-initialize due to useEffect on currentSettings
  };
  
  const adminDashboardLink = "/application/admin/dashboard";
  
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="System Settings"
        description="Configure global application settings and parameters."
        icon={Settings}
        iconLinkHref={adminDashboardLink}
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>AI Features</CardTitle>
              <CardDescription>
                Manage settings related to AI-powered functionalities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="enableAiProjectAnalysis"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Enable AI Project Analysis</FormLabel>
                      <FormDesc>
                        Allow users to generate concept maps from project submissions using AI.
                      </FormDesc>
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
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Concept Map Defaults</CardTitle>
              <CardDescription>
                Set default behaviors for newly created concept maps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="defaultConceptMapVisibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default New Map Visibility</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={form.formState.isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select default visibility" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="private">Private (Only owner can see)</SelectItem>
                        <SelectItem value="public">Public (Anyone with link can see)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDesc>
                      Sets the initial visibility for concept maps created by users.
                    </FormDesc>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>File Upload Limits</CardTitle>
              <CardDescription>
                Configure limits for project file uploads.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <FormField
                control={form.control}
                name="maxProjectFileSizeMb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Project File Size (MB)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 10" 
                        {...field} 
                        onChange={event => field.onChange(+event.target.value)} // Ensure value is number
                        disabled={form.formState.isSubmitting}
                      />
                    </FormControl>
                    <FormDesc>
                      Define the maximum allowable size for project archive uploads (1-100 MB).
                    </FormDesc>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
              {form.formState.isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {form.formState.isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
