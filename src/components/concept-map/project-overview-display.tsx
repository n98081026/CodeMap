// src/components/concept-map/project-overview-display.tsx
'use client';

import { Loader2, AlertTriangle, FileText, Package, Info } from 'lucide-react';
import React, { useEffect, useState, useRef, useCallback } from 'react';

import type {
  GenerateProjectOverviewOutput,
  KeyModule,
  ModuleConnection,
} from '@/ai/flows/generate-project-overview';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils'; // Import cn for conditional classNames
import useConceptMapStore from '@/stores/concept-map-store';

interface ProjectOverviewDisplayProps {
  overviewData: GenerateProjectOverviewOutput | null;
  isLoading: boolean;
}

interface LineData {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
}

const ProjectOverviewDisplay: React.FC<ProjectOverviewDisplayProps> = ({
  overviewData,
  isLoading,
}) => {
  const { setFocusOnNodes, mapData, addDebugLog } = useConceptMapStore((s) => ({
    setFocusOnNodes: s.setFocusOnNodes,
    mapData: s.mapData,
    addDebugLog: s.addDebugLog,
  }));

  const [lines, setLines] = useState<LineData[]>([]);
  const moduleCardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const svgContainerRef = useRef<HTMLDivElement | null>(null); // Ref for the common parent of grid and SVG

  useEffect(() => {
    moduleCardRefs.current = moduleCardRefs.current.slice(
      0,
      overviewData?.keyModules?.length || 0
    );
  }, [overviewData?.keyModules]);

  useEffect(() => {
    if (
      isLoading ||
      !overviewData ||
      !overviewData.keyModules ||
      !overviewData.moduleConnections ||
      !svgContainerRef.current
    ) {
      setLines([]);
      return;
    }

    const calculateLines = () => {
      if (!svgContainerRef.current) return;
      const svgContainerRect = svgContainerRef.current.getBoundingClientRect();
      const newLines: LineData[] = [];

      overviewData.moduleConnections?.forEach((conn, index) => {
        const sourceModuleIndex = overviewData.keyModules.findIndex(
          (m) => m.name === conn.sourceModule
        );
        const targetModuleIndex = overviewData.keyModules.findIndex(
          (m) => m.name === conn.targetModule
        );

        const sourceCardEl = moduleCardRefs.current[sourceModuleIndex];
        const targetCardEl = moduleCardRefs.current[targetModuleIndex];

        if (sourceCardEl && targetCardEl) {
          const sourceRect = sourceCardEl.getBoundingClientRect();
          const targetRect = targetCardEl.getBoundingClientRect();

          // Calculate centers relative to the svgContainerRect
          const x1 =
            sourceRect.left + sourceRect.width / 2 - svgContainerRect.left;
          const y1 =
            sourceRect.top + sourceRect.height / 2 - svgContainerRect.top;
          const x2 =
            targetRect.left + targetRect.width / 2 - svgContainerRect.left;
          const y2 =
            targetRect.top + targetRect.height / 2 - svgContainerRect.top;

          newLines.push({
            id: `conn-${index}-${conn.sourceModule}-${conn.targetModule}`,
            x1,
            y1,
            x2,
            y2,
            label: conn.relationshipDescription,
          });
        }
      });
      setLines(newLines);
    };

    // Initial calculation
    calculateLines();

    // Recalculate on resize
    // A more optimized version would debounce this
    const handleResize = () => calculateLines();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [overviewData, isLoading]);

  const handleModuleCardClick = (module: KeyModule) => {
    // ... (existing click handler logic remains the same) ...
    if (!module.filePaths || module.filePaths.length === 0) {
      addDebugLog(
        `[ProjectOverviewDisplay] Module '${module.name}' clicked, but it has no filePaths.`
      );
      setFocusOnNodes([], true);
      return;
    }
    const allNodes = mapData.nodes;
    const moduleFilePathsSet = new Set(module.filePaths.map((fp) => fp.trim()));
    addDebugLog(
      `[ProjectOverviewDisplay] Module '${module.name}' clicked. File paths to match: [${module.filePaths.join(', ')}]`
    );
    const matchingNodeIds = allNodes
      .filter((node) => {
        const nodePath1 =
          typeof node.text === 'string' ? node.text.trim() : null;
        const nodePath2 =
          typeof node.data?.filePath === 'string'
            ? node.data.filePath.trim()
            : null;
        return (
          (nodePath1 && moduleFilePathsSet.has(nodePath1)) ||
          (nodePath2 && moduleFilePathsSet.has(nodePath2))
        );
      })
      .map((node) => node.id);
    if (matchingNodeIds.length > 0) {
      addDebugLog(
        `[ProjectOverviewDisplay] Focusing on ${matchingNodeIds.length} nodes for module '${module.name}'. Node IDs: [${matchingNodeIds.join(', ')}]`
      );
      setFocusOnNodes(matchingNodeIds, true);
    } else {
      addDebugLog(
        `[ProjectOverviewDisplay] No matching nodes found for module '${module.name}'. Looked for paths: [${module.filePaths.join(', ')}]. Exiting overview to full map.`
      );
      setFocusOnNodes([], true);
    }
  };

  if (isLoading) {
    return (
      <div className='flex flex-col items-center justify-center h-full py-20'>
        <Loader2 className='h-10 w-10 animate-spin text-muted-foreground mb-4' />
        <span className='text-lg text-muted-foreground'>
          Loading project overview...
        </span>
      </div>
    );
  }
  if (
    overviewData?.error ||
    !overviewData ||
    overviewData.keyModules.length === 0
  ) {
    return (
      <div className='flex flex-col items-center justify-center h-full py-20'>
        <AlertTriangle className='h-10 w-10 text-destructive mb-4' />
        <span className='text-lg text-destructive'>
          {overviewData?.error
            ? overviewData.error
            : 'No overview data available for this project.'}
        </span>
      </div>
    );
  }

  return (
    <ScrollArea
      className='h-full w-full p-4 md:p-6 bg-background'
      data-tutorial-id='project-overview-display-container' // Added tutorial ID
    >
      <div className='max-w-4xl mx-auto space-y-6'>
        <Card className='shadow-lg border-border/60'>
          {/* ... existing Project Summary Card ... */}
          <CardHeader>
            <div className='flex items-center space-x-3'>
              <FileText className='h-8 w-8 text-primary' />
              <div>
                <CardTitle className='text-2xl font-bold'>
                  Project Summary
                </CardTitle>
                <CardDescription className='text-sm'>
                  A high-level summary of the project.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-base text-foreground leading-relaxed whitespace-pre-wrap'>
              {overviewData.overallSummary}
            </p>
          </CardContent>
        </Card>

        <div className='space-y-1'>
          {/* ... existing Key Modules header ... */}
          <div className='flex items-center space-x-2 mb-2'>
            <Package className='h-7 w-7 text-primary' />
            <h2 className='text-xl font-semibold text-foreground'>
              Key Modules / Components
            </h2>
          </div>
          <p className='text-sm text-muted-foreground mb-4'>
            The main functional areas identified by the AI. Click on a module
            for more details (if available). Connections are illustrative.
          </p>
        </div>

        {/* New container for relative positioning of SVG overlay */}
        <div ref={svgContainerRef} className='relative'>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8'>
            {' '}
            {/* Increased gap slightly */}
            {overviewData.keyModules.map((module, index) => (
              <Card
                key={module.name}
                ref={(el) => {
                  if (moduleCardRefs.current)
                    moduleCardRefs.current[index] = el;
                }}
                className={cn(
                  'shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out border-border/50',
                  'cursor-pointer hover:border-primary/50 flex flex-col' // Added flex flex-col for consistent height if content varies
                )}
                onClick={() => handleModuleCardClick(module)}
                style={{ minHeight: '180px' }} // Ensure cards have some min height for line calculations
              >
                <CardHeader className='pb-3'>
                  <CardTitle className='text-lg font-semibold flex items-center'>
                    <Package className='mr-2 h-5 w-5 text-muted-foreground flex-shrink-0' />
                    {module.name}
                    {module.filePaths && module.filePaths.length > 0 && (
                      <TooltipProvider>
                        {' '}
                        <Tooltip>
                          {' '}
                          <TooltipTrigger asChild>
                            <Info className='h-4 w-4 ml-2 text-muted-foreground cursor-help' />
                          </TooltipTrigger>{' '}
                          <TooltipContent side='top' className='max-w-xs'>
                            <p className='text-xs font-medium'>Key Files:</p>
                            <ul className='list-disc list-inside text-xs text-muted-foreground'>
                              {module.filePaths.slice(0, 3).map((fp) => (
                                <li key={fp}>{fp}</li>
                              ))}
                              {module.filePaths.length > 3 && (
                                <li>...and more</li>
                              )}
                            </ul>
                          </TooltipContent>{' '}
                        </Tooltip>{' '}
                      </TooltipProvider>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className='flex-grow'>
                  {' '}
                  {/* flex-grow for description area */}
                  <p className='text-sm text-muted-foreground leading-normal mb-2'>
                    {module.description}
                  </p>
                  {/* Textual connections remain for accessibility and detail */}
                  {overviewData.moduleConnections &&
                    overviewData.moduleConnections.length > 0 && (
                      <>
                        {overviewData.moduleConnections.filter(
                          (conn) => conn.sourceModule === module.name
                        ).length > 0 && (
                          <div className='mt-2 pt-2 border-t border-border/30'>
                            <h4 className='text-xs font-semibold text-muted-foreground mb-1'>
                              Connects to:
                            </h4>
                            <ul className='list-none space-y-0.5 pl-1'>
                              {overviewData.moduleConnections
                                .filter(
                                  (conn) => conn.sourceModule === module.name
                                )
                                .map((conn) => (
                                  <li
                                    key={`${conn.sourceModule}-to-${conn.targetModule}`}
                                    className='text-xs text-muted-foreground/80'
                                  >
                                    &rarr; {conn.targetModule}
                                    {conn.relationshipDescription && (
                                      <span className='italic text-muted-foreground/70'>
                                        {' '}
                                        ({conn.relationshipDescription})
                                      </span>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                        {overviewData.moduleConnections.filter(
                          (conn) => conn.targetModule === module.name
                        ).length > 0 && (
                          <div className='mt-2 pt-2 border-t border-border/30'>
                            <h4 className='text-xs font-semibold text-muted-foreground mb-1'>
                              Connected from:
                            </h4>
                            <ul className='list-none space-y-0.5 pl-1'>
                              {overviewData.moduleConnections
                                .filter(
                                  (conn) => conn.targetModule === module.name
                                )
                                .map((conn) => (
                                  <li
                                    key={`${conn.sourceModule}-from-${conn.targetModule}`}
                                    className='text-xs text-muted-foreground/80'
                                  >
                                    &larr; {conn.sourceModule}
                                    {conn.relationshipDescription && (
                                      <span className='italic text-muted-foreground/70'>
                                        {' '}
                                        ({conn.relationshipDescription})
                                      </span>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          </div>
                        )}
                      </>
                    )}
                </CardContent>
              </Card>
            ))}
          </div>
          {/* SVG Overlay for lines */}
          {lines.length > 0 && (
            <svg
              className='absolute top-0 left-0 w-full h-full pointer-events-none'
              style={{ zIndex: -1 }} // Draw behind cards, or adjust card z-index
            >
              <defs>
                <marker
                  id='arrowhead'
                  markerWidth='10'
                  markerHeight='7'
                  refX='0'
                  refY='3.5'
                  orient='auto'
                >
                  <polygon
                    points='0 0, 10 3.5, 0 7'
                    className='fill-current text-muted-foreground/70'
                  />
                </marker>
              </defs>
              {lines.map((line) => (
                <g key={line.id}>
                  <line
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    className='stroke-current text-muted-foreground/70'
                    strokeWidth='1.5'
                    markerEnd='url(#arrowhead)'
                  />
                  {line.label && (
                    <text
                      x={(line.x1 + line.x2) / 2}
                      y={(line.y1 + line.y2) / 2 - 5} // Offset text above line
                      textAnchor='middle'
                      className='text-xs fill-current text-muted-foreground'
                      style={{ pointerEvents: 'none' }}
                    >
                      {line.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          )}
        </div>

        {overviewData.overallSummary.includes(
          '(Key modules derived generically due to limited AI output.)'
        ) && (
          <p className='text-xs text-center text-muted-foreground italic mt-4'>
            Note: The key modules above were derived generically as AI output
            was limited. A more detailed analysis might yield more specific
            modules.
          </p>
        )}
      </div>
    </ScrollArea>
  );
};

export default ProjectOverviewDisplay;
