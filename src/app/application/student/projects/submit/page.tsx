
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectUploadForm } from "@/components/projects/project-upload-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SubmitProjectPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Submit Project"
        description="Upload your project archive (.rar or .zip) for analysis and concept map generation."
        icon={FileText}
      >
        <Button asChild variant="outline">
          <Link href="/application/student/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </DashboardHeader>
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
