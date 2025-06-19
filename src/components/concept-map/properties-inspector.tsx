"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Box, Waypoints, Palette, CircleDot, Eraser, Minus, ArrowBigLeft, ArrowBigRight, Ruler, Sparkles, MessageSquareQuote, Brain, HelpCircle, Lightbulb } from "lucide-react";
import type { ConceptMap, ConceptMapNode, ConceptMapEdge } from "@/types";
import { Switch } from "@/components/ui/switch";
import { AICommandPalette, type AICommand } from './ai-command-palette';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';
import useConceptMapStore from '@/stores/concept-map-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Button } from "@/components/ui/button"; 
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { suggestIntermediateNodeFlow, type SuggestIntermediateNodeOutputSchema } from '@/ai/flows';
import * as z from 'zod';

interface PropertiesInspectorProps {
  currentMap: ConceptMap | null; 
  onMapPropertiesChange: (properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => void;
  
  selectedElement?: ConceptMapNode | ConceptMapEdge | null; 
  selectedElementType?: 'node' | 'edge' | null;
  onSelectedElementPropertyUpdate?: (updates: Partial<ConceptMapNode> | Partial<ConceptMapEdge>) => void;
  onSuggestIntermediateNode?: (edgeId: string) => void; // New prop

  isNewMapMode?: boolean; 
  isViewOnlyMode?: boolean;
  editingNodeId?: string | null;
}

export const PropertiesInspector = React.memo(function PropertiesInspector({ 
  currentMap, 
  onMapPropertiesChange,
  selectedElement,
  selectedElementType,
  onSelectedElementPropertyUpdate,
  onSuggestIntermediateNode, // Destructure new prop
  isNewMapMode, 
  isViewOnlyMode,
  editingNodeId,
}: PropertiesInspectorProps) {
  
  const nodeLabelInputRef = useRef<HTMLInputElement>(null); // Ref for node label input
  const textareaDetailsRef = useRef<HTMLTextAreaElement>(null);

  const aiToolsHook = useConceptMapAITools(!!isViewOnlyMode);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteTargetRect, setPaletteTargetRect] = useState<DOMRect | null>(null);
  const [commandFilterText, setCommandFilterText] = useState("");

  const [aiIntermediateSuggestion, setAiIntermediateSuggestion] = useState<z.infer<typeof SuggestIntermediateNodeOutputSchema> | null>(null);
  const [isSuggestIntermediateDialogOpen, setIsSuggestIntermediateDialogOpen] = useState(false);
  const [isLoadingAISuggestion, setIsLoadingAISuggestion] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (
      !isViewOnlyMode &&
      selectedElementType === 'node' &&
      selectedElement &&
      editingNodeId &&
      selectedElement.id === editingNodeId &&
      nodeLabelInputRef.current
    ) {
      const timer = setTimeout(() => {
        nodeLabelInputRef.current?.focus();
        nodeLabelInputRef.current?.select();
      }, 50); // Small delay for DOM readiness
      return () => clearTimeout(timer);
    }
  }, [selectedElement, selectedElementType, editingNodeId, isViewOnlyMode]);


  const mapNameValue = currentMap?.name || "";
  const isPublicValue = currentMap?.isPublic || false;
  const sharedWithClassroomIdValue = currentMap?.sharedWithClassroomId || null;

  const elementLabelValue = selectedElement 
    ? (selectedElementType === 'node' ? (selectedElement as ConceptMapNode).text : (selectedElement as ConceptMapEdge).label) || "" 
    : "";
  const elementDetailsValue = (selectedElementType === 'node' ? (selectedElement as ConceptMapNode)?.details : "") || "";
  const elementNodeTypeValue = (selectedElementType === 'node' ? (selectedElement as ConceptMapNode)?.type : "") || "default";
  
  const nodeBackgroundColorValue = (selectedElementType === 'node' ? (selectedElement as ConceptMapNode)?.backgroundColor : undefined);
  const nodeShapeValue = (selectedElementType === 'node' ? (selectedElement as ConceptMapNode)?.shape : 'rectangle') || 'rectangle';
  const nodeWidthValue = (selectedElementType === 'node' ? (selectedElement as ConceptMapNode)?.width : undefined);
  const nodeHeightValue = (selectedElementType === 'node' ? (selectedElement as ConceptMapNode)?.height : undefined);


  const edgeColorValue = (selectedElementType === 'edge' ? (selectedElement as ConceptMapEdge)?.color : undefined);
  const edgeLineTypeValue = (selectedElementType === 'edge' ? (selectedElement as ConceptMapEdge)?.lineType : 'solid') || 'solid';
  const edgeMarkerStartValue = (selectedElementType === 'edge' ? (selectedElement as ConceptMapEdge)?.markerStart : 'none') || 'none';
  const edgeMarkerEndValue = (selectedElementType === 'edge' ? (selectedElement as ConceptMapEdge)?.markerEnd : 'arrowclosed') || 'arrowclosed';


  const handleMapNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode || !currentMap) return;
    onMapPropertiesChange({ 
      name: e.target.value, 
      isPublic: isPublicValue, 
      sharedWithClassroomId: sharedWithClassroomIdValue 
    });
  }, [isViewOnlyMode, currentMap, onMapPropertiesChange, isPublicValue, sharedWithClassroomIdValue]);

  const handleIsPublicChange = React.useCallback((checked: boolean) => {
    if (isViewOnlyMode || !currentMap) return;
    onMapPropertiesChange({ 
      name: mapNameValue, 
      isPublic: checked, 
      sharedWithClassroomId: sharedWithClassroomIdValue 
    });
  }, [isViewOnlyMode, currentMap, onMapPropertiesChange, mapNameValue, sharedWithClassroomIdValue]);

  const handleSharedIdChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode || !currentMap) return;
    onMapPropertiesChange({ 
      name: mapNameValue, 
      isPublic: isPublicValue, 
      sharedWithClassroomId: e.target.value.trim() || null 
    });
  }, [isViewOnlyMode, currentMap, onMapPropertiesChange, mapNameValue, isPublicValue]);

  const handleElementLabelChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || !selectedElement) return;
    if (selectedElementType === 'node') {
      onSelectedElementPropertyUpdate({ text: e.target.value });
    } else if (selectedElementType === 'edge') {
      onSelectedElementPropertyUpdate({ label: e.target.value });
    }
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElement, selectedElementType]);

  const handleElementDetailsChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ details: e.target.value });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const handleElementNodeTypeChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ type: e.target.value });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const handleNodeBackgroundColorChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ backgroundColor: e.target.value });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);
  
  const clearNodeBackgroundColor = React.useCallback(() => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ backgroundColor: undefined });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const handleNodeShapeChange = React.useCallback((value: 'rectangle' | 'ellipse') => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ shape: value });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const handleNodeDimensionChange = React.useCallback((dimension: 'width' | 'height', value: string) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node' || !selectedElement) return;
    const numValue = parseInt(value, 10);
    const updateValue = !isNaN(numValue) && numValue > 0 ? numValue : undefined;
    onSelectedElementPropertyUpdate({ [dimension]: updateValue });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const handleClearNodeDimensions = React.useCallback(() => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ width: undefined, height: undefined });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);


  const handleEdgeColorChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'edge' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ color: e.target.value });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const clearEdgeColor = React.useCallback(() => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'edge' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ color: undefined }); 
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const handleEdgeLineTypeChange = React.useCallback((value: 'solid' | 'dashed') => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'edge' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ lineType: value });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const handleEdgeMarkerChange = React.useCallback((markerEnd: 'start' | 'end', value: string) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'edge' || !selectedElement) return;
    if (markerEnd === 'start') onSelectedElementPropertyUpdate({ markerStart: value });
    else onSelectedElementPropertyUpdate({ markerEnd: value });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const aiCommands = useMemo<AICommand[]>(() => {
    if (!selectedElement || selectedElementType !== 'node') return [];
    const nodeId = selectedElement.id;
    // const nodeText = (selectedElement as ConceptMapNode).text;
    // const nodeDetails = (selectedElement as ConceptMapNode).details || "";

    return [
      { id: "expand", label: "Expand Node", icon: Sparkles, description: "Generate related ideas", action: () => aiToolsHook.openExpandConceptModal(nodeId) },
      { id: "rewrite", label: "Rewrite Content", icon: MessageSquareQuote, description: "Refine text using AI", action: () => aiToolsHook.openRewriteNodeContentModal(nodeId) },
      { id: "ask", label: "Ask Question", icon: HelpCircle, description: "Get insights about this node", action: () => aiToolsHook.openAskQuestionModal(nodeId) },
      { id: "extract", label: "Extract Concepts", icon: Brain, description: "Identify key concepts from details", action: () => aiToolsHook.openExtractConceptsModal(nodeId) },
      // Add more commands as needed
    ];
  }, [aiToolsHook, selectedElement, selectedElementType]);

  const originalHandleElementDetailsChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node' || !selectedElement) return;
    onSelectedElementPropertyUpdate({ details: e.target.value });
  }, [isViewOnlyMode, onSelectedElementPropertyUpdate, selectedElementType, selectedElement]);

  const handleElementDetailsChangeWithPalette = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    originalHandleElementDetailsChange(e); // Call original handler first

    const value = e.target.value;
    const lastSlashAiIndex = value.lastIndexOf("/ai");

    if (lastSlashAiIndex !== -1) {
      const textAfterSlashAi = value.substring(lastSlashAiIndex + 3); // +3 for "/ai"
      setCommandFilterText(textAfterSlashAi.trimStart()); // Trim only start for active filtering

      if (textareaDetailsRef.current) {
         // Attempt to get caret position to position palette
        const textarea = textareaDetailsRef.current;
        const selectionStart = textarea.selectionStart;

        // This is a simplified way to get rect; more complex calculations might be needed for precise caret position
        // For now, using the textarea's bounding rect. A library might be better for exact caret.
        const rect = textarea.getBoundingClientRect();
        // Create a mock rect at the bottom of the textarea for now
        // A more precise solution would involve calculating caret position within the textarea
        const dummyRect = {
            bottom: rect.bottom,
            left: rect.left, // + (charWidth * (selectionStart % textarea.cols)), // simplistic
            top: rect.top,
            right: rect.right,
            width: 1, // Minimal width
            height: parseFloat(window.getComputedStyle(textarea).lineHeight) || 16, // Approximate line height
            x: rect.left,
            y: rect.top,
            toJSON: () => dummyRect, // Ensure toJSON is present if DOMRect is strictly expected
        } as DOMRect;
        setPaletteTargetRect(dummyRect);
      }
      setIsPaletteOpen(true);
    } else {
      setIsPaletteOpen(false);
      setCommandFilterText("");
    }
  }, [originalHandleElementDetailsChange]);


  const handleSelectCommand = useCallback((command: AICommand) => {
    command.action();

    // Clear the "/ai <filter>" text from the Textarea
    if (textareaDetailsRef.current) {
        const currentValue = textareaDetailsRef.current.value;
        const lastSlashAiIndex = currentValue.lastIndexOf("/ai");
        if (lastSlashAiIndex !== -1) {
            const newValue = currentValue.substring(0, lastSlashAiIndex);
            // Directly update the store/state with the new value
            if (onSelectedElementPropertyUpdate && selectedElementType === 'node') {
                 onSelectedElementPropertyUpdate({ details: newValue });
            }
             // If not using a controlled component for Textarea value, manually update:
            // textareaDetailsRef.current.value = newValue;
        }
    }

    setIsPaletteOpen(false);
    setCommandFilterText("");
  }, [onSelectedElementPropertyUpdate, selectedElementType]);

  const handleClosePalette = useCallback(() => {
    setIsPaletteOpen(false);
    // Optionally, clear the /ai command from textarea here too if desired upon manual close
  }, []);

  const handleTriggerSuggestIntermediateNode = useCallback(async () => {
    if (isViewOnlyMode || selectedElementType !== 'edge' || !selectedElement) {
      toast({ title: "Action Unavailable", description: "Please select an edge to use this feature.", variant: "default" });
      return;
    }

    const edge = selectedElement as ConceptMapEdge;
    const { nodes } = useConceptMapStore.getState().mapData;
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      toast({ title: "Error", description: "Source or target node for the selected edge not found.", variant: "destructive" });
      return;
    }

    setIsLoadingAISuggestion(true);
    const loadingToast = toast({ title: "AI Suggestion", description: "Generating intermediate node suggestion..." });

    try {
      const input = {
        sourceNodeText: sourceNode.text,
        sourceNodeDetails: sourceNode.details,
        targetNodeText: targetNode.text,
        targetNodeDetails: targetNode.details,
        currentEdgeLabel: edge.label,
      };
      const result = await suggestIntermediateNodeFlow(input);
      setAiIntermediateSuggestion(result);
      setIsSuggestIntermediateDialogOpen(true);
      loadingToast.dismiss();
    } catch (error) {
      console.error("Error suggesting intermediate node:", error);
      loadingToast.dismiss();
      toast({ title: "AI Error", description: "Failed to suggest intermediate node. " + (error instanceof Error ? error.message : ""), variant: "destructive" });
      setAiIntermediateSuggestion(null);
    } finally {
      setIsLoadingAISuggestion(false);
    }
  }, [isViewOnlyMode, selectedElement, selectedElementType, toast]);

  const handleConfirmAISuggestion = useCallback(() => {
    if (!aiIntermediateSuggestion || !selectedElement || selectedElementType !== 'edge') return;

    const { addNode, addEdge, deleteEdge, mapData } = useConceptMapStore.getState();
    const selectedEdge = selectedElement as ConceptMapEdge;

    const sourceNode = mapData.nodes.find(n => n.id === selectedEdge.source);
    const targetNode = mapData.nodes.find(n => n.id === selectedEdge.target);

    if (!sourceNode || !targetNode) {
        toast({ title: "Error", description: "Source or target node not found for edge modification.", variant: "destructive"});
        setIsSuggestIntermediateDialogOpen(false);
        setAiIntermediateSuggestion(null);
        return;
    }

    // Calculate midpoint for the new node
    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2;

    try {
      const newNodeId = addNode({
        text: aiIntermediateSuggestion.intermediateNodeText,
        position: { x: midX, y: midY + 30 }, // Offset slightly to avoid overlap
        type: 'ai-intermediate', // A new type for styling?
      });

      addEdge({
        source: selectedEdge.source,
        target: newNodeId,
        label: aiIntermediateSuggestion.edgeToIntermediateLabel,
      });

      addEdge({
        source: newNodeId,
        target: selectedEdge.target,
        label: aiIntermediateSuggestion.edgeFromIntermediateLabel,
      });

      deleteEdge(selectedEdge.id);

      toast({ title: "Success", description: "Intermediate node and new edges added." });
    } catch (error) {
        console.error("Error applying intermediate node suggestion:", error);
        toast({ title: "Error", description: "Failed to apply suggestion. " + (error instanceof Error ? error.message : ""), variant: "destructive"});
    }


    setIsSuggestIntermediateDialogOpen(false);
    setAiIntermediateSuggestion(null);
  }, [aiIntermediateSuggestion, selectedElement, selectedElementType, toast]);


  const renderMapProperties = () => (
    <>
      <div>
        <Label htmlFor="mapNameInspector" className={cn((isViewOnlyMode || !currentMap) && "text-muted-foreground/70")}>Map Name</Label>
        <Input 
          id="mapNameInspector" 
          value={mapNameValue} 
          onChange={handleMapNameChange}
          placeholder="Enter map name"
          disabled={isViewOnlyMode || !currentMap}
          className={cn((isViewOnlyMode || !currentMap) && "bg-muted/50 cursor-not-allowed border-muted/50")}
        />
      </div>
      <div>
          <div className="flex items-center space-x-2 mt-2">
              <Switch 
                  id="isPublicSwitch" 
                  checked={isPublicValue} 
                  onCheckedChange={handleIsPublicChange}
                  disabled={isViewOnlyMode || !currentMap}
                  className={cn((isViewOnlyMode || !currentMap) && "data-[state=checked]:bg-muted-foreground/30 data-[state=unchecked]:bg-muted/30")}
              />
              <Label 
                htmlFor="isPublicSwitch" 
                className={cn("transition-opacity", (isViewOnlyMode || !currentMap) ? "cursor-not-allowed text-muted-foreground/70" : "cursor-pointer")}
              >
                Publicly Visible
              </Label>
          </div>
      </div>
        <div className="mt-2">
        <Label htmlFor="sharedClassroomId" className={cn((isViewOnlyMode || !currentMap) && "text-muted-foreground/70")}>Share with Classroom ID (Optional)</Label>
        <Input 
          id="sharedClassroomId" 
          value={sharedWithClassroomIdValue || ""} 
          onChange={handleSharedIdChange}
          placeholder="Enter classroom ID or leave blank"
          disabled={isViewOnlyMode || !currentMap}
          className={cn((isViewOnlyMode || !currentMap) && "bg-muted/50 cursor-not-allowed border-muted/50")}
        />
      </div>
    </>
  );

  const renderNodeProperties = () => (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Box className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-semibold text-md">Node Properties</h4>
      </div>
      <div>
        <Label htmlFor="nodeLabel" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Label (Text)</Label>
        <Input 
            id="nodeLabel"
            ref={nodeLabelInputRef} // Assign ref here
            value={elementLabelValue} 
            onChange={handleElementLabelChange} 
            disabled={isViewOnlyMode} 
            className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
        />
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeDetails" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Details (type "/ai" for commands)</Label>
        <Textarea 
            id="nodeDetails"
            ref={textareaDetailsRef}
            value={elementDetailsValue} 
            onChange={handleElementDetailsChangeWithPalette}
            disabled={isViewOnlyMode} 
            rows={3} 
            className={cn("resize-none", isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
        />
         <AICommandPalette
          isOpen={isPaletteOpen && !isViewOnlyMode}
          targetRect={paletteTargetRect}
          commands={aiCommands}
          filterText={commandFilterText}
          onSelectCommand={handleSelectCommand}
          onClose={handleClosePalette}
        />
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeType" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Type</Label>
        <Input 
          id="nodeType" 
          value={elementNodeTypeValue} 
          onChange={handleElementNodeTypeChange} 
          disabled={isViewOnlyMode} 
          placeholder="e.g., service, component"
          className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
        /> 
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeBackgroundColor" className={cn("flex items-center gap-2", isViewOnlyMode && "text-muted-foreground/70")}>
            <Palette className="h-4 w-4 text-muted-foreground" /> Background Color
        </Label>
        <div className="flex items-center gap-2">
            <Input 
              id="nodeBackgroundColor" 
              type="color" 
              value={nodeBackgroundColorValue || "#ffffff"} 
              onChange={handleNodeBackgroundColorChange}
              disabled={isViewOnlyMode}
              className={cn("h-8 w-16 p-1", isViewOnlyMode && "cursor-not-allowed border-muted/50 bg-muted/50")}
            />
            <Button variant="ghost" size="icon" onClick={clearNodeBackgroundColor} disabled={isViewOnlyMode || nodeBackgroundColorValue === undefined} title="Clear custom background color">
                <Eraser className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeShape" className={cn("flex items-center gap-2", isViewOnlyMode && "text-muted-foreground/70")}>
          <CircleDot className="h-4 w-4 text-muted-foreground" /> Node Shape
        </Label>
        <Select 
            value={nodeShapeValue} 
            onValueChange={(value) => handleNodeShapeChange(value as 'rectangle' | 'ellipse')}
            disabled={isViewOnlyMode}
        >
            <SelectTrigger className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}>
                <SelectValue placeholder="Select shape" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="rectangle">Rectangle</SelectItem>
                <SelectItem value="ellipse">Ellipse / Circle</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="mt-3 space-y-2">
         <Label className={cn("flex items-center gap-2", isViewOnlyMode && "text-muted-foreground/70")}>
            <Ruler className="h-4 w-4 text-muted-foreground" /> Dimensions (px)
        </Label>
        <div className="grid grid-cols-2 gap-2">
            <div>
                <Label htmlFor="nodeWidth" className="text-xs text-muted-foreground">Width</Label>
                <Input 
                    id="nodeWidth" 
                    type="number" 
                    value={nodeWidthValue === undefined ? "" : nodeWidthValue} 
                    onChange={(e) => handleNodeDimensionChange('width', e.target.value)}
                    placeholder="Auto"
                    disabled={isViewOnlyMode}
                    className={cn("h-9", isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
                />
            </div>
            <div>
                <Label htmlFor="nodeHeight" className="text-xs text-muted-foreground">Height</Label>
                <Input 
                    id="nodeHeight" 
                    type="number" 
                    value={nodeHeightValue === undefined ? "" : nodeHeightValue} 
                    onChange={(e) => handleNodeDimensionChange('height', e.target.value)}
                    placeholder="Auto"
                    disabled={isViewOnlyMode}
                    className={cn("h-9", isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
                />
            </div>
        </div>
        <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearNodeDimensions} 
            disabled={isViewOnlyMode || (nodeWidthValue === undefined && nodeHeightValue === undefined)}
            className="w-full text-xs"
        >
            Reset to Auto-Size
        </Button>
      </div>
    </>
  );

  const renderEdgeProperties = () => (
     <>
      <div className="flex items-center gap-2 mb-2">
        <Waypoints className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-semibold text-md">Edge Properties</h4>
      </div>
      <div>
        <Label htmlFor="edgeLabel" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Label</Label>
        <Input 
            id="edgeLabel" 
            value={elementLabelValue} 
            onChange={handleElementLabelChange} 
            disabled={isViewOnlyMode} 
            className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
        />
      </div>
      <div className="mt-2">
        <Label htmlFor="edgeColor" className={cn("flex items-center gap-2", isViewOnlyMode && "text-muted-foreground/70")}>
            <Palette className="h-4 w-4 text-muted-foreground" /> Line Color
        </Label>
         <div className="flex items-center gap-2">
            <Input 
              id="edgeColor" 
              type="color" 
              value={edgeColorValue || "#000000"} 
              onChange={handleEdgeColorChange}
              disabled={isViewOnlyMode}
              className={cn("h-8 w-16 p-1", isViewOnlyMode && "cursor-not-allowed border-muted/50 bg-muted/50")}
            />
            <Button variant="ghost" size="icon" onClick={clearEdgeColor} disabled={isViewOnlyMode || edgeColorValue === undefined} title="Clear custom line color">
                <Eraser className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <div className="mt-2">
        <Label htmlFor="edgeLineType" className={cn("flex items-center gap-2", isViewOnlyMode && "text-muted-foreground/70")}>
            <Minus className="h-4 w-4 text-muted-foreground"/>Line Type
        </Label>
        <Select 
            value={edgeLineTypeValue} 
            onValueChange={(value) => handleEdgeLineTypeChange(value as 'solid' | 'dashed')}
            disabled={isViewOnlyMode}
        >
            <SelectTrigger className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}>
                <SelectValue placeholder="Select line type" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="dashed">Dashed</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="mt-2">
        <Label htmlFor="edgeMarkerStart" className={cn("flex items-center gap-2", isViewOnlyMode && "text-muted-foreground/70")}>
            <ArrowBigLeft className="h-4 w-4 text-muted-foreground" /> Start Arrow
        </Label>
        <Select 
            value={edgeMarkerStartValue} 
            onValueChange={(value) => handleEdgeMarkerChange('start', value)}
            disabled={isViewOnlyMode}
        >
            <SelectTrigger className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}>
                <SelectValue placeholder="Select start arrow" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="arrow">Arrow (Open)</SelectItem>
                <SelectItem value="arrowclosed">Arrow (Closed)</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="mt-2">
        <Label htmlFor="edgeMarkerEnd" className={cn("flex items-center gap-2", isViewOnlyMode && "text-muted-foreground/70")}>
            <ArrowBigRight className="h-4 w-4 text-muted-foreground" /> End Arrow
        </Label>
        <Select 
            value={edgeMarkerEndValue} 
            onValueChange={(value) => handleEdgeMarkerChange('end', value)}
            disabled={isViewOnlyMode}
        >
            <SelectTrigger className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}>
                <SelectValue placeholder="Select end arrow" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="arrow">Arrow (Open)</SelectItem>
                <SelectItem value="arrowclosed">Arrow (Closed)</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <div className="mt-4 pt-4 border-t">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleTriggerSuggestIntermediateNode}
          disabled={isLoadingAISuggestion || isViewOnlyMode || !selectedElement}
        >
          {isLoadingAISuggestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
          Suggest Intermediate Node (AI)
        </Button>
      </div>
    </>
  );

  const getCardDescription = () => {
    if (!currentMap && !selectedElement) return "Load a map or select an element to see properties.";
    if (isViewOnlyMode) {
      return selectedElement 
        ? "Viewing selected element properties. Editing is disabled." 
        : "Viewing map properties. Editing is disabled.";
    }
    return selectedElement 
      ? "Edit selected element properties. Changes are applied immediately." 
      : "Edit map properties. Changes are applied immediately.";
  };

  return (
    <Card className="h-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Properties</CardTitle>
        </div>
        <CardDescription>
          {getCardDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedElementType === 'node' && selectedElement ? renderNodeProperties() :
         selectedElementType === 'edge' && selectedElement ? renderEdgeProperties() :
         currentMap ? renderMapProperties() : 
         <p className="text-sm text-muted-foreground">No map loaded or selected.</p> 
        }
        
        {!isViewOnlyMode && (currentMap || selectedElement) && (
            <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
            Changes are applied to the map state directly. Use the main &quot;Save Map&quot; button in the toolbar to persist them.
            </p>
        )}
         {isViewOnlyMode && (currentMap || selectedElement) && (
            <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
                This map is in view-only mode. Editing features are disabled.
            </p>
        )}
      </CardContent>

      {aiIntermediateSuggestion && (
        <AlertDialog open={isSuggestIntermediateDialogOpen} onOpenChange={setIsSuggestIntermediateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>AI Suggestion: Intermediate Node</AlertDialogTitle>
              <AlertDialogDescription>
                The AI suggests adding the following intermediate node and new edge labels.
                Would you like to apply this change?
                <div className="mt-4 space-y-2 text-sm text-foreground bg-muted/50 p-3 rounded-md">
                  <p><strong>Source Node:</strong> {(selectedElement as ConceptMapEdge)?.source ? useConceptMapStore.getState().mapData.nodes.find(n=>n.id === (selectedElement as ConceptMapEdge).source)?.text : 'N/A'}</p>
                  <p><strong>Suggested New Node:</strong> "{aiIntermediateSuggestion.intermediateNodeText}"</p>
                  <p><strong>Edge 1 (Source &rarr; New):</strong> "{aiIntermediateSuggestion.edgeToIntermediateLabel}"</p>
                  <p><strong>Edge 2 (New &rarr; Target):</strong> "{aiIntermediateSuggestion.edgeFromIntermediateLabel}"</p>
                  <p><strong>Target Node:</strong> {(selectedElement as ConceptMapEdge)?.target ? useConceptMapStore.getState().mapData.nodes.find(n=>n.id === (selectedElement as ConceptMapEdge).target)?.text : 'N/A'}</p>
                </div>
                 <p className="mt-2 text-xs text-muted-foreground">The original edge will be deleted if you confirm.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAiIntermediateSuggestion(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmAISuggestion}>Confirm & Apply</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
});
PropertiesInspector.displayName = "PropertiesInspector";
  

    