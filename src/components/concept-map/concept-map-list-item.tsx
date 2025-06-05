
"use client";

import type { ConceptMap } from "@/types";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2 } from "lucide-react";
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

interface ConceptMapListItemProps {
  map: ConceptMap;
  onDelete: (mapId: string, mapName: string) => void;
  viewLinkHref?: string;
  editLinkHref?: string;
}

export const ConceptMapListItem: React.FC<ConceptMapListItemProps> = ({
  map,
  onDelete,
  viewLinkHref,
  editLinkHref,
}) => {
  const defaultViewLink = `/application/concept-maps/editor/${map.id}?viewOnly=true`;
  const defaultEditLink = `/application/concept-maps/editor/${map.id}`;
  return (
    <Card key={map.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl">{map.name}</CardTitle>
        <CardDescription>
          {map.isPublic ? "Public" : "Private"}
          {map.sharedWithClassroomId && ` | Shared with Classroom ID: ${map.sharedWithClassroomId}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(map.updatedAt).toLocaleDateString()}
        </p>
      </CardContent>
      <CardFooter className="grid grid-cols-3 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={viewLinkHref || defaultViewLink}>
            <Eye className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">View</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={editLinkHref || defaultEditLink}>
            <Edit className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
          </Link>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the concept map "{map.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(map.id, map.name)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
};
