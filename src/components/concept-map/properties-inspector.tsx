
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
  // TODO: Add more props for selected node/edge properties editing
}

export function PropertiesInspector({ currentMap, onMapPropertiesChange }: PropertiesInspectorProps) {
  const { toast } = useToast();
  const [mapName, setMapName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [sharedWithClassroomId, setSharedWithClassroomId] = useState<string | null>(null);

  const [initialName, setInitialName] = useState("");
  const [initialIsPublic, setInitialIsPublic] = useState(false);
  const [initialSharedId, setInitialSharedId] = useState<string | null>(null);


  useEffect(() => {
    if (currentMap) {
      setMapName(currentMap.name);
      setIsPublic(currentMap.isPublic);
      setSharedWithClassroomId(currentMap.sharedWithClassroomId || null);

      setInitialName(currentMap.name);
      setInitialIsPublic(currentMap.isPublic);
      setInitialSharedId(currentMap.sharedWithClassroomId || null);

    } else { // New map, not yet saved
      setMapName("New Concept Map"); // Default for new maps
      setIsPublic(false);
      setSharedWithClassroomId(null);

      setInitialName("New Concept Map");
      setInitialIsPublic(false);
      setInitialSharedId(null);
    }
  }, [currentMap]);

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
    setInitialName(mapName); // Update initial values after successful apply
    setInitialIsPublic(isPublic);
    setInitialSharedId(sharedWithClassroomId);
    toast({ title: "Properties Updated", description: "Map properties have been updated in the editor. Save the map to persist changes." });
  };

  const handleCancelChanges = () => {
    setMapName(initialName);
    setIsPublic(initialIsPublic);
    setSharedWithClassroomId(initialSharedId);
    toast({ title: "Changes Reverted", description: "Map properties reverted to last saved state in editor.", variant: "default" });
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
                    <Check className="mr-2 h-4 w-4" /> Apply to Editor
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
