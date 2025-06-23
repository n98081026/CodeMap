"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GitFork, Brain, SearchCode, Lightbulb, PlusCircle, Info, MessageSquareDashed, CheckSquare, Edit3, BotMessageSquare, Zap, AlertCircle, Trash2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConceptMapData, ConceptMapNode } from "@/types";
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/layout/empty-state';
import useConceptMapStore from '@/stores/concept-map-store';
import type { ExtractedConceptItem } from '@/ai/flows/extract-concepts'; // Corrected import
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interface for relation suggestions (already includes reason)
interface RelationSuggestion {
  source: string;
  target: string;
  relation: string;
  reason?: string;
}

interface AISuggestionPanelProps {
  mapData?: ConceptMapData; 
  currentMapNodes?: ConceptMapNode[];
  extractedConcepts?: ExtractedConceptItem[]; // Use ExtractedConceptItem[]
  suggestedRelations?: Array<RelationSuggestion>;
  onAddExtractedConcepts?: (concepts: ExtractedConceptItem[]) => void; // Pass array of ExtractedConceptItem
  onAddSuggestedRelations?: (relations: Array<RelationSuggestion>) => void;
  onClearExtractedConcepts?: () => void;
  onClearSuggestedRelations?: () => void;
  isViewOnlyMode?: boolean;
}

interface EditableExtractedConcept {
  original: ExtractedConceptItem;
  current: ExtractedConceptItem;
  isEditing: boolean;
  editingField: 'concept' | 'context' | 'source' | null;
}

interface EditableRelationSuggestion {
  original: RelationSuggestion;
  current: RelationSuggestion;
  isEditing: boolean;
  editingField: 'source' | 'target' | 'relation' | 'reason' | null;
}

type ItemStatus = 'new' | 'exact-match' | 'similar-match';

export const AISuggestionPanel = React.memo(function AISuggestionPanel({
  mapData,
  currentMapNodes = [],
  extractedConcepts = [], // Default to empty array
  suggestedRelations = [], // Default to empty array
  onAddExtractedConcepts,
  onAddSuggestedRelations,
  onClearExtractedConcepts,
  onClearSuggestedRelations,
  isViewOnlyMode
}: AISuggestionPanelProps) {
  const { setDragPreview, clearDragPreview, setDraggedRelationPreview } = useConceptMapStore(
    useCallback(s => ({
      setDragPreview: s.setDragPreview,
      clearDragPreview: s.clearDragPreview,
      setDraggedRelationPreview: s.setDraggedRelationPreview
    }), [])
  );

  const [editableExtracted, setEditableExtracted] = useState<EditableExtractedConcept[]>([]);
  const [editableRelations, setEditableRelations] = useState<EditableRelationSuggestion[]>([]);

  const [selectedExtractedIndices, setSelectedExtractedIndices] = useState<Set<number>>(new Set());
  const [selectedRelationIndices, setSelectedRelationIndices] = useState<Set<number>>(new Set());

  const existingNodeTexts = useMemo(() => {
    return new Set(currentMapNodes.map(n => n.text.toLowerCase().trim()));
  }, [currentMapNodes]);

  const mapExtractedToEditable = useCallback((items: ExtractedConceptItem[]): EditableExtractedConcept[] =>
    items.map(item => ({
      original: item,
      current: { ...item },
      isEditing: false,
      editingField: null
    })),
  []);

  const mapRelationsToEditable = useCallback((items: Array<RelationSuggestion>): EditableRelationSuggestion[] =>
    items.map(item => ({
      original: item,
      current: { ...item },
      isEditing: false,
      editingField: null
    })),
  []);

  useEffect(() => {
    setEditableExtracted(mapExtractedToEditable(extractedConcepts || []));
    setSelectedExtractedIndices(new Set());
  }, [extractedConcepts, mapExtractedToEditable]);

  useEffect(() => {
    setEditableRelations(mapRelationsToEditable(suggestedRelations || []));
    setSelectedRelationIndices(new Set());
  }, [suggestedRelations, mapRelationsToEditable]);

  const handleToggleEdit = (type: 'extracted' | 'relation', index: number, field?: 'concept' | 'context' | 'source' | 'target' | 'relation' | 'reason') => {
    if (isViewOnlyMode) return;
    const setStateAction = (setter: React.Dispatch<React.SetStateAction<any[]>>, items: any[]) => {
      setter(items.map((item, idx) => {
        if (idx === index) {
          return { ...item, isEditing: !item.isEditing, editingField: field || null };
        }
        return { ...item, isEditing: false, editingField: null };
      }));
    };
    if (type === 'extracted') setStateAction(setEditableExtracted, editableExtracted as any[]);
    else if (type === 'relation') setStateAction(setEditableRelations, editableRelations as any[]);
  };

  const handleInputChange = (type: 'extracted' | 'relation', index: number, value: string, field?: 'concept' | 'context' | 'source' | 'target' | 'relation' | 'reason') => {
     const setStateAction = (setter: React.Dispatch<React.SetStateAction<any[]>>, items: any[]) => {
        setter(items.map((item, idx) => {
            if (idx === index) {
                if (field) {
                    return { ...item, current: { ...item.current, [field]: value } };
                }
                return item;
            }
            return item;
        }));
    };
    if (type === 'extracted') setStateAction(setEditableExtracted, editableExtracted as any[]);
    else if (type === 'relation') setStateAction(setEditableRelations, editableRelations as any[]);
  };

  const handleConfirmEdit = (type: 'extracted' | 'relation', index: number) => {
    handleToggleEdit(type, index, undefined);
  };

  const handleSelectionToggleFactory = (type: 'extracted' | 'relation') => (index: number, checked: boolean) => {
    const setIndices =
        type === 'extracted' ? setSelectedExtractedIndices :
        setSelectedRelationIndices;

    setIndices(prev => {
        const next = new Set(prev);
        if(checked) next.add(index);
        else next.delete(index);
        return next;
    });
  };

  const hasAiOutput = (editableExtracted?.length || 0) > 0 || (editableRelations?.length || 0) > 0;
  const hasMapDataNodes = currentMapNodes && currentMapNodes.length > 0;

  const renderSuggestionSection = (
    title: string,
    IconComponent: React.ElementType,
    items: (EditableExtractedConcept | EditableRelationSuggestion)[],
    selectedIndicesSet: Set<number>,
    itemKeyPrefix: string,
    renderItemContent: (item: any, index: number, itemStatus: ItemStatus, relationNodeExistence?: { source?: boolean, target?: boolean }) => React.ReactNode,
    getItemStatus: (itemValue: ExtractedConceptItem | RelationSuggestion) => ItemStatus,
    checkIfRelationNodesExistOnMap: (relation: RelationSuggestion) => { source?: boolean, target?: boolean },
    onAddSelectedItems: ((selectedItems: any[]) => void) | undefined,
    onClearCategory?: () => void,
    cardClassName?: string,
    titleClassName?: string
  ) => {
    if (!onAddSelectedItems && items.length === 0 && !mapData) return null;
    if (!items || items.length === 0) {
      return (
        <Card className={cn("mb-4 bg-background/80 shadow-md", cardClassName)}>
          <CardHeader>
            <CardTitle className={cn("text-base font-semibold text-muted-foreground flex items-center", titleClassName)}>
              <IconComponent className="mr-2 h-5 w-5" /> {title} (0)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState 
                icon={MessageSquareDashed}
                title={`No New ${title}`}
                description={`No new ${title.toLowerCase()} to display currently. Try using the AI tools to generate some!`}
            />
          </CardContent>
        </Card>
      );
    }

    const getComparableItemValue = (item: EditableExtractedConcept | EditableRelationSuggestion) => {
      return item.current;
    };

    const selectableItems = items.filter((item) => {
      const value = getComparableItemValue(item);
      const status = getItemStatus(value as ExtractedConceptItem | RelationSuggestion);
      return itemKeyPrefix.startsWith('relation-') || status !== 'exact-match';
    });
    
    const clearSelectionForCategory = () => {
      if (itemKeyPrefix.startsWith('extracted-')) setSelectedExtractedIndices(new Set());
      else if (itemKeyPrefix.startsWith('relation-')) setSelectedRelationIndices(new Set());
    };

    const handleAddSelected = () => {
      if (!onAddSelectedItems) return;
      const toAdd = items
        .filter((_item, index) => selectedIndicesSet.has(index))
        .map(item => item.current)
        .filter(itemValue => {
             const status = getItemStatus(itemValue as ExtractedConceptItem | RelationSuggestion);
             return itemKeyPrefix.startsWith('relation-') || status !== 'exact-match';
        });

      if (toAdd.length > 0) {
        onAddSelectedItems(toAdd);
        clearSelectionForCategory();
      }
    };

    const handleSelectAllNewOrSimilar = (checked: boolean) => {
        const newSelectedIndices = new Set<number>();
        if (checked) {
            items.forEach((item, index) => {
                const value = getComparableItemValue(item);
                const status = getItemStatus(value as ExtractedConceptItem | RelationSuggestion);
                if (itemKeyPrefix.startsWith('relation-') || status !== 'exact-match') {
                    newSelectedIndices.add(index);
                }
            });
        }
        if (itemKeyPrefix.startsWith('extracted-')) setSelectedExtractedIndices(newSelectedIndices);
        else if (itemKeyPrefix.startsWith('relation-')) setSelectedRelationIndices(newSelectedIndices);
    };

    const countOfAllNewOrSimilar = items.filter(item => {
        const value = getComparableItemValue(item);
        const status = getItemStatus(value as ExtractedConceptItem | RelationSuggestion);
        return itemKeyPrefix.startsWith('relation-') || status !== 'exact-match';
    }).length;

    const allSelectableAreChecked = countOfAllNewOrSimilar > 0 && selectedIndicesSet.size === countOfAllNewOrSimilar;

    const countOfSelectedAndSelectable = items.filter((item, index) => {
        const value = getComparableItemValue(item);
        const status = getItemStatus(value as ExtractedConceptItem | RelationSuggestion);
        return selectedIndicesSet.has(index) && (itemKeyPrefix.startsWith('relation-') || status !== 'exact-match');
      }).length;

    return (
      <Card className={cn("mb-4 bg-background/80 shadow-md", cardClassName)}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className={cn("text-base font-semibold flex items-center", titleClassName || "text-primary")}>
              <IconComponent className="mr-2 h-5 w-5" /> {title} ({items.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
                {!isViewOnlyMode && items.length > 0 && countOfAllNewOrSimilar > 0 && onAddSelectedItems && (
                     <>
                        <Checkbox
                            id={`${itemKeyPrefix}-select-all`}
                            checked={allSelectableAreChecked}
                            onCheckedChange={(checkedState) => handleSelectAllNewOrSimilar(Boolean(checkedState))}
                            disabled={isViewOnlyMode}
                        />
                        <Label htmlFor={`${itemKeyPrefix}-select-all`} className="text-xs">Select New/Similar</Label>
                     </>
                )}
                {onClearCategory && !isViewOnlyMode && items.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={onClearCategory} title={`Clear all ${title} suggestions`} disabled={isViewOnlyMode}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
            </div>
          </div>
        </CardHeader>
        <CardContent> 
          <div className="space-y-1">
            {items.map((item, index) => {
              const displayId = `${itemKeyPrefix}-${index}`;
              const itemValue = getComparableItemValue(item);
              const itemStatus = getItemStatus(itemValue as ExtractedConceptItem | RelationSuggestion);
              const relationNodeExistence = itemKeyPrefix.startsWith('relation-') ? checkIfRelationNodesExistOnMap(itemValue as RelationSuggestion) : undefined;

              return (
                <div key={displayId} className={cn(
                    "flex items-start space-x-3 p-2 border-b last:border-b-0",
                    itemStatus === 'exact-match' && itemKeyPrefix.startsWith('extracted-') && "opacity-60 bg-muted/30",
                    itemStatus === 'similar-match' && itemKeyPrefix.startsWith('extracted-') && "bg-yellow-500/5 border-yellow-500/20"
                )}>
                  {!isViewOnlyMode && onAddSelectedItems && (
                    <Checkbox
                      id={displayId}
                      checked={selectedIndicesSet.has(index)}
                      onCheckedChange={(checked) => handleSelectionToggleFactory(
                        itemKeyPrefix.startsWith('extracted-') ? 'extracted' : 'relation'
                      )(index, Boolean(checked))}
                      disabled={(itemStatus === 'exact-match' && itemKeyPrefix.startsWith('extracted-')) || item.isEditing || isViewOnlyMode}
                    />
                  )}
                  <div className="flex-grow">
                    {renderItemContent(item, index, itemStatus, relationNodeExistence)}
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
              disabled={isViewOnlyMode || countOfSelectedAndSelectable === 0}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Selected ({countOfSelectedAndSelectable})
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                if (countOfAllNewOrSimilar > 0 && onAddSelectedItems) {
                   const itemsToAdd = items
                        .filter(item => {
                             const value = getComparableItemValue(item);
                             const status = getItemStatus(value as ExtractedConceptItem | RelationSuggestion);
                             return itemKeyPrefix.startsWith('relation-') || status !== 'exact-match';
                        })
                        .map(item => item.current);
                   onAddSelectedItems(itemsToAdd);
                   clearSelectionForCategory();
                }
              }}
              disabled={isViewOnlyMode || countOfAllNewOrSimilar === 0}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add All New/Similar ({countOfAllNewOrSimilar})
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  };

  const renderEditableConceptLabel = (item: EditableExtractedConcept, index: number, type: 'extracted', itemStatus: ItemStatus) => {
    const isExactMatch = itemStatus === 'exact-match';

    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, conceptItem: ExtractedConceptItem) => {
      event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'concept-suggestion',
        text: conceptItem.concept,
        conceptType: 'ai-concept'
      }));
      event.dataTransfer.effectAllowed = 'copy';
      setDragPreview({ text: conceptItem.concept, type: 'ai-concept' });
    };

    const handleDragEnd = () => {
      clearDragPreview();
    };

    if (item.isEditing && item.editingField === 'concept' && !isViewOnlyMode) {
      return (
        <div className="flex items-center space-x-2 w-full">
          <Input
            value={item.current.concept}
            onChange={(e) => handleInputChange(type, index, e.target.value, 'concept')}
            className="h-8 text-sm flex-grow"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleConfirmEdit(type, index)}
            onBlur={() => handleConfirmEdit(type, index)}
            disabled={isViewOnlyMode}
          />
          <Button size="icon" variant="ghost" onClick={() => handleConfirmEdit(type, index)} className="h-8 w-8" disabled={isViewOnlyMode}>
            <CheckSquare className="h-4 w-4 text-green-600" />
          </Button>
        </div>
      );
    }
    return (
      <div className="w-full">
        <div
          className="flex items-center justify-between w-full group"
          draggable={!isViewOnlyMode && !item.isEditing && !isExactMatch}
          onDragStart={(e) => !isViewOnlyMode && !item.isEditing && !isExactMatch && handleDragStart(e, item.current)}
          onDragEnd={handleDragEnd}
          title={!isViewOnlyMode && !item.isEditing && !isExactMatch ? "Drag this concept to the canvas" : (item.current.context || item.current.concept)}
        >
          <Label
            htmlFor={`${type}-${index}`}
            className={cn(
              "text-sm font-normal flex-grow flex items-center",
              (!isViewOnlyMode && !item.isEditing && !isExactMatch) ? "cursor-grab" : "cursor-default",
              (isExactMatch || isViewOnlyMode) && "cursor-default"
            )}
          >
            {itemStatus === 'exact-match' && <CheckSquare className="h-4 w-4 mr-2 text-green-600 flex-shrink-0" title="Exact match on map"/>}
            {itemStatus === 'similar-match' && <Zap className="h-4 w-4 mr-2 text-yellow-600 dark:text-yellow-400 flex-shrink-0" title="Similar concept on map"/>}
            {itemStatus === 'new' && <PlusCircle className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" title="New concept"/>}
            {item.current.concept}
          </Label>
          {!isViewOnlyMode && !isExactMatch && (
            <div className="flex items-center">
                { (item.current.context || item.current.source) && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 mr-1 text-blue-500 cursor-help flex-shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-background border shadow-lg p-3">
                                {item.current.context && <p className="text-xs text-muted-foreground mb-1"><strong>Context:</strong> {item.current.context}</p>}
                                {item.current.source && <p className="text-xs text-muted-foreground"><strong>Source:</strong> <em>"{item.current.source}"</em></p>}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <Button size="icon" variant="ghost" onClick={() => handleToggleEdit(type, index, 'concept')} className="h-6 w-6 opacity-0 group-hover:opacity-100" disabled={isViewOnlyMode}>
                    <Edit3 className="h-3 w-3" />
                </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEditableRelationLabel = (item: EditableRelationSuggestion, index: number, _itemStatus: ItemStatus, relationNodeExistence?: { source?: boolean, target?: boolean }) => {
    const renderField = (field: 'source' | 'target' | 'relation', nodeExists?: boolean) => {
      if (item.isEditing && item.editingField === field && !isViewOnlyMode) {
        return (
          <Input
            value={(item.current as any)[field] || ""}
            onChange={(e) => handleInputChange('relation', index, e.target.value, field)}
            className="h-7 text-xs px-1 py-0.5 mx-0.5 inline-block w-auto min-w-[60px] max-w-[120px]"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmEdit('relation', index);}}
            onBlur={() => handleConfirmEdit('relation', index)}
            disabled={isViewOnlyMode}
          />
        );
      }
      return (
        <span
          onClick={isViewOnlyMode ? undefined : () => handleToggleEdit('relation', index, field)}
          className={cn("hover:bg-muted/50 px-1 rounded inline-flex items-center", !isViewOnlyMode && "cursor-pointer")}
        >
          {(item.current as any)[field]}
          {nodeExists && field !== 'relation' && <CheckSquare className="h-3 w-3 ml-1 text-green-600 inline-block" title="This node exists on the map"/>}
          {!nodeExists && field !== 'relation' && <AlertCircle className="h-3 w-3 ml-1 text-orange-500 inline-block" title="This node does not exist or differs from map"/>}
        </span>
      );
    };

    return (
      <div
        className="flex items-center text-sm group w-full"
        draggable={!isViewOnlyMode && !item.isEditing}
        onDragStart={(e) => {
          if (isViewOnlyMode || item.isEditing) return;
          e.dataTransfer.setData('application/json', JSON.stringify({
            type: 'relation-suggestion',
            sourceText: item.current.source,
            targetText: item.current.target,
            label: item.current.relation,
          }));
          e.dataTransfer.effectAllowed = 'copy';
          setDraggedRelationPreview(item.current.relation);
        }}
        onDragEnd={() => {
          if (!isViewOnlyMode) clearDragPreview();
        }}
        title={!isViewOnlyMode && !item.isEditing ? "Drag this relation to the canvas (experimental)" : (item.current.reason || "Suggested relation")}
      >
        <GitFork className={cn("h-4 w-4 mr-2 text-purple-500 flex-shrink-0", !isViewOnlyMode && !item.isEditing && "cursor-grab")} />
        {renderField('source', relationNodeExistence?.source)}
        <span className="mx-1">→</span>
        {renderField('target', relationNodeExistence?.target)}
        <span className="mx-1 text-muted-foreground">({renderField('relation')})</span>
        {item.current.reason && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 ml-2 text-blue-500 cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs bg-background border shadow-lg p-3">
                <p className="text-xs font-medium text-foreground">AI's Reasoning:</p>
                <p className="text-xs text-muted-foreground">{item.current.reason}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  const getConceptStatus = useCallback((itemValue: ExtractedConceptItem | RelationSuggestion): ItemStatus => {
    if ('concept' in itemValue) {
        const normalizedConcept = itemValue.concept.toLowerCase().trim();
        if (existingNodeTexts.has(normalizedConcept)) {
            return 'exact-match';
        }
        for (const existingNode of existingNodeTexts) {
            if (existingNode.length !== normalizedConcept.length && (existingNode.includes(normalizedConcept) || normalizedConcept.includes(existingNode))) {
                return 'similar-match';
            }
        }
    }
    return 'new';
  }, [existingNodeTexts]);

  const checkRelationNodesExistOnMap = useCallback((relationValue: RelationSuggestion) => {
    return {
      source: existingNodeTexts.has(relationValue.source.toLowerCase().trim()),
      target: existingNodeTexts.has(relationValue.target.toLowerCase().trim())
    };
  }, [existingNodeTexts]);

  const mainContent = () => {
    const noExtracted = !editableExtracted || editableExtracted.length === 0;
    const noRelations = !editableRelations || editableRelations.length === 0;

    if (!hasMapDataNodes && noExtracted && noRelations) {
      return (
        <div className="p-6 text-center h-full flex flex-col justify-center">
            <EmptyState
                icon={BotMessageSquare}
                title="Getting Started with AI Tools"
                description="Unlock insights and build maps faster with our AI-powered features. Use the AI tools in the toolbar to generate concepts or relations. Your AI-generated suggestions will appear here."
            />
        </div>
      );
    }
    if (hasMapDataNodes && noExtracted && noRelations) {
      return (
         <div className="p-6 text-center h-full flex flex-col justify-center">
            <EmptyState
                icon={MessageSquareDashed}
                title="No AI Suggestions Yet"
                description={isViewOnlyMode 
                    ? "The map is in view-only mode. AI tools are disabled." 
                    : "Your map has content, but no AI suggestions are currently available. Use the AI tools in the toolbar to generate new ideas!"
                }
            />
        </div>
      );
    }
    
    return (
      <ScrollArea className="h-full w-full">
        <div className="p-4 space-y-4 text-left">
          {onAddExtractedConcepts && editableExtracted && editableExtracted.length > 0 && renderSuggestionSection(
            "Extracted Concepts", SearchCode, editableExtracted, selectedExtractedIndices, "extracted-concept",
            (item, index, itemStatus) => renderEditableConceptLabel(item as EditableExtractedConcept, index, 'extracted', itemStatus),
            getConceptStatus,
            checkRelationNodesExistOnMap as any,
            onAddExtractedConcepts,
            onClearExtractedConcepts,
            "bg-blue-500/5 border-blue-500/20", "text-blue-700 dark:text-blue-400"
          )}
          {onAddSuggestedRelations && editableRelations && editableRelations.length > 0 && renderSuggestionSection(
            "Suggested Relations", Lightbulb, editableRelations, selectedRelationIndices, "relation-",
             (item, index, itemStatus, relationNodeExist) => renderEditableRelationLabel(item as EditableRelationSuggestion, index, itemStatus, relationNodeExist),
            getConceptStatus, 
            checkRelationNodesExistOnMap,
            onAddSuggestedRelations,
            onClearSuggestedRelations,
            "bg-purple-500/5 border-purple-500/20", "text-purple-700 dark:text-purple-400"
          )}
           {(noExtracted && noRelations && hasMapDataNodes) && (
            <div className="text-center py-6">
                <EmptyState
                    icon={Info}
                    title="No Active AI Suggestions"
                    description="Use AI tools to generate new ideas."
                />
            </div>
           )}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Card className="h-full w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner">
      <CardContent className="flex h-full flex-col items-center justify-center text-center p-0">
        {mainContent()}
      </CardContent>
    </Card>
  );
});
AISuggestionPanel.displayName = "AISuggestionPanel";
