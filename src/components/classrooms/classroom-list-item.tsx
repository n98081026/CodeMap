
"use client";

import type { Classroom } from "@/types";
import { UserRole } from "@/types";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, Edit, Trash2 } from "lucide-react";
import React from "react";
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
import { cn } from "@/lib/utils";


interface ClassroomListItemProps {
  classroom: Classroom;
  userRole: UserRole;
  onEdit?: (classroom: Classroom) => void;
  onDelete?: (classroomId: string, classroomName: string) => void;
  detailLinkHref?: string; // For student view, if applicable
}

export const ClassroomListItem: React.FC<ClassroomListItemProps> = ({
  classroom,
  userRole,
  onEdit,
  onDelete,
  detailLinkHref,
}) => {
  const isTeacherOrAdmin = userRole === UserRole.TEACHER || userRole === UserRole.ADMIN;
  const linkTarget = detailLinkHref || (isTeacherOrAdmin ? `/application/teacher/classrooms/${classroom.id}` : `/application/student/classrooms/${classroom.id}`);

  return (
    <Card key={classroom.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl">{classroom.name}</CardTitle>
        <CardDescription>
            {isTeacherOrAdmin && classroom.inviteCode && `Invite Code: `}
            {isTeacherOrAdmin && classroom.inviteCode && <span className="font-mono text-primary">{classroom.inviteCode}</span>}
            {!isTeacherOrAdmin && classroom.teacherName && `Teacher: ${classroom.teacherName}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="flex items-center text-sm text-muted-foreground">
          <Users className="mr-2 h-4 w-4" />
          <span>{classroom.studentIds?.length || 0} Students</span>
        </div>
        {classroom.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {isTeacherOrAdmin ? `Desc: ${classroom.description}` : classroom.description}
          </p>
        )}
      </CardContent>
      <CardFooter className={cn("grid gap-2", isTeacherOrAdmin ? "grid-cols-3" : "grid-cols-1")}>
        <Button asChild variant={isTeacherOrAdmin ? "default" : "outline"} size="sm" className={cn(isTeacherOrAdmin && "col-span-1")}>
          <Link href={linkTarget}>
            <ArrowRight className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">View</span>
          </Link>
        </Button>
        {isTeacherOrAdmin && onEdit && (
          <Button variant="outline" size="sm" className="col-span-1" onClick={() => onEdit(classroom)}>
            <Edit className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
          </Button>
        )}
        {isTeacherOrAdmin && onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="col-span-1">
                <Trash2 className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the classroom "{classroom.name}" and all associated data. Student enrollments will be removed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(classroom.id, classroom.name)}>
                  Delete Classroom
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
};

