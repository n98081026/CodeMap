
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Settings2, Check, X } from "lucide-react";
import type { ConceptMap } from "@/types";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch"; // For isPublic toggle

interface PropertiesInspectorProps {
  currentMap: ConceptMap | null;
  onMapNameChange: (newName: string) => void;
  // TODO: Add more props for selected node/edge properties editing
}

export function PropertiesInspector({ currentMap, onMapNameChange }: PropertiesInspectorProps) {
  const [mapName, setMapName] = useState(currentMap?.name || "");
  const [isPublic, setIsPublic] = useState(currentMap?.isPublic || false);
  const [sharedWithClassroomId, setSharedWithClassroomId] = useState(currentMap?.sharedWithClassroomId || "");

  useEffect(() => {
    setMapName(currentMap?.name || "New Concept Map");
    setIsPublic(currentMap?.isPublic || false);
    setSharedWithClassroomId(currentMap?.sharedWithClassroomId || "");
  }, [currentMap]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMapName(e.target.value);
  };

  const handleApplyMapName = () => {
    onMapNameChange(mapName);
    // In a real app, this might also trigger a save or update to the parent component's state that then saves
  };

  // Placeholder: In a real app, this would be more complex, likely involving a save operation.
  const handleApplyMapSettings = () => {
     if (currentMap) {
        // This function should ideally trigger an update API call via the parent editor page.
        // For now, it updates parent state which then gets saved by the main save button.
        onMapNameChange(mapName); 
        // To update isPublic and sharedWithClassroomId, the parent (editor page)
        // would need functions to update `currentMap` state, which then gets saved.
        // e.g., onMapSettingsChange({ name: mapName, isPublic, sharedWithClassroomId })
        console.log("Applying map settings (mock):", { name: mapName, isPublic, sharedWithClassroomId });
     }
  };

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
        {currentMap || mapName === "New Concept Map" ? (
          <>
            <div>
              <Label htmlFor="mapNameInspector">Map Name</Label>
              <div className="flex items-center gap-2">
                <Input 
                  id="mapNameInspector" 
                  value={mapName} 
                  onChange={handleNameChange}
                  placeholder="Enter map name"
                />
                {/* Apply button could be here, or rely on main save */}
              </div>
            </div>
            <div>
                <div className="flex items-center space-x-2">
                    <Switch 
                        id="isPublicSwitch" 
                        checked={isPublic} 
                        onCheckedChange={setIsPublic}
                        disabled={!currentMap} // Disable if no map loaded or new map not yet saved
                    />
                    <Label htmlFor="isPublicSwitch">Publicly Visible</Label>
                </div>
            </div>
             <div>
              <Label htmlFor="sharedClassroomId">Share with Classroom ID (Optional)</Label>
              <Input 
                id="sharedClassroomId" 
                value={sharedWithClassroomId || ""} 
                onChange={(e) => setSharedWithClassroomId(e.target.value)}
                placeholder="Enter classroom ID"
                disabled={!currentMap}
              />
            </div>
            <Button onClick={handleApplyMapSettings} className="w-full" disabled={!currentMap && mapName !== "New Concept Map"}>
                Apply Map Settings
            </Button>
            <hr className="my-4"/>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Load or create a map to see its properties.</p>
        )}
        
        <p className="text-sm text-muted-foreground pt-4 border-t">Select an element on the canvas to edit its properties here (placeholder).</p>
        
        {/* Example fields for a selected node (conditionally render this) */}
        {false && ( 
          <>
            <div>
              <Label htmlFor="nodeText">Node Text</Label>
              <Input id="nodeText" defaultValue="Sample Node" />
            </div>
            <div>
              <Label htmlFor="nodeType">Node Type</Label>
              <Input id="nodeType" defaultValue="Generic" />
            </div>
            <div>
              <Label htmlFor="nodeDetails">Node Details</Label>
              <Textarea id="nodeDetails" placeholder="Additional details..." />
            </div>
            <Button className="w-full" disabled>Apply Node Changes</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
