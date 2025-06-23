"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel, // Or AlertDialogAction for "OK"
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GenerateMapSummaryOutput } from '@/ai/flows/generate-map-summary'; // Adjust path as needed

interface MapSummaryModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  summaryResult: GenerateMapSummaryOutput | null;
  onClose?: () => void; // Optional: if extra cleanup is needed beyond onOpenChange
}

export const MapSummaryModal: React.FC<MapSummaryModalProps> = ({
  isOpen,
  onOpenChange,
  summaryResult,
  onClose,
}) => {
  const handleModalClose = () => {
    onOpenChange(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {summaryResult?.error ? "Map Summary Error" : "AI Generated Map Summary"}
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription asChild>
          <ScrollArea className="max-h-[60vh] pr-4">
            {summaryResult?.error ? (
              <p className="text-destructive-foreground bg-destructive/10 p-3 rounded-md">
                {summaryResult.summary || "An unexpected error occurred."}
                <br />
                {summaryResult.error}
              </p>
            ) : summaryResult?.summary ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {summaryResult.summary}
              </p>
            ) : (
              <p>No summary available or still loading.</p>
            )}
          </ScrollArea>
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleModalClose}>Close</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
