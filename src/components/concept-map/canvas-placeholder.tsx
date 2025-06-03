
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GitFork, Brain, SearchCode, Lightbulb, PlusCircle, Layers, Link2, Box, Waypoints, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConceptMapData } from "@/types";
import { cn } from '@/lib/utils';

interface CanvasPlaceholderProps {
  mapData?: ConceptMapData;
  extractedConcepts?: string[];
  suggestedRelations?: Array<{ source: string; target: string; relation: string }>;
  expandedConcepts?: string[];
  onAddExtractedConcepts?: (concepts: string[]) => void;
  onAddSuggestedRelations?: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  onAddExpandedConcepts?: (concepts: string[]) => void;
  isViewOnlyMode?: boolean;
}

interface SelectableListItem {
  id: string; // For concepts, this is the concept text. For relations, a generated unique ID.
  label: string; // Display label
  originalData: any;
}

export const CanvasPlaceholder = React.memo(function CanvasPlaceholder({
  mapData,
  extractedConcepts = [],
  suggestedRelations = [],
  expandedConcepts = [],
  onAddExtractedConcepts,
  onAddSuggestedRelations,
  onAddExpandedConcepts,
  isViewOnlyMode
}: CanvasPlaceholderProps) {

  const [selectedExtracted, setSelectedExtracted] = useState<Set<string>>(new Set());
  const [selectedRelations, setSelectedRelations] = useState<Set<number>>(new Set()); // Use index for relations
  const [selectedExpanded, setSelectedExpanded] = useState<Set<string>>(new Set());

  useEffect(() => { // Reset selections when suggestions change
    setSelectedExtracted(new Set());
    setSelectedRelations(new Set());
    setSelectedExpanded(new Set());
  }, [extractedConcepts, suggestedRelations, expandedConcepts]);

  const handleToggleFactory = (
    type: 'extracted' | 'relation' | 'expanded'
  ) => (itemId: string | number, checked: boolean) => {
    if (type === 'extracted') {
      setSelectedExtracted(prev => {
        const next = new Set(prev);
        if (checked) next.add(itemId as string);
        else next.delete(itemId as string);
        return next;
      });
    } else if (type === 'relation') {
      setSelectedRelations(prev => {
        const next = new Set(prev);
        if (checked) next.add(itemId as number);
        else next.delete(itemId as number);
        return next;
      });
    } else if (type === 'expanded') {
      setSelectedExpanded(prev => {
        const next = new Set(prev);
        if (checked) next.add(itemId as string);
        else next.delete(itemId as string);
        return next;
      });
    }
  };

  const hasAiOutput = extractedConcepts.length > 0 || suggestedRelations.length > 0 || expandedConcepts.length > 0;
  const hasMapDataNodes = mapData && mapData.nodes && mapData.nodes.length > 0;
  const hasMapDataEdges = mapData && mapData.edges && mapData.edges.length > 0;
  const hasAnyContent = hasAiOutput || hasMapDataNodes || hasMapDataEdges;


  const renderSuggestionSection = (
    title: string,
    IconComponent: React.ElementType,
    items: any[],
    selectedSet: Set<any>,
    itemKeyPrefix: string,
    renderItemLabel: (item: any) => string,
    onAddSelected: (selectedItems: any[]) => void,
    onAddAll: () => void
  ) => {
    if (!items || items.length === 0) return null;

    const handleAddSelected = () => {
      const toAdd = items.filter((item, index) => selectedSet.has(itemKeyPrefix === 'relation-' ? index : item));
      if (toAdd.length > 0) {
        onAddSelected(toAdd);
      }
    };
    
    const handleSelectAll = (checked: boolean) => {
        const newSelectedSet = new Set<any>();
        if(checked) {
            items.forEach((item, index) => newSelectedSet.add(itemKeyPrefix === 'relation-' ? index : item));
        }
        if (itemKeyPrefix.startsWith('extracted-')) setSelectedExtracted(newSelectedSet as Set<string>);
        else if (itemKeyPrefix.startsWith('relation-')) setSelectedRelations(newSelectedSet as Set<number>);
        else if (itemKeyPrefix.startsWith('expanded-')) setSelectedExpanded(newSelectedSet as Set<string>);
    };
    
    const allSelected = items.length > 0 && selectedSet.size === items.length;


    return (
      <Card className="mb-4 bg-background/80 shadow-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold text-primary flex items-center">
              <IconComponent className="mr-2 h-5 w-5" /> {title} ({items.length})
            </CardTitle>
            {!isViewOnlyMode && items.length > 0 && (
                 <div className="flex items-center space-x-2">
                    <Checkbox 
                        id={`${itemKeyPrefix}-select-all`} 
                        checked={allSelected}
                        onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                    />
                    <Label htmlFor={`${itemKeyPrefix}-select-all`} className="text-xs">Select All</Label>
                </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="max-h-48 overflow-y-auto">
          <div className="space-y-2">
            {items.map((item, index) => {
              const key = itemKeyPrefix === 'relation-' ? index : item;
              const displayId = `${itemKeyPrefix}-${index}`;
              return (
                <div key={displayId} className="flex items-center space-x-2 p-2 border-b border-dashed last:border-b-0">
                  {!isViewOnlyMode && (
                    <Checkbox
                      id={displayId}
                      checked={selectedSet.has(key)}
                      onCheckedChange={(checked) => handleToggleFactory(
                        itemKeyPrefix.startsWith('extracted-') ? 'extracted' :
                        itemKeyPrefix.startsWith('relation-') ? 'relation' : 'expanded'
                      )(key, Boolean(checked))}
                    />
                  )}
                  <Label htmlFor={displayId} className="text-sm font-normal cursor-pointer flex-grow">
                    {renderItemLabel(item)}
                  </Label>
                </div>
              );
            })}
          </div>
        </CardContent>
        {!isViewOnlyMode && items.length > 0 && (
          <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddSelected}
              disabled={isViewOnlyMode || selectedSet.size === 0}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Selected ({selectedSet.size})
            </Button>
            <Button size="sm" variant="default" onClick={onAddAll} disabled={isViewOnlyMode} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add All Visible ({items.length})
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  return (
    <Card className="h-full w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner">
      <CardContent className="flex h-full flex-col items-center justify-center text-center p-0">
        {!hasAnyContent ? (
          <div className="p-4">
            <GitFork className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-muted-foreground">Concept Map Area</h3>
            <p className="text-sm text-muted-foreground">
              The interactive canvas is active above. Use the toolbar to add elements.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              This panel shows AI suggestions and textual map data.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-4 text-left">
              <h3 className="text-lg font-semibold text-muted-foreground mb-4 text-center">
                AI Suggestions & Map Data
              </h3>

              {hasMapDataNodes && (
                <Card className="mb-4 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-primary flex items-center">
                      <Box className="mr-2 h-5 w-5" />Nodes in Map ({mapData?.nodes.length})
                    </CardTitle>
                    <CardDescription className="text-xs">Current nodes on the canvas.</CardDescription>
                  </CardHeader>
                   <CardContent className="max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {mapData?.nodes.map((node) => (
                        <div key={node.id} className="p-3 border rounded-md shadow-sm bg-background hover:shadow-md transition-shadow">
                          <div className="flex items-center">
                            <Layers className="mr-2 h-4 w-4 text-primary flex-shrink-0" />
                            <span className="font-medium text-sm">{node.text}</span>
                            <span className="text-xs text-muted-foreground ml-2">({node.type || 'node'})</span>
                          </div>
                          {node.details && <p className="text-xs text-muted-foreground mt-1 pl-6">{node.details}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {hasMapDataEdges && (
                <Card className="mb-4 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-green-600 flex items-center">
                      <Waypoints className="mr-2 h-5 w-5" />Edges in Map ({mapData?.edges.length})
                    </CardTitle>
                     <CardDescription className="text-xs">Current connections on the canvas.</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-48 overflow-y-auto">
                    <ul className="list-none text-sm space-y-1">
                      {mapData?.edges.map((edge) => (
                        <li key={edge.id} className="flex items-center p-2 border-b border-dashed border-green-500/20">
                          <Link2 className="mr-2 h-4 w-4 text-green-500 flex-shrink-0" />
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                            <span><span className="font-medium">From:</span> {mapData.nodes.find(n => n.id === edge.source)?.text || edge.source.substring(0, 8) + '...'}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-1 hidden sm:inline-block transform rotate-0 sm:rotate-0"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            <span><span className="font-medium">To:</span> {mapData.nodes.find(n => n.id === edge.target)?.text || edge.target.substring(0, 8) + '...'}</span>
                            <span className="text-xs text-muted-foreground sm:ml-1">({edge.label})</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {onAddExtractedConcepts && renderSuggestionSection(
                "Extracted Concepts",
                SearchCode,
                extractedConcepts,
                selectedExtracted,
                "extracted-concept",
                (item) => item,
                onAddExtractedConcepts,
                () => onAddExtractedConcepts(extractedConcepts)
              )}

              {onAddSuggestedRelations && renderSuggestionSection(
                "Suggested Relations",
                Lightbulb,
                suggestedRelations,
                selectedRelations,
                "relation-",
                (item) => `${item.source} → ${item.target} (${item.relation})`,
                (selectedItems) => onAddSuggestedRelations(selectedItems),
                () => onAddSuggestedRelations(suggestedRelations)
              )}

              {onAddExpandedConcepts && renderSuggestionSection(
                "Expanded Ideas",
                Brain,
                expandedConcepts,
                selectedExpanded,
                "expanded-concept",
                (item) => item,
                onAddExpandedConcepts,
                () => onAddExpandedConcepts(expandedConcepts)
              )}

              {hasAnyContent && (
                <p className="text-xs text-muted-foreground/70 mt-6 text-center">
                  Map elements are rendered on the interactive canvas above.
                  {!isViewOnlyMode && " AI suggestions can be added to the map using the controls above."}
                </p>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
});
CanvasPlaceholder.displayName = "CanvasPlaceholder";

    