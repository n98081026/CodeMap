
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
import { Settings, Save, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useCallback } from "react";
import type { SystemSettings } from "@/types";

const settingsFormSchema = z.object({
  enable_ai_project_analysis: z.boolean().default(true),
  default_concept_map_visibility: z.enum(["public", "private"]).default("private"),
  max_project_file_size_mb: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .min(1, { message: "Must be at least 1MB" })
    .max(100, { message: "Cannot exceed 100MB" })
    .default(10),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const defaultFormValues: SettingsFormValues = {
  enable_ai_project_analysis: true,
  default_concept_map_visibility: "private",
  max_project_file_size_mb: 10,
};

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [errorLoadingSettings, setErrorLoadingSettings] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: defaultFormValues, 
    mode: "onChange",
  });

  const fetchSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    setErrorLoadingSettings(null);
    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch settings");
      }
      const fetchedSettings: SystemSettings = await response.json();
      form.reset(fetchedSettings); 
    } catch (err) {
      const errorMessage = (err as Error).message;
      setErrorLoadingSettings(errorMessage);
      toast({ title: "Error Loading Settings", description: `${errorMessage}. Using default values.`, variant: "destructive" });
      form.reset(defaultFormValues); 
    } finally {
      setIsLoadingSettings(false);
    }
  }, [form, toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onSubmit = async (data: SettingsFormValues) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save settings");
      }
      await response.json(); 
      toast({
        title: "Settings Saved",
        description: "Your configuration has been successfully updated.",
      });
      form.reset(data, { keepValues: true, keepDirty: false, keepDefaultValues: false }); 
    } catch (error) {
      toast({
        title: "Error Saving Settings",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  const adminDashboardLink = "/application/admin/dashboard";
  
  if (isLoadingSettings) {
    return (
      <div className="space-y-6">
        <DashboardHeader
            title="System Settings"
            description="Configure global application settings and parameters."
            icon={Settings}
            iconLinkHref={adminDashboardLink}
        />
        <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="System Settings"
        description="Configure global application settings and parameters."
        icon={Settings}
        iconLinkHref={adminDashboardLink}
      />
      {errorLoadingSettings && !isLoadingSettings && (
        <Card className="border-destructive bg-destructive/10">
            <CardHeader>
                <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>Error Loading Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-destructive/90">{errorLoadingSettings}</p>
                <p className="text-sm text-destructive/80 mt-1">Displaying default values. Please try saving or reloading.</p>
            </CardContent>
        </Card>
      )}

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
                name="enable_ai_project_analysis"
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
                name="default_concept_map_visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default New Map Visibility</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
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
                name="max_project_file_size_mb"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Project File Size (MB)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 10" 
                        {...field} 
                        onChange={event => field.onChange(+event.target.value)}
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
