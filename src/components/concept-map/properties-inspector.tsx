"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Box, Waypoints, Palette, CircleDot, Eraser, Minus, ArrowBigLeft, ArrowBigRight, Ruler } from "lucide-react"; 
import type { ConceptMap, ConceptMapNode, ConceptMapEdge } from "@/types";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { Button } from "@/components/ui/button"; 
import { cn } from "@/lib/utils";

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

  isNewMapMode?: boolean; 
  isViewOnlyMode?: boolean;
}

export const PropertiesInspector = React.memo(function PropertiesInspector({ 
  currentMap, 
  onMapPropertiesChange,
  selectedElement,
  selectedElementType,
  onSelectedElementPropertyUpdate,
  isNewMapMode, 
  isViewOnlyMode 
}: PropertiesInspectorProps) {
  
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
            value={elementLabelValue} 
            onChange={handleElementLabelChange} 
            disabled={isViewOnlyMode} 
            className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
        />
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeDetails" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Details</Label>
        <Textarea 
            id="nodeDetails" 
            value={elementDetailsValue} 
            onChange={handleElementDetailsChange} 
            disabled={isViewOnlyMode} 
            rows={3} 
            className={cn("resize-none", isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
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
    </Card>
  );
});
PropertiesInspector.displayName = "PropertiesInspector";
  