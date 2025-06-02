
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // Added Button
import { GitFork, Brain, SearchCode, Lightbulb, PlusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CanvasPlaceholderProps {
  extractedConcepts?: string[];
  suggestedRelations?: any[];
  expandedConcepts?: string[];
}

export function CanvasPlaceholder({
  extractedConcepts,
  suggestedRelations,
  expandedConcepts
}: CanvasPlaceholderProps) {
  const hasAiOutput =
    (extractedConcepts && extractedConcepts.length > 0) ||
    (suggestedRelations && suggestedRelations.length > 0) ||
    (expandedConcepts && expandedConcepts.length > 0);

  return (
    <Card className="h-[calc(100vh-200px)] w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner">
      <CardContent className="flex h-full flex-col items-center justify-center text-center p-4">
        {!hasAiOutput ? (
          <>
            <GitFork className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">Concept Map Canvas</h3>
            <p className="text-sm text-muted-foreground">
              Create nodes and edges using the toolbar above, or use AI tools to generate content.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              (Canvas interaction is a placeholder)
            </p>
          </>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-4 text-left">
              <h3 className="text-xl font-semibold text-muted-foreground mb-4 text-center">AI Generated Content</h3>

              {extractedConcepts && extractedConcepts.length > 0 && (
                <div className="p-3 border rounded-md bg-background/50">
                  <h4 className="font-semibold text-primary mb-2 flex items-center"><SearchCode className="mr-2 h-5 w-5"/>Extracted Concepts:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                    {extractedConcepts.map((concept, index) => (
                      <li key={`extracted-${index}`}>{concept}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-dashed">
                    <Button size="sm" variant="outline" disabled className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4"/> Add Selected Concepts to Map
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 text-center">(Interaction placeholder)</p>
                  </div>
                </div>
              )}

              {suggestedRelations && suggestedRelations.length > 0 && (
                <div className="p-3 border rounded-md bg-background/50">
                  <h4 className="font-semibold text-primary mb-2 flex items-center"><Lightbulb className="mr-2 h-5 w-5"/>Suggested Relations:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                    {suggestedRelations.map((rel, index) => (
                      <li key={`relation-${index}`}>{`${rel.source} -> ${rel.target} (${rel.relation})`}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-dashed">
                    <Button size="sm" variant="outline" disabled className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4"/> Add Selected Relations to Map
                    </Button>
                     <p className="text-xs text-muted-foreground mt-1 text-center">(Interaction placeholder)</p>
                  </div>
                </div>
              )}

              {expandedConcepts && expandedConcepts.length > 0 && (
                <div className="p-3 border rounded-md bg-background/50">
                  <h4 className="font-semibold text-primary mb-2 flex items-center"><Brain className="mr-2 h-5 w-5"/>Expanded Concepts:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                    {expandedConcepts.map((concept, index) => (
                      <li key={`expanded-${index}`}>{concept}</li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-dashed">
                    <Button size="sm" variant="outline" disabled className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4"/> Add Selected Ideas to Map
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 text-center">(Interaction placeholder)</p>
                  </div>
                </div>
              )}
               <p className="text-xs text-muted-foreground/70 mt-6 text-center">
                (This is a textual representation. Full canvas visualization is pending.)
              </p>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
