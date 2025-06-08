
"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Eye, Library, Share2 as Share2Icon } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import type { ConceptMap, User } from "@/types";

interface ClassroomMapsTabProps {
  isLoading: boolean;
  error: string | null;
  maps: ConceptMap[];
  enrolledStudents: User[]; // For resolving owner name
  onFetchRetry: () => void;
}

export const ClassroomMapsTab: React.FC<ClassroomMapsTabProps> = ({
  isLoading,
  error,
  maps,
  enrolledStudents,
  onFetchRetry,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2">Loading maps...</p>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error Loading Maps"
        description={error}
        actionButton={
          <Button onClick={onFetchRetry} variant="link">
            Try Again
          </Button>
        }
      />
    );
  }

  if (!isLoading && !error && maps.length === 0) {
    return (
      <EmptyState
        icon={Share2Icon} // Using Share2Icon as Library might be confusing with classroom resources
        title="No Shared Maps"
        description="No concept maps have been shared with this classroom yet by students or the teacher."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Map Name</TableHead>
          <TableHead>Owner</TableHead>
          <TableHead>Last Updated</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {maps.map((map) => {
          const owner = enrolledStudents.find((s) => s.id === map.ownerId);
          return (
            <TableRow key={map.id}>
              <TableCell className="font-medium">{map.name}</TableCell>
              <TableCell>{owner?.name || map.ownerId}</TableCell>
              <TableCell>
                {new Date(map.updatedAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" asChild title="View map">
                  <Link href={`/application/concept-maps/editor/${map.id}?viewOnly=true`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
    
