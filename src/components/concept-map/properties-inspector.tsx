
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings2, Box, Waypoints } from "lucide-react";
import type { ConceptMap, ConceptMapNode, ConceptMapEdge } from "@/types";
import type { RFConceptMapNodeData, RFConceptMapEdgeData } from "@/app/application/concept-maps/editor/[mapId]/page";
import { useEffect, useState, useRef, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface PropertiesInspectorProps {
  currentMap: ConceptMap | null; // For map-level properties
  onMapPropertiesChange: (properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => void;
  
  selectedElement?: ConceptMapNode | ConceptMapEdge | null; // The actual element from mapData
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
  
  // State for map-level properties
  const [localMapName, setLocalMapName] = useState("");
  const [localIsPublic, setLocalIsPublic] = useState(false);
  const [localSharedWithClassroomId, setLocalSharedWithClassroomId] = useState<string | null>(null);
  
  // State for selected element properties
  const [elementLabel, setElementLabel] = useState("");
  const [elementDetails, setElementDetails] = useState("");
  // Add more states for other element properties if needed (e.g., type for nodes)

  const processedMapIdRef = useRef<string | null>(null);

  // Effect for map-level properties
  useEffect(() => {
    if (currentMap) {
      let nameToInitWith = currentMap.name;
      let isPublicToInitWith = currentMap.isPublic;
      let sharedIdToInitWith = currentMap.sharedWithClassroomId || null;

      if (isNewMapMode && currentMap.id === 'new' && processedMapIdRef.current !== 'new::' + currentMap.name) {
        if (currentMap.name === "New Concept Map" || currentMap.name === "Loading Map...") {
            nameToInitWith = "Untitled Concept Map";
        }
        isPublicToInitWith = currentMap.isPublic || false;
        sharedIdToInitWith = currentMap.sharedWithClassroomId || null;
        if (nameToInitWith === "Untitled Concept Map") {
          onMapPropertiesChange({
            name: nameToInitWith,
            isPublic: isPublicToInitWith,
            sharedWithClassroomId: sharedIdToInitWith,
          });
        }
      }
      setLocalMapName(nameToInitWith);
      setLocalIsPublic(isPublicToInitWith);
      setLocalSharedWithClassroomId(sharedIdToInitWith);
      processedMapIdRef.current = currentMap.id === 'new' ? `new::${currentMap.name}` : currentMap.id;
    } else {
      const defaultName = "Untitled Concept Map";
      setLocalMapName(defaultName);
      setLocalIsPublic(false);
      setLocalSharedWithClassroomId(null);
      onMapPropertiesChange({ name: defaultName, isPublic: false, sharedWithClassroomId: null });
      processedMapIdRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMap, isNewMapMode]);


  // Effect for selected element properties
  useEffect(() => {
    if (selectedElement && selectedElementType) {
      if (selectedElementType === 'node') {
        const node = selectedElement as ConceptMapNode;
        setElementLabel(node.text);
        setElementDetails(node.details || "");
      } else if (selectedElementType === 'edge') {
        const edge = selectedElement as ConceptMapEdge;
        setElementLabel(edge.label);
        setElementDetails(""); // Edges don't have details in current model
      }
    } else {
      setElementLabel("");
      setElementDetails("");
    }
  }, [selectedElement, selectedElementType]);


  // Handlers for map-level properties
  const handleMapNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode) return;
    const newName = e.target.value;
    setLocalMapName(newName);
    onMapPropertiesChange({ name: newName, isPublic: localIsPublic, sharedWithClassroomId: localSharedWithClassroomId });
  };
  const handleIsPublicChange = (checked: boolean) => {
    if (isViewOnlyMode) return;
    setLocalIsPublic(checked);
    onMapPropertiesChange({ name: localMapName, isPublic: checked, sharedWithClassroomId: localSharedWithClassroomId });
  };
  const handleSharedIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode) return;
    const newSharedId = e.target.value.trim() || null;
    setLocalSharedWithClassroomId(newSharedId);
    onMapPropertiesChange({ name: localMapName, isPublic: localIsPublic, sharedWithClassroomId: newSharedId });
  };

  // Handlers for selected element properties
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
          readOnly={isViewOnlyMode}
          className={cn(isViewOnlyMode && "cursor-not-allowed")}
        />
      </div>
      <div>
          <div className="flex items-center space-x-2 mt-2">
              <Switch 
                  id="isPublicSwitch" 
                  checked={localIsPublic} 
                  onCheckedChange={handleIsPublicChange}
                  disabled={isViewOnlyMode}
                  className={cn(isViewOnlyMode && "cursor-not-allowed")}
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
          readOnly={isViewOnlyMode}
          className={cn(isViewOnlyMode && "cursor-not-allowed")}
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
        <Input id="nodeLabel" value={elementLabel} onChange={handleElementLabelChange} disabled={isViewOnlyMode} />
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeDetails" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Details</Label>
        <Textarea id="nodeDetails" value={elementDetails} onChange={handleElementDetailsChange} disabled={isViewOnlyMode} rows={3} className="resize-none"/>
      </div>
      <div className="mt-2">
        <Label htmlFor="nodeType" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Type</Label>
        <Input id="nodeType" value={node.type || 'default'} disabled={isViewOnlyMode} readOnly /> 
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
        <Input id="edgeLabel" value={elementLabel} onChange={handleElementLabelChange} disabled={isViewOnlyMode} />
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
      </CardContent>
    </Card>
  );
}


    