
"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Eye, Share2 as Share2Icon, ChevronLeft, ChevronRight } from "lucide-react"; // Added ChevronLeft, ChevronRight, removed Library
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import type { ConceptMap, User } from "@/types";

interface ClassroomMapsTabProps {
  isLoading: boolean;
  error: string | null;
  maps: ConceptMap[];
  enrolledStudents: User[]; // For resolving owner name
  onFetchRetry: () => void;
  currentPage: number;
  totalPages: number;
  totalMapsCount?: number;
  onPageChange: (newPage: number) => void;
}

export const ClassroomMapsTab: React.FC<ClassroomMapsTabProps> = React.memo(function ClassroomMapsTab({
  isLoading,
  error,
  maps,
  enrolledStudents,
  onFetchRetry,
  currentPage,
  totalPages,
  totalMapsCount,
  onPageChange,
}) {
  // The initial loading state (isLoading && maps.length === 0) is handled on the parent page.
  // This component will show a loader if isLoading is true during page changes.
  if (isLoading && maps.length === 0) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2">Loading maps...</p>
      </div>
    );
  }

  if (error && !isLoading) { // Show error only if not loading (prevents showing error during retry load)
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

  // Empty state when no maps are available at all (totalMapsCount === 0)
  // The parent page should ideally show a more prominent empty state if totalMapsCount is 0 after initial load.
  // This handles the case where the current page might be empty after filtering or if totalMapsCount is indeed 0.
  if (!isLoading && !error && maps.length === 0) {
    return (
      <EmptyState
        icon={Share2Icon}
        title={totalMapsCount === 0 ? "No Shared Maps Yet" : "No Maps on This Page"}
        description={totalMapsCount === 0 ? "No concept maps have been shared with this classroom yet." : "There are no maps to display on the current page."}
      />
    );
  }

  return (
    <>
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
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center items-center space-x-4">
          <Button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
            {totalMapsCount !== undefined && ` (${totalMapsCount} maps)`}
          </span>
          <Button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            variant="outline"
            size="sm"
          >
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
});
ClassroomMapsTab.displayName = "ClassroomMapsTab";
    
