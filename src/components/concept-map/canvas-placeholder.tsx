
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { GitFork, Brain, SearchCode, Lightbulb, PlusCircle, Layers, Link2, Box, Waypoints, Trash2, Info, MessageSquareDashed } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConceptMapData, ConceptMapNode } from "@/types";
import { cn } from '@/lib/utils';

interface CanvasPlaceholderProps {
  mapData?: ConceptMapData;
  currentMapNodes?: ConceptMapNode[];
  extractedConcepts?: string[];
  suggestedRelations?: Array<{ source: string; target: string; relation: string }>;
  expandedConcepts?: string[];
  onAddExtractedConcepts?: (concepts: string[]) => void;
  onAddSuggestedRelations?: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  onAddExpandedConcepts?: (concepts: string[]) => void;
  onClearExtractedConcepts?: () => void;
  onClearSuggestedRelations?: () => void;
  onClearExpandedConcepts?: () => void;
  isViewOnlyMode?: boolean;
}

export const CanvasPlaceholder = React.memo(function CanvasPlaceholder({
  mapData,
  currentMapNodes = [],
  extractedConcepts = [],
  suggestedRelations = [],
  expandedConcepts = [],
  onAddExtractedConcepts,
  onAddSuggestedRelations,
  onAddExpandedConcepts,
  onClearExtractedConcepts,
  onClearSuggestedRelations,
  onClearExpandedConcepts,
  isViewOnlyMode
}: CanvasPlaceholderProps) {

  const [selectedExtracted, setSelectedExtracted] = useState<Set<string>>(new Set());
  const [selectedRelations, setSelectedRelations] = useState<Set<number>>(new Set());
  const [selectedExpanded, setSelectedExpanded] = useState<Set<string>>(new Set());

  const existingNodeTexts = useMemo(() => {
    return new Set(currentMapNodes.map(n => n.text.toLowerCase().trim()));
  }, [currentMapNodes]);

  useEffect(() => {
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
    renderItemLabel: (item: any, isExistingOnMap: boolean, isExistingInRelation?: {source?: boolean, target?: boolean}) => React.ReactNode,
    checkIfItemExistsOnMap: (item: any) => boolean,
    checkIfRelationNodesExistOnMap: (relation: { source: string; target: string }) => { source?: boolean, target?: boolean },
    onAddSelected: (selectedItems: any[]) => void,
    onClearCategory?: () => void,
    cardClassName?: string
  ) => {
    if (!onAddSelected && items.length === 0 && !mapData) return null; // Don't render if no action and no items
    if (!items || items.length === 0) {
      return (
        <Card className={cn("mb-4 bg-background/80 shadow-md", cardClassName)}>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-muted-foreground flex items-center">
              <IconComponent className="mr-2 h-5 w-5" /> {title} (0)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground text-center py-4">
              <MessageSquareDashed className="mx-auto h-8 w-8 mb-2 opacity-50" />
              No new {title.toLowerCase()} to display.
            </div>
          </CardContent>
        </Card>
      );
    }
    
    const selectableItems = items.filter(item => {
      if(itemKeyPrefix.startsWith('relation-')) return true; // Relations are always selectable, node existence handled visually
      return !checkIfItemExistsOnMap(item);
    });

    const handleAddSelected = () => {
      const toAdd = items.filter((item, index) => {
        const key = itemKeyPrefix === 'relation-' ? index : item;
        // For relations, we add even if nodes exist, as the relation itself might be new
        // For concepts, only add if not existing
        return selectedSet.has(key) && (itemKeyPrefix.startsWith('relation-') ? true : !checkIfItemExistsOnMap(item));
      });
      if (toAdd.length > 0) {
        onAddSelected(toAdd);
      }
    };
    
    const handleSelectAll = (checked: boolean) => {
        const newSelectedSet = new Set<any>();
        if(checked) {
            items.forEach((item, index) => {
              if (itemKeyPrefix.startsWith('relation-') || !checkIfItemExistsOnMap(item)) {
                newSelectedSet.add(itemKeyPrefix === 'relation-' ? index : item);
              }
            });
        }
        if (itemKeyPrefix.startsWith('extracted-')) setSelectedExtracted(newSelectedSet as Set<string>);
        else if (itemKeyPrefix.startsWith('relation-')) setSelectedRelations(newSelectedSet as Set<number>);
        else if (itemKeyPrefix.startsWith('expanded-')) setSelectedExpanded(newSelectedSet as Set<string>);
    };
    
    const allSelectableAreChecked = selectableItems.length > 0 && selectedSet.size >= selectableItems.length && selectableItems.every(item => selectedSet.has(itemKeyPrefix === 'relation-' ? items.indexOf(item) : item));
    const countOfSelectedAndNew = items.filter((item, index) => {
        const key = itemKeyPrefix === 'relation-' ? index : item;
        return selectedSet.has(key) && (itemKeyPrefix.startsWith('relation-') ? true : !checkIfItemExistsOnMap(item));
      }).length;

    const countOfAllNew = selectableItems.length;


    return (
      <Card className={cn("mb-4 bg-background/80 shadow-md", cardClassName)}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-semibold text-primary flex items-center">
              <IconComponent className="mr-2 h-5 w-5" /> {title} ({items.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
                {!isViewOnlyMode && items.length > 0 && selectableItems.length > 0 && (
                     <>
                        <Checkbox 
                            id={`${itemKeyPrefix}-select-all`} 
                            checked={allSelectableAreChecked}
                            onCheckedChange={(checked) => handleSelectAll(Boolean(checked))}
                        />
                        <Label htmlFor={`${itemKeyPrefix}-select-all`} className="text-xs">Select New</Label>
                     </>
                )}
                {onClearCategory && !isViewOnlyMode && items.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={onClearCategory} title={`Clear all ${title} suggestions`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="max-h-48 overflow-y-auto">
          <div className="space-y-1">
            {items.map((item, index) => {
              const key = itemKeyPrefix === 'relation-' ? index : item;
              const displayId = `${itemKeyPrefix}-${index}`;
              const isExistingOnMap = itemKeyPrefix.startsWith('relation-') ? false : checkIfItemExistsOnMap(item);
              const relationNodeExistence = itemKeyPrefix.startsWith('relation-') ? checkIfRelationNodesExistOnMap(item) : undefined;
              
              return (
                <div key={displayId} className={cn("flex items-center space-x-3 p-2 border-b last:border-b-0", isExistingOnMap && "opacity-60")}>
                  {!isViewOnlyMode && (
                    <Checkbox
                      id={displayId}
                      checked={selectedSet.has(key)}
                      onCheckedChange={(checked) => handleToggleFactory(
                        itemKeyPrefix.startsWith('extracted-') ? 'extracted' :
                        itemKeyPrefix.startsWith('relation-') ? 'relation' : 'expanded'
                      )(key, Boolean(checked))}
                      disabled={isExistingOnMap && !itemKeyPrefix.startsWith('relation-')}
                    />
                  )}
                  <Label htmlFor={displayId} className={cn("text-sm font-normal flex-grow", (!isExistingOnMap || itemKeyPrefix.startsWith('relation-')) && "cursor-pointer")}>
                    {renderItemLabel(item, isExistingOnMap, relationNodeExistence)}
                  </Label>
                </div>
              );
            })}
          </div>
        </CardContent>
        {!isViewOnlyMode && items.length > 0 && onAddSelected && (
          <CardFooter className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddSelected}
              disabled={isViewOnlyMode || countOfSelectedAndNew === 0}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Selected ({countOfSelectedAndNew})
            </Button>
            <Button 
              size="sm" 
              variant="default" 
              onClick={() => {
                if (selectableItems.length > 0) onAddSelected(selectableItems);
              }} 
              disabled={isViewOnlyMode || countOfAllNew === 0} 
              className="w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add All New ({countOfAllNew})
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  const renderConceptLabel = (concept: string, isExistingOnMap: boolean) => (
    <>
      {concept}
      {isExistingOnMap && <span className="ml-2 text-xs text-muted-foreground italic">(already on map)</span>}
    </>
  );
  
  const checkConceptExistsOnMap = (concept: string) => existingNodeTexts.has(concept.toLowerCase().trim());

  const renderRelationLabel = (relation: { source: string; target: string; relation: string }, _isExistingOnMap: boolean, relationNodeExistence?: {source?: boolean, target?: boolean}) => {
    let label = "";
    label += relationNodeExistence?.source ? `${relation.source} (exists)` : relation.source;
    label += ` → `;
    label += relationNodeExistence?.target ? `${relation.target} (exists)` : relation.target;
    label += ` (${relation.relation})`;
    return label;
  };
  
  const checkRelationNodesExistOnMap = (relation: { source: string; target: string }) => {
    return {
      source: existingNodeTexts.has(relation.source.toLowerCase().trim()),
      target: existingNodeTexts.has(relation.target.toLowerCase().trim())
    };
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
                <Card className="mb-4 bg-primary/5 border-primary/20">
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
                <Card className="mb-4 bg-green-500/5 border-green-500/20">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-green-700 dark:text-green-400 flex items-center">
                      <Waypoints className="mr-2 h-5 w-5" />Edges in Map ({mapData?.edges.length})
                    </CardTitle>
                     <CardDescription className="text-xs">Current connections on the canvas.</CardDescription>
                  </CardHeader>
                  <CardContent className="max-h-48 overflow-y-auto">
                    <ul className="list-none text-sm space-y-1">
                      {mapData?.edges.map((edge) => (
                        <li key={edge.id} className="flex items-center p-2 border-b border-dashed border-green-500/20">
                          <Link2 className="mr-2 h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0" />
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
                "Extracted Concepts", SearchCode, extractedConcepts, selectedExtracted, "extracted-concept",
                renderConceptLabel, checkConceptExistsOnMap, checkRelationNodesExistOnMap, // last one not used for concepts
                onAddExtractedConcepts, onClearExtractedConcepts, "bg-blue-500/5 border-blue-500/20"
              )}

              {onAddSuggestedRelations && renderSuggestionSection(
                "Suggested Relations", Lightbulb, suggestedRelations, selectedRelations, "relation-",
                renderRelationLabel, checkConceptExistsOnMap, checkRelationNodesExistOnMap, // checkConceptExistsOnMap not directly for relations, but for nodes within them
                onAddSuggestedRelations, onClearSuggestedRelations, "bg-yellow-500/5 border-yellow-500/20"
              )}

              {onAddExpandedConcepts && renderSuggestionSection(
                "Expanded Ideas", Brain, expandedConcepts, selectedExpanded, "expanded-concept",
                renderConceptLabel, checkConceptExistsOnMap, checkRelationNodesExistOnMap, // last one not used for concepts
                onAddExpandedConcepts, onClearExpandedConcepts, "bg-purple-500/5 border-purple-500/20"
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
