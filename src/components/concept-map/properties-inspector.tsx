
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Box, Waypoints } from "lucide-react";
import type { ConceptMap, ConceptMapNode, ConceptMapEdge } from "@/types";
// RFConceptMapNodeData, RFConceptMapEdgeData are not directly used here for updates, using ConceptMapNode/Edge types from store
import { Switch } from "@/components/ui/switch";
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


  const renderMapProperties = () => (
    <>
      <div>
        <Label htmlFor="mapNameInspector" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Map Name</Label>
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
                  className={cn((isViewOnlyMode || !currentMap) && "cursor-not-allowed data-[state=checked]:bg-muted-foreground/30 data-[state=unchecked]:bg-muted/30")}
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
        <Label htmlFor="sharedClassroomId" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Share with Classroom ID (Optional)</Label>
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
  
