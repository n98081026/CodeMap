// src/app/(app)/examples/page.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { exampleProjects, type ExampleProject } from '@/lib/example-data';
import { useToast } from "@/hooks/use-toast";
import useConceptMapStore from '@/stores/concept-map-store';
import { Compass, Eye, Zap, BookCopy, Code, LayoutList } from 'lucide-react'; // Added more icons

export default function ExamplesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { setLoadedMap, setIsLoading, setError } = useConceptMapStore(
    React.useCallback(s => ({
        setLoadedMap: s.setLoadedMap,
        setIsLoading: s.setIsLoading,
        setError: s.setError,
    }), [])
  );

  const handleLoadExample = async (example: ExampleProject) => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch the pre-generated JSON data for the example map
      // In a real app, mapJsonPath would point to a file in /public or an API endpoint
      // For now, we assume it's in /public and can be fetched.
      // If example.mapJsonPath is '/example-maps/python_simple_game.json',
      // it should resolve to 'public/example-maps/python_simple_game.json'
      const response = await fetch(example.mapJsonPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch example map data: ${response.statusText} (Path: ${example.mapJsonPath})`);
      }
      const mapJsonData = await response.json();

      // Create a mock ConceptMap object to pass to setLoadedMap
      // In a real scenario, this data would be more complete or come from a DB
      const mockConceptMap: ConceptMap = {
        id: `example-${example.key}`, // Create a unique ID for the example session
        name: `${example.name} (Example)`,
        ownerId: 'example-user', // Generic owner for examples
        mapData: mapJsonData, // This is the core data from the JSON file
        isPublic: true, // Examples are typically public
        sharedWithClassroomId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setLoadedMap(mockConceptMap, true); // Load in view-only mode initially

      toast({
        title: "Example Loaded",
        description: `"${example.name}" map has been loaded in view-only mode. You can explore it now. If you want to edit, save it as a new map.`,
        duration: 7000,
      });
      router.push(`/application/concept-maps/editor/example-${example.key}?viewOnly=true`);

    } catch (error) {
      console.error("Error loading example map:", error);
      setError((error as Error).message || "Unknown error loading example.");
      toast({
        title: "Error Loading Example",
        description: (error as Error).message || "Could not load the selected example map.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <DashboardHeader
        title="Example Project Gallery"
        description="Explore pre-analyzed projects to see CodeMap in action and understand different code structures."
        icon={BookCopy}
      />

      {exampleProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
            <Compass className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">No Examples Yet</h2>
            <p className="text-muted-foreground">Check back later for curated examples demonstrating CodeMap's capabilities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {exampleProjects.map((example) => (
            <Card key={example.key} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardHeader>
                {example.imageUrl && (
                  <div className="relative h-40 w-full mb-4 rounded-t-lg overflow-hidden">
                    {/* Placeholder for image - In a real app, use next/image */}
                    <div className="bg-muted w-full h-full flex items-center justify-center">
                       <Code className="h-16 w-16 text-muted-foreground" />
                    </div>
                    {/* <Image src={example.imageUrl} alt={example.name} layout="fill" objectFit="cover" /> */}
                  </div>
                )}
                <CardTitle className="text-xl font-semibold">{example.name}</CardTitle>
                {example.tags && example.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {example.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                <CardDescription>{example.description}</CardDescription>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleLoadExample(example)}>
                  <Eye className="mr-2 h-4 w-4" /> Load & View Example
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

[end of src/app/(app)/examples/page.tsx]
