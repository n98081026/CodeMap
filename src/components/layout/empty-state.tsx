
"use client";

import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = React.memo(function EmptyState({
  icon: Icon,
  title,
  description,
  actionButton,
}) {
  return (
    <Card className="shadow-md w-full max-w-lg mx-auto">
      <CardHeader className="items-center text-center">
        <Icon className="h-16 w-16 text-muted-foreground/70 mb-4" />
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {actionButton && (
        <CardContent className="text-center">
          {actionButton}
        </CardContent>
      )}
    </Card>
  );
});
EmptyState.displayName = "EmptyState";
