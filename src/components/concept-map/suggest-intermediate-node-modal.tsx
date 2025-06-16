"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { IntermediateNodeSuggestionResponse } from '@/ai/flows'; // Adjust path if needed
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react'; // Removed CornerDownRight as it wasn't used in final JSX

interface SuggestIntermediateNodeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  suggestionData: IntermediateNodeSuggestionResponse | null;
  onConfirm: () => void;
  onCancel: () => void;
  sourceNodeText?: string;
  targetNodeText?: string;
  originalEdgeLabel?: string;
}

export const SuggestIntermediateNodeModal: React.FC<SuggestIntermediateNodeModalProps> = ({
  isOpen,
  onOpenChange,
  suggestionData,
  onConfirm,
  onCancel,
  sourceNodeText = "Source Node", // Default values
  targetNodeText = "Target Node", // Default values
  originalEdgeLabel = "(unlabeled)" // Default values
}) => {
  if (!isOpen || !suggestionData) return null; // Ensure isOpen is also checked here

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>AI Suggestion: Add Intermediate Node</AlertDialogTitle>
          <AlertDialogDescription>
            The AI suggests adding an intermediate node between{' '}
            <Badge variant="outline" className="mx-1 whitespace-nowrap">{sourceNodeText}</Badge>
            and
            <Badge variant="outline" className="ml-1 whitespace-nowrap">{targetNodeText}</Badge>.
            Original connection: <Badge variant="outline" className="ml-1 whitespace-nowrap">{originalEdgeLabel}</Badge>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-3 text-sm">
          <p className="font-semibold">Suggested New Node:</p>
          <div className="p-3 border rounded-md bg-muted/30">
            <p><strong className="font-medium">Text:</strong> {suggestionData.suggestedNodeText}</p>
            {suggestionData.suggestedNodeDetails && (
              <p className="mt-1 text-xs text-muted-foreground">
                <strong>Details:</strong> {suggestionData.suggestedNodeDetails}
              </p>
            )}
          </div>

          <p className="font-semibold mt-3">New Connections:</p>
          <div className="space-y-2">
            <div className="flex items-center text-xs p-2 border rounded-md">
              <Badge variant="secondary" className="mr-2 whitespace-nowrap">{sourceNodeText}</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 flex-shrink-0" />
              <Badge variant="default" className="mr-2 bg-blue-500 hover:bg-blue-600 whitespace-nowrap">{suggestionData.labelToSource || "related to"}</Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 flex-shrink-0" />
              <Badge variant="outline" className="bg-green-100 dark:bg-green-700 dark:text-green-50 border-green-500 whitespace-nowrap">{suggestionData.suggestedNodeText}</Badge>
            </div>
            <div className="flex items-center text-xs p-2 border rounded-md">
              <Badge variant="outline" className="mr-2 bg-green-100 dark:bg-green-700 dark:text-green-50 border-green-500 whitespace-nowrap">{suggestionData.suggestedNodeText}</Badge>
               <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 flex-shrink-0" />
              <Badge variant="default" className="mr-2 bg-blue-500 hover:bg-blue-600 whitespace-nowrap">{suggestionData.labelToTarget || "related to"}</Badge>
               <ArrowRight className="h-3 w-3 text-muted-foreground mx-1 flex-shrink-0" />
              <Badge variant="secondary" className="mr-2 whitespace-nowrap">{targetNodeText}</Badge>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-primary hover:bg-primary/90">
            Add to Map
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
