
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Keep for potential future use (node/edge details)
import { Button } from "@/components/ui/button";
import { Settings2, Check, X } from "lucide-react";
import type { ConceptMap } from "@/types";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface PropertiesInspectorProps {
  currentMap: ConceptMap | null;
  onMapPropertiesChange: (properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => void;
  isNewMapMode?: boolean; 
}

export function PropertiesInspector({ currentMap, onMapPropertiesChange, isNewMapMode }: PropertiesInspectorProps) {
  const { toast } = useToast();
  const [mapName, setMapName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sharedWithClassroomId, setSharedWithClassroomId] = useState<string | null>(null);

  // Store initial values to detect changes
  const [initialName, setInitialName] = useState("");
  const [initialIsPublic, setInitialIsPublic] = useState(false);
  const [initialSharedId, setInitialSharedId] = useState<string | null>(null);


  useEffect(() => {
    if (currentMap) {
      setMapName(currentMap.name);
      setIsPublic(currentMap.isPublic);
      setSharedWithClassroomId(currentMap.sharedWithClassroomId || null);

      // Set initial values only when currentMap changes (i.e., map loaded or saved)
      // or if it's identified as new map mode from parent.
      if (isNewMapMode || (currentMap.id && currentMap.id !== 'new')) {
         setInitialName(currentMap.name);
         setInitialIsPublic(currentMap.isPublic);
         setInitialSharedId(currentMap.sharedWithClassroomId || null);
      }

    } else { // New map, not yet saved
      const defaultNewName = "New Concept Map";
      setMapName(defaultNewName); 
      setIsPublic(false);
      setSharedWithClassroomId(null);

      setInitialName(defaultNewName);
      setInitialIsPublic(false);
      setInitialSharedId(null);
    }
  }, [currentMap, isNewMapMode]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMapName(e.target.value);
  };
  
  const handleIsPublicChange = (checked: boolean) => {
    setIsPublic(checked);
  };

  const handleSharedIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSharedWithClassroomId(e.target.value.trim() || null);
  };

  const handleApplyMapSettings = () => {
     if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Map name cannot be empty.", variant: "destructive" });
        setMapName(initialName); // Revert to initial if invalid
        return;
     }
    onMapPropertiesChange({
      name: mapName,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    });
    // Update initial values after changes are applied to the editor's state
    setInitialName(mapName); 
    setInitialIsPublic(isPublic);
    setInitialSharedId(sharedWithClassroomId);
    toast({ title: "Properties Staged", description: "Map properties updated locally. Click 'Save Map' in the toolbar to persist." });
  };

  const handleCancelChanges = () => {
    // Revert local state to the initial state (from last loaded/saved map or new map defaults)
    setMapName(initialName);
    setIsPublic(initialIsPublic);
    setSharedWithClassroomId(initialSharedId);
    // Also inform parent to revert its state if needed, or parent relies on its own state for 'Save Map'
    onMapPropertiesChange({
        name: initialName,
        isPublic: initialIsPublic,
        sharedWithClassroomId: initialSharedId,
    });
    toast({ title: "Changes Discarded", description: "Local property changes have been discarded.", variant: "default" });
  };

  const hasChanges = mapName !== initialName || isPublic !== initialIsPublic || sharedWithClassroomId !== initialSharedId;

  return (
    <Card className="h-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Properties</CardTitle>
        </div>
        <CardDescription>Edit map or selected element's properties.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="mapNameInspector">Map Name</Label>
          <Input 
            id="mapNameInspector" 
            value={mapName} 
            onChange={handleNameChange}
            placeholder="Enter map name"
          />
        </div>
        <div>
            <div className="flex items-center space-x-2">
                <Switch 
                    id="isPublicSwitch" 
                    checked={isPublic} 
                    onCheckedChange={handleIsPublicChange}
                />
                <Label htmlFor="isPublicSwitch">Publicly Visible</Label>
            </div>
        </div>
          <div>
          <Label htmlFor="sharedClassroomId">Share with Classroom ID (Optional)</Label>
          <Input 
            id="sharedClassroomId" 
            value={sharedWithClassroomId || ""} 
            onChange={handleSharedIdChange}
            placeholder="Enter classroom ID or leave blank"
          />
        </div>
        
        {hasChanges && (
            <div className="flex space-x-2 pt-2">
                <Button onClick={handleApplyMapSettings} className="flex-1">
                    <Check className="mr-2 h-4 w-4" /> Apply 
                </Button>
                <Button onClick={handleCancelChanges} variant="outline" className="flex-1">
                    <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
            </div>
        )}
        
        <hr className="my-4"/>
        <p className="text-sm text-muted-foreground pt-4 border-t">Select an element on the canvas to edit its properties here (placeholder).</p>
        
      </CardContent>
    </Card>
  );
}

