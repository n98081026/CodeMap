
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Settings2 } from "lucide-react";
import type { ConceptMap } from "@/types";
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
  isNewMapMode?: boolean; 
  isViewOnlyMode?: boolean;
}

export function PropertiesInspector({ currentMap, onMapPropertiesChange, isNewMapMode, isViewOnlyMode }: PropertiesInspectorProps) {
  const [localMapName, setLocalMapName] = useState("");
  const [localIsPublic, setLocalIsPublic] = useState(false);
  const [localSharedWithClassroomId, setLocalSharedWithClassroomId] = useState<string | null>(null);
  
  const processedMapIdRef = useRef<string | null>(null);

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
         // If it's a truly new map, immediately propagate the "Untitled" name upwards
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


  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode) return;
    const newName = e.target.value;
    setLocalMapName(newName);
    onMapPropertiesChange({
      name: newName,
      isPublic: localIsPublic,
      sharedWithClassroomId: localSharedWithClassroomId,
    });
  };
  
  const handleIsPublicChange = (checked: boolean) => {
    if (isViewOnlyMode) return;
    setLocalIsPublic(checked);
    onMapPropertiesChange({
      name: localMapName,
      isPublic: checked,
      sharedWithClassroomId: localSharedWithClassroomId,
    });
  };

  const handleSharedIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode) return;
    const newSharedId = e.target.value.trim() || null;
    setLocalSharedWithClassroomId(newSharedId);
    onMapPropertiesChange({
      name: localMapName,
      isPublic: localIsPublic,
      sharedWithClassroomId: newSharedId,
    });
  };

  return (
    <Card className="h-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Properties</CardTitle>
        </div>
        <CardDescription>
          {isViewOnlyMode ? "Viewing map properties." : "Edit map or selected element's properties."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="mapNameInspector" className={cn(isViewOnlyMode && "text-muted-foreground/70")}>Map Name</Label>
          <Input 
            id="mapNameInspector" 
            value={localMapName} 
            onChange={handleNameChange}
            placeholder="Enter map name"
            disabled={isViewOnlyMode}
            readOnly={isViewOnlyMode}
            className={cn(isViewOnlyMode && "cursor-not-allowed")}
          />
        </div>
        <div>
            <div className="flex items-center space-x-2">
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
          <div>
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
        
        <hr className="my-4"/>
        <p className="text-sm text-muted-foreground pt-4 border-t">
          {isViewOnlyMode ? "Element properties are not editable in view-only mode." : "Select an element on the canvas to edit its properties here (placeholder)."}
        </p>
        
      </CardContent>
    </Card>
  );
}

