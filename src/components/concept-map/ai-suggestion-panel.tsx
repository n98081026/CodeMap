"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GitFork, Brain, SearchCode, Lightbulb, PlusCircle, Layers, Link2, Box, Waypoints, Trash2, Info, MessageSquareDashed, CheckSquare, Edit3, BotMessageSquare, Zap, AlertCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConceptMapData, ConceptMapNode } from "@/types";
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/layout/empty-state';
import useConceptMapStore from '@/stores/concept-map-store';

interface AISuggestionPanelProps {
  mapData?: ConceptMapData; 
  currentMapNodes?: ConceptMapNode[];
  extractedConcepts?: string[];
  suggestedRelations?: Array<{ source: string; target: string; relation: string }>;
  onAddExtractedConcepts?: (concepts: string[]) => void;
  onAddSuggestedRelations?: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  onClearExtractedConcepts?: () => void;
  onClearSuggestedRelations?: () => void;
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

type ItemStatus = 'new' | 'exact-match' | 'similar-match';


export const AISuggestionPanel = React.memo(function AISuggestionPanel({
  mapData,
  currentMapNodes = [],
  extractedConcepts = [],
  suggestedRelations = [],
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
      setDraggedRelationPreview: s.setDraggedRelationPreview // Added
    }), [])
  );

  const [editableExtracted, setEditableExtracted] = useState<EditableSuggestion[]>([]);
  const [editableRelations, setEditableRelations] = useState<EditableRelationSuggestion[]>([]);

  const [selectedExtractedIndices, setSelectedExtractedIndices] = useState<Set<number>>(new Set());
  const [selectedRelationIndices, setSelectedRelationIndices] = useState<Set<number>>(new Set());

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


  const handleToggleEdit = (type: 'extracted' | 'relation', index: number, field?: 'source' | 'target' | 'relation') => {
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
  };

  const handleInputChange = (type: 'extracted' | 'relation', index: number, value: string, field?: 'source' | 'target' | 'relation') => {
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
  };

  const handleConfirmEdit = (type: 'extracted' | 'relation', index: number) => {
    handleToggleEdit(type, index); 
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


  const hasAiOutput = editableExtracted.length > 0 || editableRelations.length > 0;
  const hasMapDataNodes = currentMapNodes && currentMapNodes.length > 0;

  const renderSuggestionSection = (
    title: string,
    IconComponent: React.ElementType,
    items: (EditableSuggestion | EditableRelationSuggestion)[],
    selectedIndicesSet: Set<number>,
    itemKeyPrefix: string,
    renderItemContent: (item: any, index: number, itemStatus: ItemStatus, relationNodeExistence?: { source?: boolean, target?: boolean }) => React.ReactNode,
    getItemStatus: (itemValue: string | { source: string, target: string }) => ItemStatus,
    checkIfRelationNodesExistOnMap: (relation: { source: string; target: string }) => { source?: boolean, target?: boolean },
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

    const getComparableItemValue = (item: EditableSuggestion | EditableRelationSuggestion) => {
      return 'current' in item && typeof item.current !== 'string' ? item.current : (item as EditableSuggestion).current;
    };

    const selectableItems = items.filter((item) => {
      const value = getComparableItemValue(item);
      const status = getItemStatus(value as string | {source: string; target: string}); 
      return status !== 'exact-match';
    });
    
    const clearSelectionForCategory = () => {
      if (itemKeyPrefix.startsWith('extracted-')) setSelectedExtractedIndices(new Set());
      else if (itemKeyPrefix.startsWith('relation-')) setSelectedRelationIndices(new Set());
    };

    const handleRelationDragStart = (event: React.DragEvent<HTMLDivElement>, relationLabel: string) => {
      event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'relation-suggestion',
        label: relationLabel,
      }));
      event.dataTransfer.effectAllowed = 'copy';
      console.log('[AISuggestionPanel] Dragging relation:', relationLabel);
    };

    const handleAddSelected = () => {
      if (!onAddSelectedItems) return;
      const toAdd = items
        .filter((_item, index) => selectedIndicesSet.has(index))
        .map(item => (item as EditableRelationSuggestion).original ? (item as EditableRelationSuggestion).current : (item as EditableSuggestion).current)
        .filter(itemValue => {
             const status = getItemStatus(itemValue as string | {source: string; target: string});
             return status !== 'exact-match';
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
                const status = getItemStatus(value as string | {source: string; target: string});
                if (status !== 'exact-match') { 
                    newSelectedIndices.add(index);
                }
            });
        }
        if (itemKeyPrefix.startsWith('extracted-')) setSelectedExtractedIndices(newSelectedIndices);
        else if (itemKeyPrefix.startsWith('relation-')) setSelectedRelationIndices(newSelectedIndices);
    };

    const allSelectableAreChecked = selectableItems.length > 0 && selectedIndicesSet.size >= selectableItems.length &&
        items.every((item, index) => {
            const value = getComparableItemValue(item);
            const status = getItemStatus(value as string | {source: string; target: string});
            if (status !== 'exact-match') { 
                return selectedIndicesSet.has(index);
            }
            return true; 
        });

    const countOfSelectedAndSelectable = items.filter((item, index) => {
        const value = getComparableItemValue(item);
        const status = getItemStatus(value as string | {source: string; target: string});
        return selectedIndicesSet.has(index) && status !== 'exact-match';
      }).length;

    const countOfAllNewOrSimilar = selectableItems.length;


    return (
      <Card className={cn("mb-4 bg-background/80 shadow-md", cardClassName)}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className={cn("text-base font-semibold flex items-center", titleClassName || "text-primary")}>
              <IconComponent className="mr-2 h-5 w-5" /> {title} ({items.length})
            </CardTitle>
            <div className="flex items-center space-x-2">
                {!isViewOnlyMode && items.length > 0 && selectableItems.length > 0 && onAddSelectedItems && (
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
              const itemStatus = getItemStatus(itemValue as string | {source: string; target: string});
              const relationNodeExistence = itemKeyPrefix.startsWith('relation-') ? checkIfRelationNodesExistOnMap(itemValue as { source: string; target: string }) : undefined;

              return (
                <div key={displayId} className={cn(
                    "flex items-start space-x-3 p-2 border-b last:border-b-0",
                    itemStatus === 'exact-match' && !itemKeyPrefix.startsWith('relation-') && "opacity-60 bg-muted/30", 
                    itemStatus === 'similar-match' && !itemKeyPrefix.startsWith('relation-') && "bg-yellow-500/5 border-yellow-500/20"
                )}>
                  {!isViewOnlyMode && onAddSelectedItems && (
                    <Checkbox
                      id={displayId}
                      checked={selectedIndicesSet.has(index)}
                      onCheckedChange={(checked) => handleSelectionToggleFactory(
                        itemKeyPrefix.startsWith('extracted-') ? 'extracted' : 'relation'
                      )(index, Boolean(checked))}
                      disabled={(itemStatus === 'exact-match' && !itemKeyPrefix.startsWith('relation-')) || item.isEditing || isViewOnlyMode}
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
                if (selectableItems.length > 0 && onAddSelectedItems) {
                   onAddSelectedItems(selectableItems.map(item => getComparableItemValue(item as EditableSuggestion | EditableRelationSuggestion)));
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

  const renderEditableConceptLabel = (item: EditableSuggestion, index: number, type: 'extracted', itemStatus: ItemStatus) => {
    const isExactMatch = itemStatus === 'exact-match';
    const isSimilarMatch = itemStatus === 'similar-match';

    const handleDragStart = (event: React.DragEvent<HTMLDivElement>, conceptText: string, conceptType?: string) => {
      event.dataTransfer.setData('application/json', JSON.stringify({
        type: 'concept-suggestion',
        text: conceptText,
        // Pass the conceptType if available, or a default
        conceptType: conceptType || 'ai-concept'
      }));
      event.dataTransfer.effectAllowed = 'copy';
      setDragPreview({ text: conceptText, type: conceptType || 'ai-concept' });
      // console.log('[AISuggestionPanel] Dragging concept:', conceptText, 'Type:', conceptType || 'ai-concept');
    };

    const handleDragEnd = () => {
      clearDragPreview();
    };

    if (item.isEditing && !isViewOnlyMode) {
      return (
        <div className="flex items-center space-x-2 w-full">
          <Input
            value={item.current}
            onChange={(e) => handleInputChange(type, index, e.target.value)}
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
      <div
        className="flex items-center justify-between w-full group"
        draggable={!isViewOnlyMode && !item.isEditing && !isExactMatch}
        onDragStart={(e) => !isViewOnlyMode && !item.isEditing && !isExactMatch && handleDragStart(e, item.current, 'ai-concept')} // Pass a default type
        onDragEnd={handleDragEnd} // Add onDragEnd
        title={!isViewOnlyMode && !item.isEditing && !isExactMatch ? "Drag this concept to the canvas" : ""}
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
          {item.current}
        </Label>
        {!isViewOnlyMode && !isExactMatch && (
          <Button size="icon" variant="ghost" onClick={() => handleToggleEdit(type, index)} className="h-6 w-6 opacity-0 group-hover:opacity-100" disabled={isViewOnlyMode}>
            <Edit3 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const renderEditableRelationLabel = (item: EditableRelationSuggestion, index: number, _itemStatus: ItemStatus, relationNodeExistence?: { source?: boolean, target?: boolean }) => {
    const renderField = (field: 'source' | 'target' | 'relation', nodeExists?: boolean) => {
      if (item.isEditing && item.editingField === field && !isViewOnlyMode) {
        return (
          <Input
            value={item.current[field]}
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
          {item.current[field]}
          {nodeExists && <CheckSquare className="h-3 w-3 ml-1 text-green-600 inline-block" title="This node exists on the map"/>}
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
        title={!isViewOnlyMode && !item.isEditing ? "Drag this relation to the canvas (experimental)" : ""}
      >
        <GitFork className={cn("h-4 w-4 mr-2 text-purple-500 flex-shrink-0", !isViewOnlyMode && !item.isEditing && "cursor-grab")} />
        {renderField('source', relationNodeExistence?.source)}
        <span className="mx-1">→</span>
        {renderField('target', relationNodeExistence?.target)}
        <span className="mx-1 text-muted-foreground">({renderField('relation')})</span>
      </div>
    );
  };

  const getConceptStatus = useCallback((conceptValue: string | {source: string, target: string}): ItemStatus => {
      if (typeof conceptValue !== 'string') return 'new'; 
      const normalizedConcept = conceptValue.toLowerCase().trim();
      if (existingNodeTexts.has(normalizedConcept)) {
        return 'exact-match';
      }
      for (const existingNode of existingNodeTexts) {
        if (existingNode.length !== normalizedConcept.length && (existingNode.includes(normalizedConcept) || normalizedConcept.includes(existingNode))) {
             return 'similar-match';
        }
      }
      return 'new';
  }, [existingNodeTexts]);

  const checkRelationNodesExistOnMap = useCallback((relationValue: { source: string; target: string }) => {
    return {
      source: existingNodeTexts.has(relationValue.source.toLowerCase().trim()),
      target: existingNodeTexts.has(relationValue.target.toLowerCase().trim())
    };
  }, [existingNodeTexts]);

  const mainContent = () => {
    if (!hasMapDataNodes && !hasAiOutput) {
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
    if (hasMapDataNodes && !hasAiOutput) {
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
          {onAddExtractedConcepts && renderSuggestionSection(
            "Extracted Concepts", SearchCode, editableExtracted, selectedExtractedIndices, "extracted-concept",
            (item, index, itemStatus) => renderEditableConceptLabel(item as EditableSuggestion, index, 'extracted', itemStatus),
            getConceptStatus, checkRelationNodesExistOnMap,
            onAddExtractedConcepts, onClearExtractedConcepts, 
            "bg-blue-500/5 border-blue-500/20", "text-blue-700 dark:text-blue-400"
          )}
          {onAddSuggestedRelations && renderSuggestionSection(
            "Suggested Relations", Lightbulb, editableRelations, selectedRelationIndices, "relation-",
             (item, index, itemStatus, relationNodeExist) => renderEditableRelationLabel(item as EditableRelationSuggestion, index, itemStatus, relationNodeExist),
            getConceptStatus, 
            checkRelationNodesExistOnMap,
            onAddSuggestedRelations, onClearSuggestedRelations, 
            "bg-purple-500/5 border-purple-500/20", "text-purple-700 dark:text-purple-400"
          )}
           {!hasAiOutput && hasMapDataNodes && ( 
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




