
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitFork, Brain, SearchCode, Lightbulb, PlusCircle, Layers, Link2, Box, Waypoints } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConceptMapData } from "@/types";


interface CanvasPlaceholderProps {
  mapData?: ConceptMapData;
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
  mapData,
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
  const hasMapDataNodes = mapData && mapData.nodes && mapData.nodes.length > 0;
  const hasMapDataEdges = mapData && mapData.edges && mapData.edges.length > 0;
  const hasAnyContent = hasAiOutput || hasMockItems || hasMapDataNodes || hasMapDataEdges;

  return (
    <Card className="h-[calc(100vh-200px)] w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner">
      <CardContent className="flex h-full flex-col items-center justify-center text-center p-4">
        {!hasAnyContent ? (
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
              (Canvas interaction is a placeholder. Map data, AI suggestions, or mock items will appear below if used.)
            </p>
          </>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-4 text-left">
               <h3 className="text-xl font-semibold text-muted-foreground mb-4 text-center">
                 {isViewOnlyMode ? "Viewing Map Content" : "Current Map Content"}
               </h3>

              {/* Display Nodes from mapData */}
              {hasMapDataNodes && (
                <Card className="mb-4 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-primary flex items-center"><Box className="mr-2 h-5 w-5"/>Nodes in Map ({mapData?.nodes.length})</CardTitle>
                    <CardDescription className="text-xs">These nodes are part of the current map data. Save the map to persist.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-none text-sm space-y-1">
                      {mapData?.nodes.map((node) => (
                        <li key={node.id} className="flex items-center">
                          <Layers className="mr-2 h-4 w-4 text-blue-500"/>
                          {node.text} <span className="text-xs text-muted-foreground ml-1">({node.type || 'node'})</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Display Edges from mapData */}
              {hasMapDataEdges && (
                 <Card className="mb-4 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-green-600 flex items-center"><Waypoints className="mr-2 h-5 w-5"/>Edges in Map ({mapData?.edges.length})</CardTitle>
                     <CardDescription className="text-xs">These edges are part of the current map data. Save the map to persist.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-none text-sm space-y-1">
                      {mapData?.edges.map((edge) => (
                        <li key={edge.id} className="flex items-center">
                           <Link2 className="mr-2 h-4 w-4 text-green-500"/>
                           Source: {mapData.nodes.find(n=>n.id === edge.source)?.text || edge.source.substring(0,6)+'...'} 
                           <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-1"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                           Target: {mapData.nodes.find(n=>n.id === edge.target)?.text || edge.target.substring(0,6)+'...'} 
                           <span className="text-xs text-muted-foreground ml-1">({edge.label})</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {/* Display Mock Visual Items (e.g., for edges that couldn't be formed) */}
              {hasMockItems && (
                <Card className="mb-4 bg-amber-500/10">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-amber-600 flex items-center"><Layers className="mr-2 h-5 w-5"/>Mock Visual Items</CardTitle>
                     <CardDescription className="text-xs">These are temporary visual placeholders and not part of savable map data.</CardDescription>
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
                  </CardContent>
                </Card>
              )}

              {/* AI Suggestions Sections */}
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
                    </div>
                  )}
                </div>
              )}
              {hasAnyContent && (
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

    