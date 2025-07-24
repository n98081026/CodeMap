'use client';

import {
  Settings2,
  Box,
  Waypoints,
  Palette,
  CircleDot,
  Eraser,
  Minus,
  ArrowBigLeft,
  ArrowBigRight,
  Ruler,
  Brain,
  Sparkles,
  GitMerge,
  Info,
  HelpCircle,
  MessageSquareQuote,
  Lightbulb,
  MessageCircleQuestion,
  Loader2 as LoaderIcon,
  AlertTriangle as AlertTriangleIcon,
  Send,
} from 'lucide-react';
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as z from 'zod';

import AICommandPalette, { type AICommand } from './ai-command-palette';

import type { ConceptMap, ConceptMapNode, ConceptMapEdge } from '@/types';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
// import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';

interface PropertiesInspectorProps {
  currentMap: ConceptMap | null;
  onMapPropertiesChange: (properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => void;

  selectedElement?: ConceptMapNode | ConceptMapEdge | null;
  selectedElementType?: 'node' | 'edge' | null;
  onSelectedElementPropertyUpdate?: (
    updates: Partial<ConceptMapNode> | Partial<ConceptMapEdge>
  ) => void;
  onSuggestIntermediateNode?: (edgeId: string) => void;

  isNewMapMode?: boolean;
  isViewOnlyMode?: boolean;
  editingNodeId?: string | null;
  aiTools?: {
    openExpandConceptModal: (nodeId: string) => void;
    openRewriteNodeContentModal: (nodeId: string) => void;
    openAskQuestionAboutNodeModal?: (nodeId: string) => void; // Already exists for node Q&A
    openAskQuestionAboutEdgeModal?: (edgeId: string) => void; // For edge Q&A
  };
}

export const PropertiesInspector = React.memo(function PropertiesInspector({
  currentMap,
  onMapPropertiesChange,
  selectedElement,
  selectedElementType,
  onSelectedElementPropertyUpdate,
  onSuggestIntermediateNode, // Destructure new prop
  isNewMapMode,
  isViewOnlyMode,
  editingNodeId,
  aiTools, // Destructure aiTools
}: PropertiesInspectorProps) {
  const nodeLabelInputRef = useRef<HTMLInputElement>(null); // Ref for node label input
  const textareaDetailsRef = useRef<HTMLTextAreaElement>(null);
  const nodeDetailsTextareaRef = useRef<HTMLTextAreaElement>(null);

  // const aiToolsHook = useConceptMapAITools(!!isViewOnlyMode);
  const { toast } = useToast();

  // AI Command Palette states (merge both approaches)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [paletteTargetRect, setPaletteTargetRect] = useState<DOMRect | null>(
    null
  );
  const [commandFilterText, setCommandFilterText] = useState('');
  const [showPalette, setShowPalette] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteTargetRef, setPaletteTargetRef] = useState<React.RefObject<
    HTMLInputElement | HTMLTextAreaElement
  > | null>(null);
  const [activeCommandField, setActiveCommandField] = useState<
    'label' | 'details' | null
  >(null);

  // Node Q&A states
  const [nodeQuestion, setNodeQuestion] = useState('');
  const [aiNodeAnswer, setAiNodeAnswer] = useState<string | null>(null);
  const [isAskingNodeQuestion, setIsAskingNodeQuestion] = useState(false);
  const [askNodeQuestionError, setAskNodeQuestionError] = useState<
    string | null
  >(null);

  // Loading state for AI suggest intermediate node
  const [
    isLoadingAISuggestIntermediateNode,
    setIsLoadingAISuggestIntermediateNode,
  ] = useState(false); // New loading state for the button

  // Define AI Commands (merge both approaches)
  const availableAiCommands: AICommand[] = React.useMemo(() => {
    const commands: AICommand[] = [];
    if (selectedElementType === 'node' && selectedElement?.id && aiTools) {
      const nodeId = selectedElement.id;
      if (aiTools.openExpandConceptModal) {
        commands.push({
          id: 'expand-node',
          label: 'Expand Node',
          description: 'Generate child concepts for this node.',
          icon: Brain,
          action: () => aiTools.openExpandConceptModal(nodeId),
        });
      }
      if (aiTools.openRewriteNodeContentModal) {
        commands.push({
          id: 'rewrite-content',
          label: 'Rewrite Content',
          description: `Refine this node's ${activeCommandField || 'content'}.`,
          icon: Sparkles,
          action: () => aiTools.openRewriteNodeContentModal(nodeId),
        });
      }
    }
    // Add more commands as needed
    return commands;
  }, [selectedElement?.id, selectedElementType, aiTools, activeCommandField]);

  useEffect(() => {
    if (
      !isViewOnlyMode &&
      selectedElementType === 'node' &&
      selectedElement &&
      editingNodeId &&
      selectedElement.id === editingNodeId &&
      nodeLabelInputRef.current
    ) {
      const timer = setTimeout(() => {
        nodeLabelInputRef.current?.focus();
        nodeLabelInputRef.current?.select();
      }, 50); // Small delay for DOM readiness
      return () => clearTimeout(timer);
    }
  }, [selectedElement, selectedElementType, editingNodeId, isViewOnlyMode]);

  const mapNameValue = currentMap?.name || '';
  const isPublicValue = currentMap?.isPublic || false;
  const sharedWithClassroomIdValue = currentMap?.sharedWithClassroomId || null;

  const elementLabelValue = selectedElement
    ? (selectedElementType === 'node'
        ? (selectedElement as ConceptMapNode).text
        : (selectedElement as ConceptMapEdge).label) || ''
    : '';
  const elementDetailsValue =
    (selectedElementType === 'node'
      ? (selectedElement as ConceptMapNode)?.details
      : '') || '';
  const elementNodeTypeValue =
    (selectedElementType === 'node'
      ? (selectedElement as ConceptMapNode)?.type
      : '') || 'default';

  const nodeBackgroundColorValue =
    selectedElementType === 'node'
      ? (selectedElement as ConceptMapNode)?.backgroundColor
      : undefined;
  const nodeShapeValue =
    (selectedElementType === 'node'
      ? (selectedElement as ConceptMapNode)?.shape
      : 'rectangle') || 'rectangle';
  const nodeWidthValue =
    selectedElementType === 'node'
      ? (selectedElement as ConceptMapNode)?.width
      : undefined;
  const nodeHeightValue =
    selectedElementType === 'node'
      ? (selectedElement as ConceptMapNode)?.height
      : undefined;

  const edgeColorValue =
    selectedElementType === 'edge'
      ? (selectedElement as ConceptMapEdge)?.color
      : undefined;
  const edgeLineTypeValue =
    (selectedElementType === 'edge'
      ? (selectedElement as ConceptMapEdge)?.lineType
      : 'solid') || 'solid';
  const edgeMarkerStartValue =
    (selectedElementType === 'edge'
      ? (selectedElement as ConceptMapEdge)?.markerStart
      : 'none') || 'none';
  const edgeMarkerEndValue =
    (selectedElementType === 'edge'
      ? (selectedElement as ConceptMapEdge)?.markerEnd
      : 'arrowclosed') || 'arrowclosed';

  const handleMapNameChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isViewOnlyMode || !currentMap) return;
      onMapPropertiesChange({
        name: e.target.value,
        isPublic: isPublicValue,
        sharedWithClassroomId: sharedWithClassroomIdValue,
      });
    },
    [
      isViewOnlyMode,
      currentMap,
      onMapPropertiesChange,
      isPublicValue,
      sharedWithClassroomIdValue,
    ]
  );

  const handleIsPublicChange = React.useCallback(
    (checked: boolean) => {
      if (isViewOnlyMode || !currentMap) return;
      onMapPropertiesChange({
        name: mapNameValue,
        isPublic: checked,
        sharedWithClassroomId: sharedWithClassroomIdValue,
      });
    },
    [
      isViewOnlyMode,
      currentMap,
      onMapPropertiesChange,
      mapNameValue,
      sharedWithClassroomIdValue,
    ]
  );

  const handleSharedIdChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isViewOnlyMode || !currentMap) return;
      onMapPropertiesChange({
        name: mapNameValue,
        isPublic: isPublicValue,
        sharedWithClassroomId: e.target.value.trim() || null,
      });
    },
    [
      isViewOnlyMode,
      currentMap,
      onMapPropertiesChange,
      mapNameValue,
      isPublicValue,
    ]
  );

  const handleInputChangeForPalette = useCallback(
    (
      value: string,
      field: 'label' | 'details',
      ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      if (
        isViewOnlyMode ||
        !onSelectedElementPropertyUpdate ||
        !selectedElement
      )
        return;

      // Update the actual property in the store first
      if (field === 'label') {
        if (selectedElementType === 'node')
          onSelectedElementPropertyUpdate({ text: value });
        else if (selectedElementType === 'edge')
          onSelectedElementPropertyUpdate({ label: value });
      } else if (field === 'details' && selectedElementType === 'node') {
        onSelectedElementPropertyUpdate({ details: value });
      }

      const commandPrefix = '/ai';
      // Check if "/ai" is present and is the last typed part of a word or followed by a space
      const commandRegex = /\/ai(?:\s|$)/i; // /ai followed by space or end of string
      const match = commandRegex.exec(value);
      const commandIndex = match ? match.index : -1;

      if (commandIndex !== -1) {
        const textAfterCommand = value.substring(
          commandIndex + commandPrefix.length
        );
        // Only show palette if there's a space after /ai or it's just /ai
        if (
          value.charAt(commandIndex + commandPrefix.length) === ' ' ||
          value.substring(commandIndex) === commandPrefix
        ) {
          const query = textAfterCommand.trimStart();
          setPaletteQuery(query);
          setShowPalette(true);
          setPaletteTargetRef(ref);
          setActiveCommandField(field);
        } else {
          setShowPalette(false);
        }
      } else {
        setShowPalette(false);
      }
    },
    [
      isViewOnlyMode,
      onSelectedElementPropertyUpdate,
      selectedElement,
      selectedElementType,
      setPaletteQuery,
      setShowPalette,
      setPaletteTargetRef,
      setActiveCommandField,
    ]
  );

  const handleElementLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleInputChangeForPalette(e.target.value, 'label', nodeLabelInputRef);
    },
    [handleInputChangeForPalette]
  );

  const handleElementDetailsChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChangeForPalette(
        e.target.value,
        'details',
        nodeDetailsTextareaRef
      );
    },
    [handleInputChangeForPalette]
  );

  const _handlePaletteSelectCommand = useCallback(
    (command: AICommand) => {
      setShowPalette(false);
      if (
        paletteTargetRef?.current &&
        activeCommandField &&
        onSelectedElementPropertyUpdate
      ) {
        const currentValue = paletteTargetRef.current.value;
        const aiCommandIndex = currentValue.toLowerCase().lastIndexOf('/ai');
        let cleanedValue = currentValue;
        if (aiCommandIndex !== -1) {
          cleanedValue = currentValue.substring(0, aiCommandIndex).trimEnd();
        }

        if (activeCommandField === 'label') {
          if (selectedElementType === 'node')
            onSelectedElementPropertyUpdate({ text: cleanedValue });
          else if (selectedElementType === 'edge')
            onSelectedElementPropertyUpdate({ label: cleanedValue });
        } else if (
          activeCommandField === 'details' &&
          selectedElementType === 'node'
        ) {
          onSelectedElementPropertyUpdate({ details: cleanedValue });
        }

        // command.action(); // This will be called with more context later
        // For now, the availableAiCommands already have console.log with selectedElement.id
        const commandToExecute = availableAiCommands.find(
          (c) => c.id === command.id
        );
        commandToExecute?.action();
      }
    },
    [
      paletteTargetRef,
      activeCommandField,
      onSelectedElementPropertyUpdate,
      selectedElementType,
      availableAiCommands,
    ]
  );

  const _handlePaletteClose = useCallback(() => {
    setShowPalette(false);
  }, []);

  const handleNodeBackgroundColorChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (
        isViewOnlyMode ||
        !onSelectedElementPropertyUpdate ||
        selectedElementType !== 'node' ||
        !selectedElement
      )
        return;
      onSelectedElementPropertyUpdate({ backgroundColor: e.target.value });
    },
    [
      isViewOnlyMode,
      onSelectedElementPropertyUpdate,
      selectedElementType,
      selectedElement,
    ]
  );

  const clearNodeBackgroundColor = React.useCallback(() => {
    if (
      isViewOnlyMode ||
      !onSelectedElementPropertyUpdate ||
      selectedElementType !== 'node' ||
      !selectedElement
    )
      return;
    onSelectedElementPropertyUpdate({ backgroundColor: undefined });
  }, [
    isViewOnlyMode,
    onSelectedElementPropertyUpdate,
    selectedElementType,
    selectedElement,
  ]);

  const handleNodeShapeChange = React.useCallback(
    (value: 'rectangle' | 'ellipse') => {
      if (
        isViewOnlyMode ||
        !onSelectedElementPropertyUpdate ||
        selectedElementType !== 'node' ||
        !selectedElement
      )
        return;
      onSelectedElementPropertyUpdate({ shape: value });
    },
    [
      isViewOnlyMode,
      onSelectedElementPropertyUpdate,
      selectedElementType,
      selectedElement,
    ]
  );

  const handleNodeDimensionChange = React.useCallback(
    (dimension: 'width' | 'height', value: string) => {
      if (
        isViewOnlyMode ||
        !onSelectedElementPropertyUpdate ||
        selectedElementType !== 'node' ||
        !selectedElement
      )
        return;
      const numValue = parseInt(value, 10);
      const updateValue =
        !isNaN(numValue) && numValue > 0 ? numValue : undefined;
      onSelectedElementPropertyUpdate({ [dimension]: updateValue });
    },
    [
      isViewOnlyMode,
      onSelectedElementPropertyUpdate,
      selectedElementType,
      selectedElement,
    ]
  );

  const handleClearNodeDimensions = React.useCallback(() => {
    if (
      isViewOnlyMode ||
      !onSelectedElementPropertyUpdate ||
      selectedElementType !== 'node' ||
      !selectedElement
    )
      return;
    onSelectedElementPropertyUpdate({ width: undefined, height: undefined });
  }, [
    isViewOnlyMode,
    onSelectedElementPropertyUpdate,
    selectedElementType,
    selectedElement,
  ]);

  const handleEdgeColorChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (
        isViewOnlyMode ||
        !onSelectedElementPropertyUpdate ||
        selectedElementType !== 'edge' ||
        !selectedElement
      )
        return;
      onSelectedElementPropertyUpdate({ color: e.target.value });
    },
    [
      isViewOnlyMode,
      onSelectedElementPropertyUpdate,
      selectedElementType,
      selectedElement,
    ]
  );

  const clearEdgeColor = React.useCallback(() => {
    if (
      isViewOnlyMode ||
      !onSelectedElementPropertyUpdate ||
      selectedElementType !== 'edge' ||
      !selectedElement
    )
      return;
    onSelectedElementPropertyUpdate({ color: undefined });
  }, [
    isViewOnlyMode,
    onSelectedElementPropertyUpdate,
    selectedElementType,
    selectedElement,
  ]);

  const handleEdgeLineTypeChange = React.useCallback(
    (value: 'solid' | 'dashed') => {
      if (
        isViewOnlyMode ||
        !onSelectedElementPropertyUpdate ||
        selectedElementType !== 'edge' ||
        !selectedElement
      )
        return;
      onSelectedElementPropertyUpdate({ lineType: value });
    },
    [
      isViewOnlyMode,
      onSelectedElementPropertyUpdate,
      selectedElementType,
      selectedElement,
    ]
  );

  const handleEdgeMarkerChange = React.useCallback(
    (markerEnd: 'start' | 'end', value: string) => {
      if (
        isViewOnlyMode ||
        !onSelectedElementPropertyUpdate ||
        selectedElementType !== 'edge' ||
        !selectedElement
      )
        return;
      if (markerEnd === 'start')
        onSelectedElementPropertyUpdate({ markerStart: value });
      else onSelectedElementPropertyUpdate({ markerEnd: value });
    },
    [
      isViewOnlyMode,
      onSelectedElementPropertyUpdate,
      selectedElementType,
      selectedElement,
    ]
  );

  const aiCommands = useMemo<AICommand[]>(() => {
    if (!selectedElement || selectedElementType !== 'node') return [];
    const nodeId = selectedElement.id;
    // const nodeText = (selectedElement as ConceptMapNode).text;
    // const nodeDetails = (selectedElement as ConceptMapNode).details || "";

    return [
      // {
      //   id: 'expand',
      //   label: 'Expand Node',
      //   icon: Sparkles,
      //   description: 'Generate related ideas',
      //   action: () => aiToolsHook.openExpandConceptModal(nodeId),
      // },
      // {
      //   id: 'rewrite',
      //   label: 'Rewrite Content',
      //   icon: MessageSquareQuote,
      //   description: 'Refine text using AI',
      //   action: () => aiToolsHook.openRewriteNodeContentModal(nodeId),
      // },
      // {
      //   id: 'ask',
      //   label: 'Ask Question',
      //   icon: HelpCircle,
      //   description: 'Get insights about this node',
      //   action: () => aiToolsHook.openAskQuestionModal(nodeId),
      // },
      // {
      //   id: 'extract',
      //   label: 'Extract Concepts',
      //   icon: Brain,
      //   description: 'Identify key concepts from details',
      //   action: () => aiToolsHook.openExtractConceptsModal(nodeId),
      // },
      // Add more commands as needed
    ];
  }, [aiToolsHook, selectedElement, selectedElementType]);

  const originalHandleElementDetailsChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (
        isViewOnlyMode ||
        !onSelectedElementPropertyUpdate ||
        selectedElementType !== 'node' ||
        !selectedElement
      )
        return;
      onSelectedElementPropertyUpdate({ details: e.target.value });
    },
    [
      isViewOnlyMode,
      onSelectedElementPropertyUpdate,
      selectedElementType,
      selectedElement,
    ]
  );

  const handleElementDetailsChangeWithPalette = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      originalHandleElementDetailsChange(e); // Call original handler first

      const value = e.target.value;
      const lastSlashAiIndex = value.lastIndexOf('/ai');

      if (lastSlashAiIndex !== -1) {
        const textAfterSlashAi = value.substring(lastSlashAiIndex + 3); // +3 for "/ai"
        setCommandFilterText(textAfterSlashAi.trimStart()); // Trim only start for active filtering

        if (textareaDetailsRef.current) {
          // Attempt to get caret position to position palette
          const textarea = textareaDetailsRef.current;
          const selectionStart = textarea.selectionStart;

          // This is a simplified way to get rect; more complex calculations might be needed for precise caret position
          // For now, using the textarea's bounding rect. A library might be better for exact caret.
          const rect = textarea.getBoundingClientRect();
          // Create a mock rect at the bottom of the textarea for now
          // A more precise solution would involve calculating caret position within the textarea
          const dummyRect = {
            bottom: rect.bottom,
            left: rect.left, // + (charWidth * (selectionStart % textarea.cols)), // simplistic
            top: rect.top,
            right: rect.right,
            width: 1, // Minimal width
            height:
              parseFloat(window.getComputedStyle(textarea).lineHeight) || 16, // Approximate line height
            x: rect.left,
            y: rect.top,
            toJSON: () => dummyRect, // Ensure toJSON is present if DOMRect is strictly expected
          } as DOMRect;
          setPaletteTargetRect(dummyRect);
        }
        setIsPaletteOpen(true);
      } else {
        setIsPaletteOpen(false);
        setCommandFilterText('');
      }
    },
    [originalHandleElementDetailsChange]
  );

  const handleSelectCommand = useCallback(
    (command: AICommand) => {
      command.action();

      // Clear the "/ai <filter>" text from the Textarea
      if (textareaDetailsRef.current) {
        const currentValue = textareaDetailsRef.current.value;
        const lastSlashAiIndex = currentValue.lastIndexOf('/ai');
        if (lastSlashAiIndex !== -1) {
          const newValue = currentValue.substring(0, lastSlashAiIndex);
          // Directly update the store/state with the new value
          if (
            onSelectedElementPropertyUpdate &&
            selectedElementType === 'node'
          ) {
            onSelectedElementPropertyUpdate({ details: newValue });
          }
          // If not using a controlled component for Textarea value, manually update:
          // textareaDetailsRef.current.value = newValue;
        }
      }

      setIsPaletteOpen(false);
      setCommandFilterText('');
    },
    [onSelectedElementPropertyUpdate, selectedElementType]
  );

  const handleClosePalette = useCallback(() => {
    setIsPaletteOpen(false);
    // Optionally, clear the /ai command from textarea here too if desired upon manual close
  }, []);

  const handleTriggerSuggestIntermediateNode = useCallback(async () => {
    // if (isViewOnlyMode || selectedElementType !== 'edge' || !selectedElement) {
    //   toast({
    //     title: 'Action Unavailable',
    //     description: 'Please select an edge to use this feature.',
    //     variant: 'default',
    //   });
    //   return;
    // }
    // const edge = selectedElement as ConceptMapEdge;
    // const { setStagedMapData } = useConceptMapStore.getState(); // Get setStagedMapData
    // const sourceNode = useConceptMapStore
    //   .getState()
    //   .mapData.nodes.find((n) => n.id === edge.source);
    // const targetNode = useConceptMapStore
    //   .getState()
    //   .mapData.nodes.find((n) => n.id === edge.target);
    // if (!sourceNode || !targetNode) {
    //   toast({
    //     title: 'Error',
    //     description: 'Source or target node for the selected edge not found.',
    //     variant: 'destructive',
    //   });
    //   return;
    // }
    // setIsLoadingAISuggestIntermediateNode(true); // Use new loading state
    // const loadingToastId = toast({
    //   title: 'AI Suggestion',
    //   description: 'Generating intermediate node suggestion...',
    //   duration: 999999, // Keep toast until dismissed
    // }).id;
    // try {
    //   const flowInput = {
    //     sourceNodeText: sourceNode.text,
    //     sourceNodeDetails: sourceNode.details,
    //     targetNodeText: targetNode.text,
    //     targetNodeDetails: targetNode.details,
    //     currentEdgeLabel: edge.label,
    //   };
    //   const result = await suggestIntermediateNodeFlow(flowInput);
    //   if (result && result.intermediateNodeText) {
    //     // Calculate positions for staging
    //     const midX =
    //       (sourceNode.x || 0) + ((targetNode.x || 0) - (sourceNode.x || 0)) / 2;
    //     const midY =
    //       (sourceNode.y || 0) + ((targetNode.y || 0) - (sourceNode.y || 0)) / 2;
    //     const DEFAULT_NODE_WIDTH = 150; // Define or import
    //     const DEFAULT_NODE_HEIGHT = 70; // Define or import
    //     const intermediateNode: ConceptMapNode = {
    //       id: `staged-intermediate-${Date.now()}`,
    //       text: result.intermediateNodeText,
    //       details:
    //         result.intermediateNodeDetails ||
    //         (result.reasoning ? `AI Rationale: ${result.reasoning}` : ''),
    //       type: 'ai-intermediate',
    //       width: DEFAULT_NODE_WIDTH,
    //       height: DEFAULT_NODE_HEIGHT,
    //       childIds: [],
    //     };
    //     const edgeToIntermediate: ConceptMapEdge = {
    //       id: `staged-edge1-${intermediateNode.id}-${Date.now()}`,
    //       source: sourceNode.id,
    //       target: intermediateNode.id,
    //       label: result.labelSourceToIntermediate,
    //     };
    //     const edgeFromIntermediate: ConceptMapEdge = {
    //       id: `staged-edge2-${intermediateNode.id}-${Date.now()}`,
    //       source: intermediateNode.id,
    //       target: targetNode.id,
    //       label: result.labelIntermediateToTarget,
    //     };
    //     setStagedMapData({
    //       nodes: [intermediateNode],
    //       edges: [edgeToIntermediate, edgeFromIntermediate],
    //       actionType: 'intermediateNode', // To inform the commit logic what to do (e.g., delete original edge)
    //       originalElementId: edge.id, // Pass original edge ID for deletion on commit
    //     });
    //     toast({
    //       title: 'AI Suggestion Ready',
    //       description: 'Review the new intermediate node in the staging area.',
    //     });
    //   } else {
    //     toast({
    //       title: 'AI Suggestion',
    //       description: 'AI could not suggest an intermediate node.',
    //       variant: 'default',
    //     });
    //   }
    // } catch (error) {
    //   console.error('Error suggesting intermediate node:', error);
    //   toast({
    //     title: 'AI Error',
    //     description:
    //       'Failed to suggest intermediate node. ' +
    //       (error instanceof Error ? error.message : ''),
    //     variant: 'destructive',
    //   });
    // } finally {
    //   setIsLoadingAISuggestIntermediateNode(false); // Use new loading state
    // }
  }, [isViewOnlyMode, selectedElement, selectedElementType, toast]);

  // handleConfirmAISuggestion is removed as staging area handles confirmation.

  const renderMapProperties = () => (
    <>
      <div>
        <Label
          htmlFor='mapNameInspector'
          className={cn(
            (isViewOnlyMode || !currentMap) && 'text-muted-foreground/70'
          )}
        >
          Map Name
        </Label>
        <Input
          id='mapNameInspector'
          value={mapNameValue}
          onChange={handleMapNameChange}
          placeholder='Enter map name'
          disabled={isViewOnlyMode || !currentMap}
          className={cn(
            (isViewOnlyMode || !currentMap) &&
              'bg-muted/50 cursor-not-allowed border-muted/50'
          )}
        />
      </div>
      <div>
        <div className='flex items-center space-x-2 mt-2'>
          <Switch
            id='isPublicSwitch'
            checked={isPublicValue}
            onCheckedChange={handleIsPublicChange}
            disabled={isViewOnlyMode || !currentMap}
            className={cn(
              (isViewOnlyMode || !currentMap) &&
                'data-[state=checked]:bg-muted-foreground/30 data-[state=unchecked]:bg-muted/30'
            )}
          />
          <Label
            htmlFor='isPublicSwitch'
            className={cn(
              'transition-opacity',
              isViewOnlyMode || !currentMap
                ? 'cursor-not-allowed text-muted-foreground/70'
                : 'cursor-pointer'
            )}
          >
            Publicly Visible
          </Label>
        </div>
      </div>
      <div className='mt-2'>
        <Label
          htmlFor='sharedClassroomId'
          className={cn(
            (isViewOnlyMode || !currentMap) && 'text-muted-foreground/70'
          )}
        >
          Share with Classroom ID (Optional)
        </Label>
        <Input
          id='sharedClassroomId'
          value={sharedWithClassroomIdValue || ''}
          onChange={handleSharedIdChange}
          placeholder='Enter classroom ID or leave blank'
          disabled={isViewOnlyMode || !currentMap}
          className={cn(
            (isViewOnlyMode || !currentMap) &&
              'bg-muted/50 cursor-not-allowed border-muted/50'
          )}
        />
      </div>
    </>
  );

  const renderNodeProperties = () => (
    <>
      <div className='flex items-center gap-2 mb-2'>
        <Box className='h-5 w-5 text-muted-foreground' />
        <h4 className='font-semibold text-md'>Node Properties</h4>
      </div>
      <div>
        <Label
          htmlFor='nodeLabel'
          className={cn(isViewOnlyMode && 'text-muted-foreground/70')}
        >
          Label (Text)
        </Label>
        <Input
          id='nodeLabel'
          data-tutorial-id='properties-inspector-node-text-input' // Added tutorial ID
          ref={nodeLabelInputRef}
          value={elementLabelValue}
          onChange={handleElementLabelChange}
          disabled={isViewOnlyMode}
          className={cn(
            isViewOnlyMode && 'bg-muted/50 cursor-not-allowed border-muted/50'
          )}
        />
      </div>
      <div className='mt-2'>
        <div className='flex items-center space-x-2 mb-1'>
          <Label
            htmlFor='nodeDetails'
            className={cn(isViewOnlyMode && 'text-muted-foreground/70')}
          >
            Details
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className='h-3 w-3 text-muted-foreground cursor-help' />
              </TooltipTrigger>
              <TooltipContent side='top' className='max-w-xs'>
                <p className='text-sm'>
                  Provide more context or a description for this node. You can
                  also type{' '}
                  <code className='bg-muted px-1 py-0.5 rounded-sm'>/ai</code>{' '}
                  to access AI commands for content generation or refinement.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
          id='nodeDetails'
          data-tutorial-id='properties-inspector-node-details-input' // Added tutorial ID
          ref={textareaDetailsRef}
          value={elementDetailsValue}
          onChange={handleElementDetailsChangeWithPalette}
          disabled={isViewOnlyMode}
          rows={3}
          className={cn(
            'resize-none',
            isViewOnlyMode && 'bg-muted/50 cursor-not-allowed border-muted/50'
          )}
        />
        <AICommandPalette
          isOpen={isPaletteOpen && !isViewOnlyMode}
          targetRect={paletteTargetRect || undefined}
          commands={aiCommands}
          filterText={commandFilterText}
          onSelectCommand={handleSelectCommand}
          onClose={handleClosePalette}
        />
      </div>
      {/* Node Type input */}
      <div className='mt-2'>
        <div className='flex items-center space-x-2 mb-1'>
          <Label
            htmlFor='nodeType'
            className={cn(isViewOnlyMode && 'text-muted-foreground/70')}
          >
            Type
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className='h-3 w-3 text-muted-foreground cursor-help' />
              </TooltipTrigger>
              <TooltipContent side='top' className='max-w-xs'>
                <p className='text-sm'>
                  Categorize your node. Examples:{' '}
                  <code className='bg-muted px-1 py-0.5 rounded-sm'>
                    component
                  </code>
                  ,{' '}
                  <code className='bg-muted px-1 py-0.5 rounded-sm'>
                    service
                  </code>
                  ,{' '}
                  <code className='bg-muted px-1 py-0.5 rounded-sm'>
                    database
                  </code>
                  ,{' '}
                  <code className='bg-muted px-1 py-0.5 rounded-sm'>
                    feature
                  </code>
                  , or specific types like{' '}
                  <code className='bg-muted px-1 py-0.5 rounded-sm'>
                    js_function
                  </code>
                  ,{' '}
                  <code className='bg-muted px-1 py-0.5 rounded-sm'>
                    ai-summary-node
                  </code>
                  .
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id='nodeType'
          value={elementNodeTypeValue}
          onChange={(e) => {
            if (
              isViewOnlyMode ||
              !onSelectedElementPropertyUpdate ||
              selectedElementType !== 'node' ||
              !selectedElement
            )
              return;
            onSelectedElementPropertyUpdate({ type: e.target.value });
          }}
          disabled={isViewOnlyMode}
          placeholder='e.g., service, component, ai-summary'
          className={cn(
            isViewOnlyMode && 'bg-muted/50 cursor-not-allowed border-muted/50'
          )}
        />
      </div>
      <div className='mt-2'>
        <Label
          htmlFor='nodeBackgroundColor'
          className={cn(
            'flex items-center gap-2',
            isViewOnlyMode && 'text-muted-foreground/70'
          )}
        >
          <Palette className='h-4 w-4 text-muted-foreground' /> Background Color
        </Label>
        <div className='flex items-center gap-2'>
          <Input
            id='nodeBackgroundColor'
            type='color'
            value={nodeBackgroundColorValue || '#ffffff'}
            onChange={handleNodeBackgroundColorChange}
            disabled={isViewOnlyMode}
            className={cn(
              'h-8 w-16 p-1',
              isViewOnlyMode && 'cursor-not-allowed border-muted/50 bg-muted/50'
            )}
          />
          <Button
            variant='ghost'
            size='icon'
            onClick={clearNodeBackgroundColor}
            disabled={isViewOnlyMode || nodeBackgroundColorValue === undefined}
            title='Clear custom background color'
          >
            <Eraser className='h-4 w-4' />
          </Button>
        </div>
      </div>
      <div className='mt-2'>
        <Label
          htmlFor='nodeShape'
          className={cn(
            'flex items-center gap-2',
            isViewOnlyMode && 'text-muted-foreground/70'
          )}
        >
          <CircleDot className='h-4 w-4 text-muted-foreground' /> Node Shape
        </Label>
        <Select
          value={nodeShapeValue}
          onValueChange={(value) =>
            handleNodeShapeChange(value as 'rectangle' | 'ellipse')
          }
          disabled={isViewOnlyMode}
        >
          <SelectTrigger
            className={cn(
              isViewOnlyMode && 'bg-muted/50 cursor-not-allowed border-muted/50'
            )}
          >
            <SelectValue placeholder='Select shape' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='rectangle'>Rectangle</SelectItem>
            <SelectItem value='ellipse'>Ellipse / Circle</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className='mt-3 space-y-2'>
        <Label
          className={cn(
            'flex items-center gap-2',
            isViewOnlyMode && 'text-muted-foreground/70'
          )}
        >
          <Ruler className='h-4 w-4 text-muted-foreground' /> Dimensions (px)
        </Label>
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <Label
              htmlFor='nodeWidth'
              className='text-xs text-muted-foreground'
            >
              Width
            </Label>
            <Input
              id='nodeWidth'
              type='number'
              value={nodeWidthValue === undefined ? '' : nodeWidthValue}
              onChange={(e) =>
                handleNodeDimensionChange('width', e.target.value)
              }
              placeholder='Auto'
              disabled={isViewOnlyMode}
              className={cn(
                'h-9',
                isViewOnlyMode &&
                  'bg-muted/50 cursor-not-allowed border-muted/50'
              )}
            />
          </div>
          <div>
            <Label
              htmlFor='nodeHeight'
              className='text-xs text-muted-foreground'
            >
              Height
            </Label>
            <Input
              id='nodeHeight'
              type='number'
              value={nodeHeightValue === undefined ? '' : nodeHeightValue}
              onChange={(e) =>
                handleNodeDimensionChange('height', e.target.value)
              }
              placeholder='Auto'
              disabled={isViewOnlyMode}
              className={cn(
                'h-9',
                isViewOnlyMode &&
                  'bg-muted/50 cursor-not-allowed border-muted/50'
              )}
            />
          </div>
        </div>
        <Button
          variant='outline'
          size='sm'
          onClick={handleClearNodeDimensions}
          disabled={
            isViewOnlyMode ||
            (nodeWidthValue === undefined && nodeHeightValue === undefined)
          }
          className='w-full text-xs'
        >
          Reset to Auto-Size
        </Button>
      </div>

      {/* Node Q&A Section */}
      <div className='mt-4 pt-4 border-t'>
        <div className='flex items-center gap-2 mb-2'>
          <MessageCircleQuestion className='h-5 w-5 text-muted-foreground' />
          <h4 className='font-semibold text-md'>Ask AI About This Node</h4>
        </div>
        <Textarea
          id='nodeQuestion'
          value={nodeQuestion}
          onChange={(e) => setNodeQuestion(e.target.value)}
          placeholder='e.g., What is the main purpose of this node? How does it relate to X?'
          rows={2}
          className='resize-none mb-2'
          disabled={isViewOnlyMode || isAskingNodeQuestion}
        />
        <Button
          onClick={handleAskAIAboutNode}
          disabled={
            isViewOnlyMode ||
            isAskingNodeQuestion ||
            !nodeQuestion.trim() ||
            !selectedElement
          }
          className='w-full'
          size='sm'
        >
          {isAskingNodeQuestion ? (
            <LoaderIcon className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Send className='mr-2 h-4 w-4' />
          )}
          Ask AI
        </Button>
        {isAskingNodeQuestion && (
          <p className='text-xs text-muted-foreground mt-1 text-center'>
            AI is thinking...
          </p>
        )}
        {askNodeQuestionError && (
          <div className='mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded-md flex items-start'>
            <AlertTriangleIcon className='h-4 w-4 mr-2 flex-shrink-0 mt-0.5' />
            <p>{askNodeQuestionError}</p>
          </div>
        )}
        {aiNodeAnswer && !isAskingNodeQuestion && !askNodeQuestionError && (
          <div className='mt-2 text-xs text-foreground bg-muted/50 p-3 rounded-md whitespace-pre-wrap'>
            <strong className='font-medium'>AI Answer:</strong> {aiNodeAnswer}
          </div>
        )}
      </div>
    </>
  );

  const handleAskAIAboutNode = useCallback(async () => {
    // if (
    //   isViewOnlyMode ||
    //   !selectedElement ||
    //   selectedElementType !== 'node' ||
    //   !nodeQuestion.trim()
    // ) {
    //   return;
    // }
    // setIsAskingNodeQuestion(true);
    // setAiNodeAnswer(null);
    // setAskNodeQuestionError(null);
    // try {
    //   const node = selectedElement as ConceptMapNode;
    //   // Assuming aiToolsHook.askQuestionAboutNode is implemented in useConceptMapAITools
    //   const result = await aiToolsHook.askQuestionAboutNode(
    //     node.id,
    //     node.text,
    //     node.details,
    //     node.type,
    //     nodeQuestion
    //   );
    //   if (result.error) {
    //     setAskNodeQuestionError(result.error);
    //     setAiNodeAnswer(
    //       result.answer ||
    //         'AI could not provide a specific answer due to an error.'
    //     );
    //   } else {
    //     setAiNodeAnswer(result.answer);
    //   }
    // } catch (error) {
    //   const errorMsg =
    //     error instanceof Error ? error.message : 'An unknown error occurred.';
    //   setAskNodeQuestionError(errorMsg);
    //   setAiNodeAnswer('Failed to get an answer from AI.');
    //   toast({
    //     title: 'AI Question Error',
    //     description: errorMsg,
    //     variant: 'destructive',
    //   });
    // } finally {
    //   setIsAskingNodeQuestion(false);
    //   // Do not clear nodeQuestion here, user might want to refine it.
    // }
  }, [
    isViewOnlyMode,
    selectedElement,
    selectedElementType,
    nodeQuestion,
    aiToolsHook,
    toast,
  ]);

  const renderEdgeProperties = () => (
    <>
      <div className='flex items-center gap-2 mb-2'>
        <Waypoints className='h-5 w-5 text-muted-foreground' />
        <h4 className='font-semibold text-md'>Edge Properties</h4>
      </div>
      <div>
        <Label
          htmlFor='edgeLabel'
          className={cn(isViewOnlyMode && 'text-muted-foreground/70')}
        >
          Label
        </Label>
        <Input
          id='edgeLabel'
          data-tutorial-id='properties-inspector-edge-label-input' // Added tutorial ID
          value={elementLabelValue}
          onChange={handleElementLabelChange}
          disabled={isViewOnlyMode}
          className={cn(
            isViewOnlyMode && 'bg-muted/50 cursor-not-allowed border-muted/50'
          )}
        />
      </div>
      <div className='mt-2'>
        <Label
          htmlFor='edgeColor'
          className={cn(
            'flex items-center gap-2',
            isViewOnlyMode && 'text-muted-foreground/70'
          )}
        >
          <Palette className='h-4 w-4 text-muted-foreground' /> Line Color
        </Label>
        <div className='flex items-center gap-2'>
          <Input
            id='edgeColor'
            type='color'
            value={edgeColorValue || '#000000'}
            onChange={handleEdgeColorChange}
            disabled={isViewOnlyMode}
            className={cn(
              'h-8 w-16 p-1',
              isViewOnlyMode && 'cursor-not-allowed border-muted/50 bg-muted/50'
            )}
          />
          <Button
            variant='ghost'
            size='icon'
            onClick={clearEdgeColor}
            disabled={isViewOnlyMode || edgeColorValue === undefined}
            title='Clear custom line color'
          >
            <Eraser className='h-4 w-4' />
          </Button>
        </div>
      </div>
      <div className='mt-2'>
        <Label
          htmlFor='edgeLineType'
          className={cn(
            'flex items-center gap-2',
            isViewOnlyMode && 'text-muted-foreground/70'
          )}
        >
          <Minus className='h-4 w-4 text-muted-foreground' />
          Line Type
        </Label>
        <Select
          value={edgeLineTypeValue}
          onValueChange={(value) =>
            handleEdgeLineTypeChange(value as 'solid' | 'dashed')
          }
          disabled={isViewOnlyMode}
        >
          <SelectTrigger
            className={cn(
              isViewOnlyMode && 'bg-muted/50 cursor-not-allowed border-muted/50'
            )}
          >
            <SelectValue placeholder='Select line type' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='solid'>Solid</SelectItem>
            <SelectItem value='dashed'>Dashed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className='mt-2'>
        <Label
          htmlFor='edgeMarkerStart'
          className={cn(
            'flex items-center gap-2',
            isViewOnlyMode && 'text-muted-foreground/70'
          )}
        >
          <ArrowBigLeft className='h-4 w-4 text-muted-foreground' /> Start Arrow
        </Label>
        <Select
          value={edgeMarkerStartValue}
          onValueChange={(value) => handleEdgeMarkerChange('start', value)}
          disabled={isViewOnlyMode}
        >
          <SelectTrigger
            className={cn(
              isViewOnlyMode && 'bg-muted/50 cursor-not-allowed border-muted/50'
            )}
          >
            <SelectValue placeholder='Select start arrow' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none'>None</SelectItem>
            <SelectItem value='arrow'>Arrow (Open)</SelectItem>
            <SelectItem value='arrowclosed'>Arrow (Closed)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className='mt-2'>
        <Label
          htmlFor='edgeMarkerEnd'
          className={cn(
            'flex items-center gap-2',
            isViewOnlyMode && 'text-muted-foreground/70'
          )}
        >
          <ArrowBigRight className='h-4 w-4 text-muted-foreground' /> End Arrow
        </Label>
        <Select
          value={edgeMarkerEndValue}
          onValueChange={(value) => handleEdgeMarkerChange('end', value)}
          disabled={isViewOnlyMode}
        >
          <SelectTrigger
            className={cn(
              isViewOnlyMode && 'bg-muted/50 cursor-not-allowed border-muted/50'
            )}
          >
            <SelectValue placeholder='Select end arrow' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='none'>None</SelectItem>
            <SelectItem value='arrow'>Arrow (Open)</SelectItem>
            <SelectItem value='arrowclosed'>Arrow (Closed)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className='mt-4 pt-4 border-t'>
        <Button
          variant='outline'
          size='sm'
          className='w-full'
          onClick={handleTriggerSuggestIntermediateNode}
          disabled={
            isLoadingAISuggestIntermediateNode ||
            isViewOnlyMode ||
            !selectedElement
          }
        >
          {isLoadingAISuggestIntermediateNode ? (
            <LoaderIcon className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <Lightbulb className='mr-2 h-4 w-4' />
          )}
          Suggest Intermediate Node (AI)
        </Button>
      </div>

      {/* Edge Q&A Section */}
      <div className='mt-4 pt-4 border-t'>
        <div className='flex items-center gap-2 mb-1'>
          <MessageCircleQuestion className='h-4 w-4 text-muted-foreground' />
          <h5 className='font-medium text-sm'>Ask AI About This Edge</h5>
        </div>
        <Button
          onClick={() => {
            if (
              selectedElement &&
              selectedElementType === 'edge' &&
              aiTools?.openAskQuestionAboutEdgeModal
            ) {
              aiTools.openAskQuestionAboutEdgeModal(selectedElement.id);
            }
          }}
          disabled={
            isViewOnlyMode ||
            !selectedElement ||
            selectedElementType !== 'edge' ||
            !aiTools?.openAskQuestionAboutEdgeModal
          }
          className='w-full'
          size='sm'
          variant='outline'
        >
          <HelpCircle className='mr-2 h-4 w-4' />
          Ask Question...
        </Button>
      </div>
    </>
  );

  const getCardDescription = () => {
    if (!currentMap && !selectedElement)
      return 'Load a map or select an element to see properties.';
    if (isViewOnlyMode) {
      return selectedElement
        ? 'Viewing selected element properties. Editing is disabled.'
        : 'Viewing map properties. Editing is disabled.';
    }
    return selectedElement
      ? 'Edit selected element properties. Changes are applied immediately.'
      : 'Edit map properties. Changes are applied immediately.';
  };

  return (
    <Card className='h-full shadow-lg'>
      <CardHeader>
        <div className='flex items-center gap-2'>
          <Settings2 className='h-5 w-5 text-primary' />
          <CardTitle className='text-lg'>Properties</CardTitle>
        </div>
        <CardDescription>{getCardDescription()}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4 relative'>
        {' '}
        {/* Added relative for palette positioning context */}
        {selectedElementType === 'node' && selectedElement ? (
          renderNodeProperties()
        ) : selectedElementType === 'edge' && selectedElement ? (
          renderEdgeProperties()
        ) : currentMap ? (
          renderMapProperties()
        ) : (
          <p className='text-sm text-muted-foreground'>
            No map loaded or selected.
          </p>
        )}
        {!isViewOnlyMode && (currentMap || selectedElement) && (
          <p className='text-xs text-muted-foreground pt-4 border-t mt-4'>
            Changes are applied to the map state directly. Use the main
            &quot;Save Map&quot; button in the toolbar to persist them.
          </p>
        )}
        {isViewOnlyMode && (currentMap || selectedElement) && (
          <p className='text-xs text-muted-foreground pt-4 border-t mt-4'>
            This map is in view-only mode. Editing features are disabled.
          </p>
        )}
        {/* <AICommandPalette
          isOpen={showPalette}
          targetRect={paletteTargetRef?.current?.getBoundingClientRect()}
          commands={availableAiCommands}
          onSelectCommand={_handlePaletteSelectCommand}
          onClose={_handlePaletteClose}
          query={paletteQuery}
        /> */}
      </CardContent>

      {/* AlertDialog for intermediate node suggestion removed, will use Staging Area */}
    </Card>
  );
});

PropertiesInspector.displayName = 'PropertiesInspector';
