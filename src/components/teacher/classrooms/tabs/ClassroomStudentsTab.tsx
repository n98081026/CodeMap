
"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Trash2, Users as UsersIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/layout/empty-state";
import type { User } from "@/types";
import { useVirtualizer } from '@tanstack/react-virtual';

interface ClassroomStudentsTabProps {
  isLoading: boolean;
  error: string | null;
  students: User[];
  onRemoveStudent: (studentId: string, studentName: string) => void;
  onFetchRetry: () => void;
}

export const ClassroomStudentsTab: React.FC<ClassroomStudentsTabProps> = ({
  isLoading,
  error,
  students,
  onRemoveStudent,
  onFetchRetry,
}) => {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, // Approximate height of a row
    overscan: 10,
  });

  if (isLoading && !error) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2">Loading students...</p>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error Loading Students"
        description={error}
        actionButton={
          <Button onClick={onFetchRetry} variant="link">
            Try Again
          </Button>
        }
      />
    );
  }

  if (!isLoading && !error && students.length === 0) {
    return (
      <EmptyState
        icon={UsersIcon}
        title="No Students Enrolled"
        description='No students are currently enrolled. Use the "Invite/Add Student" button on the main classroom page to add students.'
      />
    );
  }

  return (
    <div ref={parentRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}> {/* Adjust maxHeight as needed */}
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        {students.length > 0 ? (
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const student = students[virtualRow.index];
              if (!student) return null;
              return (
                <TableRow
                  key={student.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  ref={rowVirtualizer.measureElement}
                >
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Remove student">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will remove {student.name} from the
                            classroom. They will lose access to classroom materials.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onRemoveStudent(student.id, student.name)}
                          >
                            Remove Student
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        ) : (
           <tbody>
              <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                      No students to display.
                  </TableCell>
              </TableRow>
           </tbody>
        )}
      </Table>
    </div>
  );
};
    
