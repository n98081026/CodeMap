
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Box, Waypoints } from "lucide-react";
import type { ConceptMap, ConceptMapNode, ConceptMapEdge } from "@/types";
import { RFConceptMapNodeData, RFConceptMapEdgeData } from "@/components/concept-map/interactive-canvas"; // Import from canvas
import { useEffect, useState, useRef } from "react";
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
  onSelectedElementPropertyUpdate?: (updates: Partial<RFConceptMapNodeData> | Partial<RFConceptMapEdgeData>) => void;

  isNewMapMode?: boolean; 
  isViewOnlyMode?: boolean;
}

export function PropertiesInspector({ 
  currentMap, 
  onMapPropertiesChange,
  selectedElement,
  selectedElementType,
  onSelectedElementPropertyUpdate,
  isNewMapMode, 
  isViewOnlyMode 
}: PropertiesInspectorProps) {
  
  const [localMapName, setLocalMapName] = useState("");
  const [localIsPublic, setLocalIsPublic] = useState(false);
  const [localSharedWithClassroomId, setLocalSharedWithClassroomId] = useState<string | null>(null);
  
  const [elementLabel, setElementLabel] = useState("");
  const [elementDetails, setElementDetails] = useState("");
  const [elementNodeType, setElementNodeType] = useState(""); 


  useEffect(() => {
    if (currentMap) {
      setLocalMapName(currentMap.name);
      setLocalIsPublic(currentMap.isPublic);
      setLocalSharedWithClassroomId(currentMap.sharedWithClassroomId || null);
    }
    // If currentMap is null (e.g., store not yet initialized fully for a new map, or an error state),
    // local states will retain their initial empty/false values or previous values.
    // The responsibility of initializing default map properties for a "new" map lies with
    // the store's `initializeNewMap` action. This effect simply reflects the store's current state.
  }, [currentMap]);


  useEffect(() => {
    if (selectedElement && selectedElementType) {
      if (selectedElementType === 'node') {
        const node = selectedElement as ConceptMapNode;
        setElementLabel(node.text);
        setElementDetails(node.details || "");
        setElementNodeType(node.type || 'default');
      } else if (selectedElementType === 'edge') {
        const edge = selectedElement as ConceptMapEdge;
        setElementLabel(edge.label);
        setElementDetails(""); 
        setElementNodeType(""); 
      }
    } else {
      setElementLabel("");
      setElementDetails("");
      setElementNodeType("");
    }
  }, [selectedElement, selectedElementType]);


  const handleMapNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode) return;
    const newName = e.target.value;
    setLocalMapName(newName); // Update local state for immediate UI feedback
    onMapPropertiesChange({ name: newName, isPublic: localIsPublic, sharedWithClassroomId: localSharedWithClassroomId });
  };
  const handleIsPublicChange = (checked: boolean) => {
    if (isViewOnlyMode) return;
    setLocalIsPublic(checked); // Update local state
    onMapPropertiesChange({ name: localMapName, isPublic: checked, sharedWithClassroomId: localSharedWithClassroomId });
  };
  const handleSharedIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode) return;
    const newSharedId = e.target.value.trim() || null;
    setLocalSharedWithClassroomId(newSharedId); // Update local state
    onMapPropertiesChange({ name: localMapName, isPublic: localIsPublic, sharedWithClassroomId: newSharedId });
  };

  const handleElementLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate) return;
    const newLabel = e.target.value;
    setElementLabel(newLabel);
    onSelectedElementPropertyUpdate({ label: newLabel });
  };
  const handleElementDetailsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node') return;
    const newDetails = e.target.value;
    setElementDetails(newDetails);
    onSelectedElementPropertyUpdate({ details: newDetails });
  };
  const handleElementNodeTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode || !onSelectedElementPropertyUpdate || selectedElementType !== 'node') return;
    const newType = e.target.value;
    setElementNodeType(newType);
    onSelectedElementPropertyUpdate({ type: newType });
  };


  const renderMapProperties = () => (
    <>
      <div>
        <Label htmlFor="mapNameInspector" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Map Name</Label>
        <Input 
          id="mapNameInspector" 
          value={localMapName} 
          onChange={handleMapNameChange}
          placeholder="Enter map name"
          disabled={isViewOnlyMode}
          className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
        />
      </div>
      <div>
          <div className="flex items-center space-x-2 mt-2">
              <Switch 
                  id="isPublicSwitch" 
                  checked={localIsPublic} 
                  onCheckedChange={handleIsPublicChange}
                  disabled={isViewOnlyMode}
                  className={cn(isViewOnlyMode && "cursor-not-allowed data-[state=checked]:bg-muted-foreground/30 data-[state=unchecked]:bg-muted/30")}
              />
              <Label 
                htmlFor="isPublicSwitch" 
                className={cn("transition-opacity", isViewOnlyMode ? "cursor-not-allowed text-muted-foreground/70" : "cursor-pointer")}
              >
                Publicly Visible
              </Label>
          </div>
      </div>
        <div className="mt-2">
        <Label htmlFor="sharedClassroomId" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Share with Classroom ID (Optional)</Label>
        <Input 
          id="sharedClassroomId" 
          value={localSharedWithClassroomId || ""} 
          onChange={handleSharedIdChange}
          placeholder="Enter classroom ID or leave blank"
          disabled={isViewOnlyMode}
          className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
        />
      </div>
    </>
  );

  const renderNodeProperties = (node: ConceptMapNode) => (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Box className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-semibold text-md">Node Properties</h4>
      </div>
      <div>
        <Label htmlFor="nodeLabel" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Label (Text)</Label>
        <Input id="nodeLabel" value={elementLabel} onChange={handleElementLabelChange} disabled={isViewOnlyMode} className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}/>
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeDetails" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Details</Label>
        <Textarea id="nodeDetails" value={elementDetails} onChange={handleElementDetailsChange} disabled={isViewOnlyMode} rows={3} className={cn("resize-none", isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}/>
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeType" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Type</Label>
        <Input 
          id="nodeType" 
          value={elementNodeType} 
          onChange={handleElementNodeTypeChange} 
          disabled={isViewOnlyMode} 
          placeholder="e.g., service, component, feature"
          className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}
        /> 
      </div>
    </>
  );

  const renderEdgeProperties = (edge: ConceptMapEdge) => (
     <>
      <div className="flex items-center gap-2 mb-2">
        <Waypoints className="h-5 w-5 text-muted-foreground" />
        <h4 className="font-semibold text-md">Edge Properties</h4>
      </div>
      <div>
        <Label htmlFor="edgeLabel" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Label</Label>
        <Input id="edgeLabel" value={elementLabel} onChange={handleElementLabelChange} disabled={isViewOnlyMode} className={cn(isViewOnlyMode && "bg-muted/50 cursor-not-allowed border-muted/50")}/>
      </div>
    </>
  );

  return (
    <Card className="h-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Properties</CardTitle>
        </div>
        <CardDescription>
          {selectedElement ? 
            (isViewOnlyMode ? "Viewing selected element properties." : "Edit selected element properties.") :
            (isViewOnlyMode ? "Viewing map properties." : "Edit map properties.")
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedElementType === 'node' && selectedElement ? renderNodeProperties(selectedElement as ConceptMapNode) :
         selectedElementType === 'edge' && selectedElement ? renderEdgeProperties(selectedElement as ConceptMapEdge) :
         renderMapProperties()}
        
        {(selectedElement && !isViewOnlyMode) && (
            <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
            Changes to element properties are applied directly. Save the map to persist.
            </p>
        )}
         {(!selectedElement && isViewOnlyMode) && (
             <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
                Map properties are not editable in view-only mode.
            </p>
        )}
         {(selectedElement && isViewOnlyMode) && (
             <p className="text-xs text-muted-foreground pt-4 border-t mt-4">
                Element properties are not editable in view-only mode.
            </p>
        )}
      </CardContent>
    </Card>
  );
}

