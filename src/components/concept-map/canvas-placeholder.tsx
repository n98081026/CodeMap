
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitFork, Brain, SearchCode, Lightbulb, PlusCircle, Layers, Link2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CanvasPlaceholderProps {
  extractedConcepts?: string[];
  suggestedRelations?: Array<{ source: string; target: string; relation: string }>;
  expandedConcepts?: string[];
  mockCanvasItems?: Array<{ id: string; type: 'node' | 'edge'; label: string }>;
  onAddExtractedConcepts?: (concepts: string[]) => void;
  onAddSuggestedRelations?: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  onAddExpandedConcepts?: (concepts: string[]) => void;
  isViewOnlyMode?: boolean;
}

export function CanvasPlaceholder({
  extractedConcepts,
  suggestedRelations,
  expandedConcepts,
  mockCanvasItems,
  onAddExtractedConcepts,
  onAddSuggestedRelations,
  onAddExpandedConcepts,
  isViewOnlyMode
}: CanvasPlaceholderProps) {
  const hasAiOutput =
    (extractedConcepts && extractedConcepts.length > 0) ||
    (suggestedRelations && suggestedRelations.length > 0) ||
    (expandedConcepts && expandedConcepts.length > 0);

  const hasMockItems = mockCanvasItems && mockCanvasItems.length > 0;

  return (
    <Card className="h-[calc(100vh-200px)] w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner">
      <CardContent className="flex h-full flex-col items-center justify-center text-center p-4">
        {!hasAiOutput && !hasMockItems ? (
          <>
            <GitFork className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-muted-foreground">Concept Map Canvas</h3>
            <p className="text-sm text-muted-foreground">
              {isViewOnlyMode 
                ? "You are viewing this map in read-only mode." 
                : "Create nodes and edges using the toolbar above, or use AI tools to generate content."
              }
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              (Canvas interaction is a placeholder. AI suggestions or mock items will appear below if used.)
            </p>
          </>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-4 text-left">
              {(hasAiOutput || hasMockItems) && (
                 <h3 className="text-xl font-semibold text-muted-foreground mb-4 text-center">
                   {isViewOnlyMode ? "Viewing Map Content" : "Current Map Content (Mock & AI)"}
                 </h3>
              )}

              {hasMockItems && (
                <Card className="mb-4 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-primary flex items-center"><Layers className="mr-2 h-5 w-5"/>Mock Canvas Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-none text-sm space-y-1">
                      {mockCanvasItems?.map((item) => (
                        <li key={item.id} className="flex items-center">
                          {item.type === 'node' ? <Layers className="mr-2 h-4 w-4 text-blue-500"/> : <Link2 className="mr-2 h-4 w-4 text-green-500"/>}
                          {item.label}
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 text-center">(These are visual placeholders only and not part of savable map data.)</p>
                  </CardContent>
                </Card>
              )}

              {extractedConcepts && extractedConcepts.length > 0 && onAddExtractedConcepts && (
                <div className="p-3 border rounded-md bg-background/50">
                  <h4 className="font-semibold text-primary mb-2 flex items-center"><SearchCode className="mr-2 h-5 w-5"/>Extracted Concepts:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                    {extractedConcepts.map((concept, index) => (
                      <li key={`extracted-${index}`}>{concept}</li>
                    ))}
                  </ul>
                  {!isViewOnlyMode && (
                    <div className="pt-2 border-t border-dashed">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => onAddExtractedConcepts(extractedConcepts)} disabled={isViewOnlyMode}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add All Extracted Concepts to Map Data
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 text-center">(Modifies local map data. Save the map to persist.)</p>
                    </div>
                  )}
                </div>
              )}

              {suggestedRelations && suggestedRelations.length > 0 && onAddSuggestedRelations && (
                <div className="p-3 border rounded-md bg-background/50">
                  <h4 className="font-semibold text-primary mb-2 flex items-center"><Lightbulb className="mr-2 h-5 w-5"/>Suggested Relations:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                    {suggestedRelations.map((rel, index) => (
                      <li key={`relation-${index}`}>{`${rel.source} -> ${rel.target} (${rel.relation})`}</li>
                    ))}
                  </ul>
                  {!isViewOnlyMode && (
                    <div className="pt-2 border-t border-dashed">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => onAddSuggestedRelations(suggestedRelations)} disabled={isViewOnlyMode}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add All Suggested Relations to Map Data
                      </Button>
                       <p className="text-xs text-muted-foreground mt-1 text-center">(Modifies local map data. Save the map to persist.)</p>
                    </div>
                  )}
                </div>
              )}

              {expandedConcepts && expandedConcepts.length > 0 && onAddExpandedConcepts && (
                <div className="p-3 border rounded-md bg-background/50">
                  <h4 className="font-semibold text-primary mb-2 flex items-center"><Brain className="mr-2 h-5 w-5"/>Expanded Concepts:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 mb-3">
                    {expandedConcepts.map((concept, index) => (
                      <li key={`expanded-${index}`}>{concept}</li>
                    ))}
                  </ul>
                  {!isViewOnlyMode && (
                    <div className="pt-2 border-t border-dashed">
                      <Button size="sm" variant="outline" className="w-full" onClick={() => onAddExpandedConcepts(expandedConcepts)} disabled={isViewOnlyMode}>
                        <PlusCircle className="mr-2 h-4 w-4"/> Add All Expanded Ideas to Map Data
                      </Button>
                      <p className="text-xs text-muted-foreground mt-1 text-center">(Modifies local map data. Save the map to persist.)</p>
                    </div>
                  )}
                </div>
              )}
              {(hasAiOutput || hasMockItems) && (
                 <p className="text-xs text-muted-foreground/70 mt-6 text-center">
                   (This is a textual representation. Full canvas visualization is pending.)
                 </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
