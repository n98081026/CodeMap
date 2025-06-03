"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GitFork, Brain, SearchCode, Lightbulb, PlusCircle, Layers, Link2, Box, Waypoints, Trash2, Info, MessageSquareDashed, CheckSquare, Edit3 } from "lucide-react";
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

interface EditableSuggestion {
  original: string;
  current: string;
  isEditing: boolean;
}

interface EditableRelationSuggestion {
  original: { source: string; target: string; relation: string };
  current: { source: string; target: string; relation: string };
  isEditing: boolean;
  editingField: 'source' | 'target' | 'relation' | null;
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

  const [editableExtracted, setEditableExtracted] = useState<EditableSuggestion[]>([]);
  const [editableRelations, setEditableRelations] = useState<EditableRelationSuggestion[]>([]);
  const [editableExpanded, setEditableExpanded] = useState<EditableSuggestion[]>([]);

  const [selectedExtractedIndices, setSelectedExtractedIndices] = useState<Set<number>>(new Set());
  const [selectedRelationIndices, setSelectedRelationIndices] = useState<Set<number>>(new Set());
  const [selectedExpandedIndices, setSelectedExpandedIndices] = useState<Set<number>>(new Set());

  const existingNodeTexts = useMemo(() => {
    return new Set(currentMapNodes.map(n => n.text.toLowerCase().trim()));
  }, [currentMapNodes]);

  const mapToEditable = useCallback((items: string[]): EditableSuggestion[] => 
    items.map(item => ({ original: item, current: item, isEditing: false })),
  []);

  const mapRelationsToEditable = useCallback((items: Array<{ source: string; target: string; relation: string }>): EditableRelationSuggestion[] =>
    items.map(item => ({ original: item, current: { ...item }, isEditing: false, editingField: null })),
  []);

  useEffect(() => {
    setEditableExtracted(mapToEditable(extractedConcepts));
    setSelectedExtractedIndices(new Set());
  }, [extractedConcepts, mapToEditable]);

  useEffect(() => {
    setEditableRelations(mapRelationsToEditable(suggestedRelations));
    setSelectedRelationIndices(new Set());
  }, [suggestedRelations, mapRelationsToEditable]);

  useEffect(() => {
    setEditableExpanded(mapToEditable(expandedConcepts));
    setSelectedExpandedIndices(new Set());
  }, [expandedConcepts, mapToEditable]);


  const handleToggleEdit = (type: 'extracted' | 'relation' | 'expanded', index: number, field?: 'source' | 'target' | 'relation') => {
    if (isViewOnlyMode) return;
    const setStateAction = (setter: React.Dispatch<React.SetStateAction<any[]>>, items: any[]) => {
      setter(items.map((item, idx) => {
        if (idx === index) {
          if (type === 'relation') {
            return { ...item, isEditing: !item.isEditing, editingField: field || null };
          }
          return { ...item, isEditing: !item.isEditing };
        }
        return type === 'relation' ? { ...item, isEditing: false, editingField: null } : { ...item, isEditing: false };
      }));
    };
    if (type === 'extracted') setStateAction(setEditableExtracted, editableExtracted);
    else if (type === 'relation') setStateAction(setEditableRelations, editableRelations);
    else if (type === 'expanded') setStateAction(setEditableExpanded, editableExpanded);
  };

  const handleInputChange = (type: 'extracted' | 'relation' | 'expanded', index: number, value: string, field?: 'source' | 'target' | 'relation') => {
     const setStateAction = (setter: React.Dispatch<React.SetStateAction<any[]>>, items: any[]) => {
        setter(items.map((item, idx) => {
            if (idx === index) {
                if (type === 'relation' && field) {
                    return { ...item, current: { ...item.current, [field]: value } };
                }
                return { ...item, current: value };
            }
            return item;
        }));
    };
    if (type === 'extracted') setStateAction(setEditableExtracted, editableExtracted);
    else if (type === 'relation') setStateAction(setEditableRelations, editableRelations);
    else if (type === 'expanded') setStateAction(setEditableExpanded, editableExpanded);
  };

  const handleConfirmEdit = (type: 'extracted' | 'relation' | 'expanded', index: number) => {
    handleToggleEdit(type, index); // This will turn off isEditing
  };


  const handleSelectionToggleFactory = (type: 'extracted' | 'relation' | 'expanded') => (index: number, checked: boolean) => {
    const setIndices = 
        type === 'extracted' ? setSelectedExtractedIndices :
        type === 'relation' ? setSelectedRelationIndices :
        setSelectedExpandedIndices;
    
    setIndices(prev => {
        const next = new Set(prev);
        if(checked) next.add(index);
        else next.delete(index);
        return next;
    });
  };


  const hasAiOutput = editableExtracted.length > 0 || editableRelations.length > 0 || editableExpanded.length > 0;
  const hasMapDataNodes = mapData && mapData.nodes && mapData.nodes.length > 0;
  const hasMapDataEdges = mapData && mapData.edges && mapData.edges.length > 0;
  const hasAnyContent = hasAiOutput || hasMapDataNodes || hasMapDataEdges;


  const renderSuggestionSection = (
    title: string,
    IconComponent: React.ElementType,
    items: (EditableSuggestion | EditableRelationSuggestion)[],
    selectedIndicesSet: Set<number>,
    itemKeyPrefix: string,
    renderItemContent: (item: any, index: number, isExistingOnMap: boolean, relationNodeExistence?: { source?: boolean, target?: boolean }) => React.ReactNode,
    checkIfItemExistsOnMap: (itemValue: string | { source: string, target: string }) => boolean,
    checkIfRelationNodesExistOnMap: (relation: { source: string; target: string }) => { source?: boolean, target?: boolean },
    onAddSelectedItems: (selectedItems: any[]) => void,
    onClearCategory?: () => void,
    cardClassName?: string
  ) => {
    if (!onAddSelectedItems && items.length === 0 && !mapData) return null;
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

    const getComparableItemValue = (item: EditableSuggestion | EditableRelationSuggestion) => {
      return 'current' in item && typeof item.current !== 'string' ? item.current : (item as EditableSuggestion).current;
    };
    
    const selectableItems = items.filter((item) => {
      const value = getComparableItemValue(item);
      if(itemKeyPrefix.startsWith('relation-')) return true; 
      return !checkIfItemExistsOnMap(value as string);
    });

    const handleAddSelected = () => {
      const toAdd = items
        .filter((_item, index) => selectedIndicesSet.has(index))
        .map(item => (item as EditableRelationSuggestion).original ? (item as EditableRelationSuggestion).current : (item as EditableSuggestion).current)
        .filter(itemValue => {
             if(itemKeyPrefix.startsWith('relation-')) return true; 
             return !checkIfItemExistsOnMap(itemValue as string);
        });

      if (toAdd.length > 0) {
        onAddSelectedItems(toAdd);
      }
    };
    
    const handleSelectAllNew = (checked: boolean) => {
        const newSelectedIndices = new Set<number>();
        if (checked) {
            items.forEach((item, index) => {
                const value = getComparableItemValue(item);
                if (itemKeyPrefix.startsWith('relation-') || !checkIfItemExistsOnMap(value as string)) {
                    newSelectedIndices.add(index);
                }
            });
        }
        if (itemKeyPrefix.startsWith('extracted-')) setSelectedExtractedIndices(newSelectedIndices);
        else if (itemKeyPrefix.startsWith('relation-')) setSelectedRelationIndices(newSelectedIndices);
        else if (itemKeyPrefix.startsWith('expanded-')) setSelectedExpandedIndices(newSelectedIndices);
    };
    
    const allSelectableAreChecked = selectableItems.length > 0 && selectedIndicesSet.size >= selectableItems.length && 
        items.every((item, index) => {
            const value = getComparableItemValue(item);
            if (itemKeyPrefix.startsWith('relation-') || !checkIfItemExistsOnMap(value as string)) { // Is selectable
                return selectedIndicesSet.has(index);
            }
            return true; // Non-selectable items don't break "all selected"
        });

    const countOfSelectedAndNew = items.filter((item, index) => {
        const value = getComparableItemValue(item);
        return selectedIndicesSet.has(index) && (itemKeyPrefix.startsWith('relation-') ? true : !checkIfItemExistsOnMap(value as string));
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
                            onCheckedChange={(checkedState) => handleSelectAllNew(Boolean(checkedState))}
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
              const displayId = `${itemKeyPrefix}-${index}`;
              const itemValue = getComparableItemValue(item);
              const isExistingOnMap = itemKeyPrefix.startsWith('relation-') ? false : checkIfItemExistsOnMap(itemValue as string);
              const relationNodeExistence = itemKeyPrefix.startsWith('relation-') ? checkIfRelationNodesExistOnMap(itemValue as { source: string; target: string }) : undefined;
              
              return (
                <div key={displayId} className={cn("flex items-start space-x-3 p-2 border-b last:border-b-0", isExistingOnMap && !itemKeyPrefix.startsWith('relation-') && "opacity-60")}>
                  {!isViewOnlyMode && (
                    <Checkbox
                      id={displayId}
                      checked={selectedIndicesSet.has(index)}
                      onCheckedChange={(checked) => handleSelectionToggleFactory(
                        itemKeyPrefix.startsWith('extracted-') ? 'extracted' :
                        itemKeyPrefix.startsWith('relation-') ? 'relation' : 'expanded'
                      )(index, Boolean(checked))}
                      disabled={(isExistingOnMap && !itemKeyPrefix.startsWith('relation-')) || item.isEditing}
                    />
                  )}
                  <div className="flex-grow">
                    {renderItemContent(item, index, isExistingOnMap, relationNodeExistence)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
        {!isViewOnlyMode && items.length > 0 && onAddSelectedItems && (
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
                if (selectableItems.length > 0) {
                   onAddSelectedItems(selectableItems.map(item => getComparableItemValue(item as EditableSuggestion | EditableRelationSuggestion)));
                }
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

  // Render functions for concept/relation labels and edit inputs
  const renderEditableConceptLabel = (item: EditableSuggestion, index: number, type: 'extracted' | 'expanded', isExistingOnMap: boolean) => {
    if (item.isEditing) {
      return (
        <div className="flex items-center space-x-2 w-full">
          <Input 
            value={item.current} 
            onChange={(e) => handleInputChange(type, index, e.target.value)} 
            className="h-8 text-sm flex-grow"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmEdit(type, index)}
            onBlur={() => handleConfirmEdit(type, index)}
          />
          <Button size="icon" variant="ghost" onClick={() => handleConfirmEdit(type, index)} className="h-8 w-8">
            <CheckSquare className="h-4 w-4 text-green-600" />
          </Button>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between w-full group">
        <Label htmlFor={`${type}-${index}`} className={cn("text-sm font-normal flex-grow cursor-pointer", isExistingOnMap && "cursor-default")}>
          {item.current}
          {isExistingOnMap && <span className="ml-2 text-xs text-muted-foreground italic">(already on map)</span>}
        </Label>
        {!isViewOnlyMode && !isExistingOnMap && (
          <Button size="icon" variant="ghost" onClick={() => handleToggleEdit(type, index)} className="h-6 w-6 opacity-0 group-hover:opacity-100">
            <Edit3 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const renderEditableRelationLabel = (item: EditableRelationSuggestion, index: number, _isExistingOnMap: boolean, relationNodeExistence?: { source?: boolean, target?: boolean }) => {
    const renderField = (field: 'source' | 'target' | 'relation') => {
      if (item.isEditing && item.editingField === field) {
        return (
          <Input
            value={item.current[field]}
            onChange={(e) => handleInputChange('relation', index, e.target.value, field)}
            className="h-7 text-xs px-1 py-0.5 mx-0.5 inline-block w-auto min-w-[60px] max-w-[120px]"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmEdit('relation', index);}}
            onBlur={() => handleConfirmEdit('relation', index)}
          />
        );
      }
      return (
        <span 
          onClick={isViewOnlyMode ? undefined : () => handleToggleEdit('relation', index, field)} 
          className={cn("hover:bg-muted/50 px-1 rounded", !isViewOnlyMode && "cursor-pointer")}
        >
          {item.current[field]}
        </span>
      );
    };

    return (
      <div className="flex items-center text-sm group w-full">
        {renderField('source')}
        {relationNodeExistence?.source && <span className="text-xs text-muted-foreground italic ml-1">(exists)</span>}
        <span className="mx-1">→</span>
        {renderField('target')}
        {relationNodeExistence?.target && <span className="text-xs text-muted-foreground italic ml-1">(exists)</span>}
        <span className="mx-1 text-muted-foreground">({renderField('relation')})</span>
      </div>
    );
  };
  
  const checkConceptExistsOnMap = (conceptValue: string | {source: string, target: string}): boolean => {
      if (typeof conceptValue !== 'string') return false; // This function is for simple concepts
      return existingNodeTexts.has(conceptValue.toLowerCase().trim());
  };
  
  const checkRelationNodesExistOnMap = (relationValue: { source: string; target: string }) => {
    return {
      source: existingNodeTexts.has(relationValue.source.toLowerCase().trim()),
      target: existingNodeTexts.has(relationValue.target.toLowerCase().trim())
    };
  };

  return (
    <Card className="h-full w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner">
      <CardContent className="flex h-full flex-col items-center justify-center text-center p-0">
        {!hasAnyContent ? (
          <div className="p-4">
            <GitFork className="h-16 w-16 text-muted-foreground/50 mb-4 mx-auto" />
            <h3 className="text-xl font-semibold text-muted-foreground">AI Suggestions & Map Data</h3>
            <p className="text-sm text-muted-foreground">
              Use the toolbar to add elements or invoke AI tools. Suggestions will appear here.
            </p>
             <p className="text-xs text-muted-foreground/70 mt-2">
              The interactive canvas is active above for map visualization and editing.
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
                "Extracted Concepts", SearchCode, editableExtracted, selectedExtractedIndices, "extracted-concept",
                (item, index, isExisting) => renderEditableConceptLabel(item as EditableSuggestion, index, 'extracted', isExisting),
                checkConceptExistsOnMap, checkRelationNodesExistOnMap,
                onAddExtractedConcepts, onClearExtractedConcepts, "bg-blue-500/5 border-blue-500/20"
              )}

              {onAddSuggestedRelations && renderSuggestionSection(
                "Suggested Relations", Lightbulb, editableRelations, selectedRelationIndices, "relation-",
                 (item, index, _isExisting, relationNodeExist) => renderEditableRelationLabel(item as EditableRelationSuggestion, index, _isExisting, relationNodeExist),
                checkConceptExistsOnMap, checkRelationNodesExistOnMap,
                onAddSuggestedRelations, onClearSuggestedRelations, "bg-yellow-500/5 border-yellow-500/20"
              )}

              {onAddExpandedConcepts && renderSuggestionSection(
                "Expanded Ideas", Brain, editableExpanded, selectedExpandedIndices, "expanded-concept",
                 (item, index, isExisting) => renderEditableConceptLabel(item as EditableSuggestion, index, 'expanded', isExisting),
                checkConceptExistsOnMap, checkRelationNodesExistOnMap,
                onAddExpandedConcepts, onClearExpandedConcepts, "bg-purple-500/5 border-purple-500/20"
              )}

              {hasAnyContent && (
                <p className="text-xs text-muted-foreground/70 mt-6 text-center">
                  Map elements are rendered on the interactive canvas above.
                  {!isViewOnlyMode && " AI suggestions can be edited and added to the map using the controls above."}
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

