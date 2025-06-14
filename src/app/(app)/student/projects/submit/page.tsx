"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectUploadForm } from "@/components/projects/project-upload-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FileText } from "lucide-react";

export default function SubmitProjectPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Submit Project"
        description="Upload your project archive (.rar or .zip) for analysis and concept map generation."
        icon={FileText}
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Upload Project File</CardTitle>
          <CardDescription>
            Ensure your project is archived into a single .rar or .zip file. 
            The system will attempt to analyze its structure and generate a concept map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectUploadForm />
        </CardContent>
      </Card>
    </div>
  );
}
