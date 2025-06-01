"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";

export function PropertiesInspector() {
  return (
    <Card className="h-full shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Properties</CardTitle>
        </div>
        <CardDescription>Edit selected element's properties.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Select an element on the canvas to edit its properties here.</p>
        
        {/* Example fields for a selected node (conditionally render this) */}
        {false && ( // Set to true to see example layout
          <>
            <div>
              <Label htmlFor="nodeText">Text</Label>
              <Input id="nodeText" defaultValue="Sample Node" />
            </div>
            <div>
              <Label htmlFor="nodeType">Type</Label>
              <Input id="nodeType" defaultValue="Generic" />
            </div>
            <div>
              <Label htmlFor="nodeDetails">Details</Label>
              <Textarea id="nodeDetails" placeholder="Additional details..." />
            </div>
            <Button className="w-full" disabled>Apply Changes</Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
