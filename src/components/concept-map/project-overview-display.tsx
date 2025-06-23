// src/components/concept-map/project-overview-display.tsx
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, FileText, Package, Info } from "lucide-react";
import type { GenerateProjectOverviewOutput, KeyModule } from "@/ai/flows/generate-project-overview";
// Button is not used directly in this version for click, Card is clickable
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import useConceptMapStore from '@/stores/concept-map-store'; // Import store

interface ProjectOverviewDisplayProps {
  overviewData: GenerateProjectOverviewOutput | null;
  isLoading: boolean;
  // onModuleClick prop will be removed
}

const ProjectOverviewDisplay: React.FC<ProjectOverviewDisplayProps> = ({
  overviewData,
  isLoading,
}) => {
  const { setFocusOnNodes, mapData, addDebugLog } = useConceptMapStore(s => ({ // Added addDebugLog
    setFocusOnNodes: s.setFocusOnNodes,
    mapData: s.mapData,
    addDebugLog: s.addDebugLog, // Get addDebugLog from store
  }));

  const handleModuleCardClick = (module: KeyModule) => {
    if (!module.filePaths || module.filePaths.length === 0) {
      addDebugLog(`[ProjectOverviewDisplay] Module '${module.name}' clicked, but it has no filePaths.`);
      // No specific nodes to focus on, but still exit overview mode to show the full map.
      setFocusOnNodes([], true);
      return;
    }

    const allNodes = mapData.nodes;
    const moduleFilePathsSet = new Set(module.filePaths.map(fp => fp.trim())); // Trim and use Set for efficiency

    addDebugLog(`[ProjectOverviewDisplay] Module '${module.name}' clicked. File paths to match: [${module.filePaths.join(', ')}]`);

    const matchingNodeIds = allNodes
      .filter(node => {
        // Prioritize node.text as it's commonly used for file paths in file-type nodes.
        // Also check node.data?.filePath as a fallback.
        // Normalize by trimming. Consider more robust path normalization if needed.
        const nodePath1 = typeof node.text === 'string' ? node.text.trim() : null;
        const nodePath2 = typeof node.data?.filePath === 'string' ? node.data.filePath.trim() : null;

        let matched = false;
        if (nodePath1 && moduleFilePathsSet.has(nodePath1)) {
          matched = true;
        } else if (nodePath2 && moduleFilePathsSet.has(nodePath2)) {
          matched = true;
        }
        // For debugging individual node checks:
        // if (nodePath1 || nodePath2) {
        //   addDebugLog(`  Checking node ID ${node.id}, text: '${nodePath1}', data.filePath: '${nodePath2}'. Matched: ${matched}`);
        // }
        return matched;
      })
      .map(node => node.id);

    if (matchingNodeIds.length > 0) {
      addDebugLog(`[ProjectOverviewDisplay] Focusing on ${matchingNodeIds.length} nodes for module '${module.name}'. Node IDs: [${matchingNodeIds.join(', ')}]`);
      setFocusOnNodes(matchingNodeIds, true); // true for isOverviewExit
    } else {
      addDebugLog(`[ProjectOverviewDisplay] No matching nodes found for module '${module.name}'. Looked for paths: [${module.filePaths.join(', ')}]. Exiting overview to full map.`);
      // Fallback: Exit overview mode to show the full map if no specific nodes found.
      setFocusOnNodes([], true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-muted-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg">Generating Project Overview...</p>
        <p className="text-sm">AI is analyzing the project, this may take a moment.</p>
      </div>
    );
  }

  if (overviewData?.error || !overviewData || overviewData.keyModules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-destructive">
        <AlertTriangle className="h-12 w-12 mb-4" />
        <p className="text-lg font-semibold">Could not generate Overview</p>
        <p className="text-sm text-center">
          {overviewData?.error || "The AI was unable to generate a high-level overview for this project at this time."}
          <br />
          Please ensure the project was analyzed successfully, or try again later.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full w-full p-4 md:p-6 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="shadow-lg border-border/60">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <CardTitle className="text-2xl font-bold">Project Summary</CardTitle>
                <CardDescription className="text-sm">A high-level summary of the project.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
              {overviewData.overallSummary}
            </p>
          </CardContent>
        </Card>

        <div className="space-y-1">
            <div className="flex items-center space-x-2 mb-2">
                <Package className="h-7 w-7 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Key Modules / Components</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
                The main functional areas identified by the AI. Click on a module for more details (if available).
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {overviewData.keyModules.map((module) => (
            <Card
              key={module.name}
              className={cn(
                "shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border-border/50",
                "cursor-pointer hover:border-primary/50" // Always clickable style
              )}
              onClick={() => handleModuleCardClick(module)} // Use new handler
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold flex items-center">
                  <Package className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" /> {/* Added Package icon */}
                  {module.name}
                  {module.filePaths && module.filePaths.length > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-xs font-medium">Key Files:</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            {module.filePaths.slice(0,3).map(fp => <li key={fp}>{fp}</li>)}
                            {module.filePaths.length > 3 && <li>...and more</li>}
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-normal">
                  {module.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        {overviewData.overallSummary.includes("(Key modules derived generically due to limited AI output.)") && (
            <p className="text-xs text-center text-muted-foreground italic mt-4">
                Note: The key modules above were derived generically as AI output was limited. A more detailed analysis might yield more specific modules.
            </p>
        )}
      </div>
    </ScrollArea>
  );
};

export default ProjectOverviewDisplay;

[end of src/components/concept-map/project-overview-display.tsx]
