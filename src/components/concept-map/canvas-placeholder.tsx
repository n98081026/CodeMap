"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GitFork } from "lucide-react";

export function CanvasPlaceholder() {
  return (
    <Card className="h-[calc(100vh-200px)] w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner">
      <CardContent className="flex h-full flex-col items-center justify-center text-center">
        <GitFork className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-xl font-semibold text-muted-foreground">Concept Map Canvas</h3>
        <p className="text-sm text-muted-foreground">
          Create nodes and edges using the toolbar above.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          (Canvas interaction is a placeholder)
        </p>
      </CardContent>
    </Card>
  );
}
