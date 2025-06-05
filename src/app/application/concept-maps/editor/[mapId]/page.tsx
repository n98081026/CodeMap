
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Node as RFNode } from 'reactflow'; 
import { ReactFlowProvider } from 'reactflow';
import dynamic from 'next/dynamic';

import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { AISuggestionPanel } from "@/components/concept-map/ai-suggestion-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import {
  ExtractConceptsModal,
  SuggestRelationsModal,
  ExpandConceptModal,
  AskQuestionModal,
} from "@/components/concept-map/genai-modals";
import { QuickClusterModal } from "@/components/concept-map/quick-cluster-modal"; 
import { GenerateSnippetModal } from "@/components/concept-map/generate-snippet-modal"; 
import type { GenerateQuickClusterOutput } from "@/ai/flows/generate-quick-cluster"; 
import type { GenerateMapSnippetOutput } from "@/ai/flows/generate-map-snippet-from-text"; 
import { useToast } from "@/hooks/use-toast";
import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from "@/types";
import { UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { NodeContextMenu } from '@/components/concept-map/node-context-menu'; 
import type { CustomNodeData } from '@/components/concept-map/custom-node'; 

import useConceptMapStore from '@/stores/concept-map-store';


const FlowCanvasCore = dynamic(() => import('@/components/concept-map/flow-canvas-core'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>,
});


export default function ConceptMapEditorPage() {
  const paramsHook = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { toast } = useToast();
  const { user } = useAuth();

  const {
    mapId: storeMapId,
    mapName, currentMapOwnerId, currentMapCreatedAt, isPublic, sharedWithClassroomId, isNewMapMode,
    mapData: storeMapData,
    isLoading: isStoreLoading,
    isSaving, error: storeError,
    selectedElementId, selectedElementType,
    multiSelectedNodeIds, 
    aiExtractedConcepts, aiSuggestedRelations, aiExpandedConcepts,
    initializeNewMap, setLoadedMap, setIsLoading: setStoreIsLoading, setError: setStoreError,
    setMapName: setStoreMapName, setIsPublic: setStoreIsPublic, setSharedWithClassroomId: setStoreSharedWithClassroomId,
    addNode: addStoreNode, updateNode: updateStoreNode, deleteNode: deleteStoreNode,
    addEdge: addStoreEdge, updateEdge: updateStoreEdge, deleteEdge: deleteStoreEdge, 
    setSelectedElement: setStoreSelectedElement,
    setMultiSelectedNodeIds: setStoreMultiSelectedNodeIds, 
    setIsSaving: setStoreIsSaving,
    setAiExtractedConcepts: setStoreAiExtractedConcepts,
    setAiSuggestedRelations: setStoreAiSuggestedRelations,
    setAiExpandedConcepts: setStoreAiExpandedConcepts,
    resetAiSuggestions: resetStoreAiSuggestions,
    removeExtractedConceptsFromSuggestions,
    removeSuggestedRelationsFromSuggestions,
    removeExpandedConceptsFromSuggestions,
    importMapData,
  } = useConceptMapStore();
  
  const temporalStoreAPI = useConceptMapStore.temporal;
  const undo = temporalStoreAPI.undo;
  const redo = temporalStoreAPI.redo;
  
  const [temporalState, setTemporalState] = useState(temporalStoreAPI.getState());

  useEffect(() => {
    const unsubscribe = temporalStoreAPI.subscribe(
      (newTemporalState) => setTemporalState(newTemporalState),
      (state) => state 
    );
    return unsubscribe;
  }, [temporalStoreAPI]);

  const pastStates = temporalState.pastStates;
  const futureStates = temporalState.futureStates;
  
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const clearTemporalHistory = useCallback(() => {
    const currentTemporalStore = useConceptMapStore.temporal;
    if (currentTemporalStore && currentTemporalStore.clear && typeof currentTemporalStore.clear === 'function') {
      try {
        currentTemporalStore.clear();
      } catch (e) {
        console.error("Error calling currentTemporalStore.clear():", e);
      }
    }
  }, []);


  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  const [isQuickClusterModalOpen, setIsQuickClusterModalOpen] = useState(false); 
  const [isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen] = useState(false); 
  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  
  const [textForExtraction, setTextForExtraction] = useState(""); 
  const [conceptToExpand, setConceptToExpand] = useState("");
  const [mapContextForExpansion, setMapContextForExpansion] = useState<string[]>([]);
  const [conceptsForRelationSuggestion, setConceptsForRelationSuggestion] = useState<string[]>([]);
  const [nodeContextForQuestion, setNodeContextForQuestion] = useState<{ text: string; details?: string, id: string } | null>(null);

  const [isPropertiesInspectorOpen, setIsPropertiesInspectorOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false); 

  const fileInputRef = useRef<HTMLInputElement>(null);


  const routeMapId = paramsHook.mapId as string;
  const isViewOnlyMode = searchParams.get('viewOnly') === 'true';

  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  } | null>(null);

  const loadMapData = useCallback(async (idToLoad: string) => {
    if (!idToLoad || idToLoad.trim() === '') {
      if (user && user.id) {
        initializeNewMap(user.id);
        clearTemporalHistory();
      } else {
         setStoreError("Cannot initialize new map: User not found.");
      }
      return;
    }
    if (idToLoad === "new") {
      if (user && user.id) {
        initializeNewMap(user.id);
        clearTemporalHistory(); 
      } else {
        setStoreError("User data not available for new map initialization.");
        toast({ title: "Authentication Error", description: "User data not available for new map.", variant: "destructive" });
      }
      return;
    }

    setStoreIsLoading(true);
    setStoreError(null);
    resetStoreAiSuggestions();
    try {
      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        if (user && user.id) {
          initializeNewMap(user.id); 
          clearTemporalHistory();
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map instead.`, variant: "destructive"});
        } else {
          throw new Error(errData.message || "Failed to load map and no user for new map fallback");
        }
        return;
      }
      const data: ConceptMap = await response.json();
      setLoadedMap(data);
      clearTemporalHistory(); 
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
      setStoreMapName("Error Loading Map");
    } finally {
      setStoreIsLoading(false);
    }
  }, [user, initializeNewMap, setLoadedMap, setStoreError, setStoreIsLoading, toast, resetStoreAiSuggestions, setStoreMapName, clearTemporalHistory]);


  const handleMapPropertiesChange = useCallback((properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => {
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot change map properties.", variant: "default"});
        return;
    }
    setStoreMapName(properties.name);
    setStoreIsPublic(properties.isPublic);
    setStoreSharedWithClassroomId(properties.sharedWithClassroomId);
  }, [isViewOnlyMode, toast, setStoreMapName, setStoreIsPublic, setStoreSharedWithClassroomId]);

  const handleFlowSelectionChange = useCallback((elementId: string | null, elementType: 'node' | 'edge' | null) => {
    setStoreSelectedElement(elementId, elementType);
  }, [setStoreSelectedElement]);

  const handleMultiNodeSelectionChange = useCallback((nodeIds: string[]) => {
    setStoreMultiSelectedNodeIds(nodeIds);
  }, [setStoreMultiSelectedNodeIds]);


  const handleSaveMap = useCallback(async () => {
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        return;
    }
    setStoreIsSaving(true);

    const mapDataToSave: ConceptMapData = storeMapData;

    const payloadOwnerId = (isNewMapMode || !currentMapOwnerId) ? user.id : currentMapOwnerId;
    if (!payloadOwnerId) {
        toast({ title: "Authentication Error", description: "Cannot determine map owner. Please ensure you are logged in.", variant: "destructive"});
        setStoreIsSaving(false);
        return;
    }

    const payload = {
      name: mapName,
      ownerId: payloadOwnerId,
      mapData: mapDataToSave,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = (isNewMapMode || storeMapId === 'new') ? null : storeMapId;

      if (!currentMapIdForAPI) {
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const updatePayload = {
            name: mapName,
            mapData: mapDataToSave,
            isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId,
            ownerId: currentMapOwnerId, // For backend authorization
        };
        response = await fetch(`/api/concept-maps/${currentMapIdForAPI}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMap: ConceptMap = await response.json();
      setLoadedMap(savedMap); 
      clearTemporalHistory(); 
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new') && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStoreIsSaving(false);
    }
  }, [
    isViewOnlyMode, user, mapName, storeMapData,
    isNewMapMode, currentMapOwnerId, isPublic, sharedWithClassroomId,
    router, toast, storeMapId, setStoreIsSaving, setLoadedMap, setStoreError, clearTemporalHistory
  ]);

  const handleConceptsExtracted = useCallback((concepts: string[]) => {
    if (isViewOnlyMode) return;
    setStoreAiExtractedConcepts(concepts); 
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. View them in the AI Suggestions panel.` });
    setIsAiPanelOpen(true); 
  }, [isViewOnlyMode, setStoreAiExtractedConcepts, toast]);

  const handleRelationsSuggested = useCallback((relations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) return;
    setStoreAiSuggestedRelations(relations); 
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations. View them in the AI Suggestions panel.` });
    setIsAiPanelOpen(true);
  }, [isViewOnlyMode, setStoreAiSuggestedRelations, toast]);

  const handleConceptExpanded = useCallback((newConcepts: string[]) => {
    if (isViewOnlyMode) return;
    setStoreAiExpandedConcepts(newConcepts); 
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas. View them in the AI Suggestions panel.` });
    setIsAiPanelOpen(true);
  }, [isViewOnlyMode, setStoreAiExpandedConcepts, toast]);


  const getNodePlacementPosition = useCallback((index: number, clusterSize: number = 1, clusterIndex: number = 0): { x: number; y: number } => {
    const currentStoreState = useConceptMapStore.getState();
    const { selectedElementId: currentSelectedId, mapData: currentMapData } = currentStoreState;
    let baseX = 50;
    let baseY = 50;
    const offsetX = 180; 
    const offsetY = 70;  
    const clusterOffsetX = 10; 
    const clusterOffsetY = 10;

    if (currentSelectedId) {
      const selectedNode = currentMapData.nodes.find(n => n.id === currentSelectedId);
      if (selectedNode && typeof selectedNode.x === 'number' && typeof selectedNode.y === 'number') {
        baseX = selectedNode.x + offsetX; 
        baseY = selectedNode.y + (index * offsetY);
        baseX += clusterIndex * clusterOffsetX;
        baseY += clusterIndex * clusterOffsetY;
        return { x: baseX, y: baseY };
      }
    }
    const nodesPerRow = clusterSize > 1 ? Math.ceil(Math.sqrt(clusterSize)) : 3;
    const rowIndex = Math.floor(index / nodesPerRow);
    const colIndex = index % nodesPerRow;
    
    return { 
      x: baseX + colIndex * offsetX + (clusterIndex * clusterOffsetX), 
      y: baseY + rowIndex * offsetY + (clusterIndex * clusterOffsetY)
    };
  }, []);


  const addSelectedExtractedConceptsToMap = useCallback((selectedConcepts: string[]) => {
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot add concepts in view-only mode.", variant: "default"});
        return;
    }
    if (selectedConcepts.length === 0) {
        toast({ title: "No Concepts Selected", description: "Please select concepts to add.", variant: "default"});
        return;
    }
    let addedCount = 0;
    selectedConcepts.forEach((conceptText, index) => {
      const position = getNodePlacementPosition(index, selectedConcepts.length);
      addStoreNode({
        text: conceptText,
        type: 'ai-concept',
        position: position,
      });
      addedCount++;
    });

    if (addedCount > 0) {
      toast({ title: "Concepts Added", description: `${addedCount} new concepts added to map. Remember to save.` });
      removeExtractedConceptsFromSuggestions(selectedConcepts);
    } else {
      toast({ title: "No New Concepts Added", description: "All selected suggestions might already exist or were not selected.", variant: "default" });
    }
  }, [isViewOnlyMode, toast, addStoreNode, getNodePlacementPosition, removeExtractedConceptsFromSuggestions]);

  const addSelectedSuggestedRelationsToMap = useCallback((selectedRelations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot add relations in view-only mode.", variant: "default"});
        return;
    }
    if (selectedRelations.length === 0) {
        toast({ title: "No Relations Selected", description: "Please select relations to add.", variant: "default"});
        return;
    }

    let relationsAddedCount = 0;
    let conceptsAddedFromRelationsCount = 0;
    
    selectedRelations.forEach((rel, index) => {
      let currentNodesSnapshot = [...useConceptMapStore.getState().mapData.nodes]; 
      let sourceNode = currentNodesSnapshot.find(node => node.text.toLowerCase().trim() === rel.source.toLowerCase().trim());
      if (!sourceNode) {
        const position = getNodePlacementPosition(conceptsAddedFromRelationsCount, selectedRelations.length, index); 
        const newSourceNodeId = addStoreNode({ text: rel.source, type: 'ai-concept', position });
        currentNodesSnapshot = [...useConceptMapStore.getState().mapData.nodes]; 
        sourceNode = currentNodesSnapshot.find(node => node.id === newSourceNodeId);
        if (sourceNode) conceptsAddedFromRelationsCount++; else return; 
      }

      let targetNode = currentNodesSnapshot.find(node => node.text.toLowerCase().trim() === rel.target.toLowerCase().trim());
      if (!targetNode) {
        const position = getNodePlacementPosition(conceptsAddedFromRelationsCount, selectedRelations.length, index); 
        const newTargetNodeId = addStoreNode({ text: rel.target, type: 'ai-concept', position });
        currentNodesSnapshot = [...useConceptMapStore.getState().mapData.nodes]; 
        targetNode = currentNodesSnapshot.find(node => node.id === newTargetNodeId);
        if (targetNode) conceptsAddedFromRelationsCount++; else return; 
      }

      const currentEdgesSnapshot = useConceptMapStore.getState().mapData.edges;
      if (sourceNode && targetNode && !currentEdgesSnapshot.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
        addStoreEdge({ source: sourceNode!.id, target: targetNode!.id, label: rel.relation });
        relationsAddedCount++;
      }
    });

    let toastMessage = "";
    if (relationsAddedCount > 0) toastMessage += `${relationsAddedCount} new relations added. `;
    if (conceptsAddedFromRelationsCount > 0) toastMessage += `${conceptsAddedFromRelationsCount} new concepts (from relations) added. `;

    if (toastMessage) {
        toast({ title: "Relations Added", description: `${toastMessage.trim()} Remember to save the map.` });
        removeSuggestedRelationsFromSuggestions(selectedRelations);
    } else {
        toast({ title: "No New Relations Added", description: "All selected suggestions might already exist or were not selected.", variant: "default" });
    }
  }, [isViewOnlyMode, toast, addStoreNode, addStoreEdge, getNodePlacementPosition, removeSuggestedRelationsFromSuggestions]);

  const addSelectedExpandedConceptsToMap = useCallback((selectedConcepts: string[]) => {
     if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot add concepts in view-only mode.", variant: "default"});
        return;
    }
    if (selectedConcepts.length === 0) {
        toast({ title: "No Concepts Selected", description: "Please select concepts to add.", variant: "default"});
        return;
    }
    let addedCount = 0;
    selectedConcepts.forEach((conceptText, index) => {
      const position = getNodePlacementPosition(index, selectedConcepts.length);
      addStoreNode({
        text: conceptText,
        type: 'ai-expanded', 
        position: position,
      });
      addedCount++;
    });
    if (addedCount > 0) {
      toast({ title: "Expanded Ideas Added", description: `${addedCount} new ideas added to map. Remember to save.` });
      removeExpandedConceptsFromSuggestions(selectedConcepts);
    } else {
      toast({ title: "No New Ideas Added", description: "All selected new suggestions might already exist or were not selected.", variant: "default" });
    }
  }, [isViewOnlyMode, toast, addStoreNode, getNodePlacementPosition, removeExpandedConceptsFromSuggestions]);


  const handleAddNodeToData = useCallback(() => {
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot add node in view-only mode.", variant: "default"});
        return;
    }
    const newNodeText = `Node ${useConceptMapStore.getState().mapData.nodes.length + 1}`;
    const position = getNodePlacementPosition(useConceptMapStore.getState().mapData.nodes.length);
    addStoreNode({ text: newNodeText, type: 'manual-node', position });
    toast({ title: "Node Added", description: `"${newNodeText}" added. Remember to save.`});
  }, [isViewOnlyMode, toast, addStoreNode, getNodePlacementPosition]);

  const handleAddAddEdgeToData = useCallback(() => {
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot add edge in view-only mode.", variant: "default"});
        return;
    }
    const nodes = useConceptMapStore.getState().mapData.nodes;
    if (nodes.length < 2) {
      toast({ title: "Cannot Add Edge", description: "Add at least two nodes to create an edge.", variant: "default" });
      return;
    }
    // Default behavior: connect the last two nodes added
    const sourceNode = nodes[nodes.length - 2];
    const targetNode = nodes[nodes.length - 1];
    
    if (!sourceNode || !targetNode) { // Should not happen if length check passed
        toast({ title: "Error Adding Edge", description: "Could not determine source/target nodes for default edge.", variant: "destructive"});
        return;
    }

    addStoreEdge({ source: sourceNode.id, target: targetNode.id, label: 'connects' });
    toast({ title: "Edge Added", description: `Edge between "${sourceNode.text}" and "${targetNode.text}" added. Remember to save.`});
  }, [isViewOnlyMode, toast, addStoreEdge]);


  const getRoleBasedDashboardLink = useCallback(() => {
    if (!user) return "/login";
    switch (user.role) {
      case UserRole.STUDENT: return "/application/student/dashboard";
      case UserRole.TEACHER: return "/application/teacher/dashboard";
      case UserRole.ADMIN: return "/application/admin/dashboard";
      default: return "/login"; 
    }
  }, [user]);

  const getBackLink = useCallback(() => {
    if (!user) return "/login";
    if (isNewMapMode || storeMapId === 'new' || (user.role === UserRole.ADMIN && !sharedWithClassroomId)) {
        return getRoleBasedDashboardLink();
    }
    if (user.role === UserRole.STUDENT) return "/application/student/concept-maps";
    if (user.role === UserRole.TEACHER || (user.role === UserRole.ADMIN && sharedWithClassroomId)) {
        if (sharedWithClassroomId) return `/application/teacher/classrooms/${sharedWithClassroomId}`;
        return "/application/teacher/dashboard";
    }
    return getRoleBasedDashboardLink();
  }, [user, isNewMapMode, storeMapId, sharedWithClassroomId, getRoleBasedDashboardLink]);

  const getBackButtonText = useCallback(() => {
    if (!user) return "Back";
     if (isNewMapMode || storeMapId === 'new' || (user.role === UserRole.ADMIN && !sharedWithClassroomId)) return "Back to Dashboard";
    if (user.role === UserRole.STUDENT) return "Back to My Maps";
    if (user.role === UserRole.TEACHER || (user.role === UserRole.ADMIN && sharedWithClassroomId)) {
        if (sharedWithClassroomId) return "Back to Classroom";
        return "Back to Dashboard";
    }
    return "Back";
  }, [user, isNewMapMode, storeMapId, sharedWithClassroomId]);

  useEffect(() => {
    if (typeof routeMapId === 'string') {
      loadMapData(routeMapId);
    } else if (user && user.id && !storeMapId && isNewMapMode) {
      initializeNewMap(user.id);
      clearTemporalHistory(); 
    }
  }, [routeMapId, user?.id, initializeNewMap, loadMapData, storeMapId, isNewMapMode, clearTemporalHistory]); 

  const prepareAndOpenExpandConceptModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot expand concept in view-only mode.", variant: "default" });
      return;
    }
    resetStoreAiSuggestions();
    let concept = "";
    let context: string[] = [];
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const currentEdges = useConceptMapStore.getState().mapData.edges;
    const targetNodeId = nodeIdForContext || selectedElementId;

    if (targetNodeId && currentNodes) {
      const selectedNode = currentNodes.find(n => n.id === targetNodeId);
      if (selectedNode) {
        concept = selectedNode.text;
        const neighborIds = new Set<string>();
        currentEdges?.forEach(edge => {
          if (edge.source === selectedNode.id) neighborIds.add(edge.target);
          if (edge.target === selectedNode.id) neighborIds.add(edge.source);
        });
        context = Array.from(neighborIds)
          .map(id => currentNodes.find(n => n.id === id)?.text)
          .filter((text): text is string => !!text)
          .slice(0, 5); 
      }
    } else if (currentNodes && currentNodes.length > 0) { 
      concept = currentNodes[0].text; 
      context = currentNodes.slice(1, 6).map(n => n.text); 
    }
    setConceptToExpand(concept);
    setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [selectedElementId, resetStoreAiSuggestions, isViewOnlyMode, toast]);
  
  const prepareAndOpenSuggestRelationsModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot suggest relations in view-only mode.", variant: "default" });
      return;
    }
    resetStoreAiSuggestions();
    let concepts: string[] = [];
    const currentMapNodes = useConceptMapStore.getState().mapData.nodes;
    const currentMapEdges = useConceptMapStore.getState().mapData.edges;
    const currentMultiSelectedNodeIds = useConceptMapStore.getState().multiSelectedNodeIds;

    if (nodeIdForContext && currentMapNodes) { 
        const cNode = currentMapNodes.find(n => n.id === nodeIdForContext);
        if (cNode) {
            concepts.push(cNode.text);
            const neighborIds = new Set<string>();
            currentMapEdges?.forEach(edge => {
                if (edge.source === cNode.id) neighborIds.add(edge.target);
                if (edge.target === cNode.id) neighborIds.add(edge.source);
            });
            concepts.push(...Array.from(neighborIds)
                .map(id => currentMapNodes.find(n => n.id === id)?.text)
                .filter((text): text is string => !!text)
                .slice(0, 4)); 
        }
    } else { 
        if (currentMultiSelectedNodeIds && currentMultiSelectedNodeIds.length >= 2) {
            concepts = currentMultiSelectedNodeIds
                .map(id => currentMapNodes.find(n => n.id === id)?.text)
                .filter((text): text is string => !!text);
        } else if (currentMultiSelectedNodeIds && currentMultiSelectedNodeIds.length === 1 && currentMapNodes) {
            const selectedNode = currentMapNodes.find(n => n.id === currentMultiSelectedNodeIds[0]);
            if (selectedNode) {
                concepts.push(selectedNode.text);
                const neighborIds = new Set<string>();
                 currentMapEdges?.forEach(edge => {
                    if (edge.source === selectedNode.id) neighborIds.add(edge.target);
                    if (edge.target === selectedNode.id) neighborIds.add(edge.source);
                });
                concepts.push(...Array.from(neighborIds)
                    .map(id => currentMapNodes.find(n => n.id === id)?.text)
                    .filter((text): text is string => !!text)
                    .slice(0, 4));
            }
        } else if (currentMapNodes && currentMapNodes.length > 0) { 
             concepts = currentMapNodes.slice(0, Math.min(5, currentMapNodes.length)).map(n => n.text);
        }
    }
    
    setConceptsForRelationSuggestion(concepts.length > 0 ? concepts : ["Example Concept A", "Example Concept B"]); 
    setIsSuggestRelationsModalOpen(true);
  }, [resetStoreAiSuggestions, isViewOnlyMode, toast]);

  const prepareAndOpenExtractConceptsModal = useCallback((nodeIdForContext?: string) => { 
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot extract concepts in view-only mode.", variant: "default" });
      return;
    }
    resetStoreAiSuggestions();
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const currentSelectedNodeId = useConceptMapStore.getState().selectedElementId;
    const currentSelectedType = useConceptMapStore.getState().selectedElementType;
    const currentMultiSelectedIds = useConceptMapStore.getState().multiSelectedNodeIds;
    let initialText = "";

    if (nodeIdForContext) { 
        const node = currentNodes.find(n => n.id === nodeIdForContext);
        if (node) initialText = `${node.text}${node.details ? `\n\nDetails: ${node.details}` : ''}`;
    } else if (currentMultiSelectedIds.length > 0) { 
        initialText = currentMultiSelectedIds.map(id => {
            const node = currentNodes.find(n => n.id === id);
            return node ? `${node.text}${node.details ? `\nDetails: ${node.details}` : ''}` : '';
        }).filter(Boolean).join("\n\n---\n\n");
    } else if (currentSelectedNodeId && currentSelectedType === 'node') { 
        const node = currentNodes.find(n => n.id === currentSelectedNodeId);
        if (node) initialText = `${node.text}${node.details ? `\nDetails: ${node.details}` : ''}`;
    }
    setTextForExtraction(initialText);
    setIsExtractConceptsModalOpen(true);
  }, [resetStoreAiSuggestions, isViewOnlyMode, toast]);

  const handleOpenQuickClusterModal = useCallback(() => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot use Quick AI Cluster in view-only mode.", variant: "default" });
      return;
    }
    setIsQuickClusterModalOpen(true);
  }, [isViewOnlyMode, toast]);

  const handleClusterGenerated = useCallback((output: GenerateQuickClusterOutput) => {
    if (isViewOnlyMode) return;

    const newNodesMap = new Map<string, string>(); 
    let addedNodesCount = 0;

    output.nodes.forEach((aiNode, index) => {
      const position = getNodePlacementPosition(index, output.nodes.length, addedNodesCount); 
      const newNodeId = addStoreNode({
        text: aiNode.text,
        type: aiNode.type || 'ai-generated',
        details: aiNode.details || '',
        position: position,
      });
      newNodesMap.set(aiNode.text, newNodeId); 
      addedNodesCount++;
    });

    if (output.edges) {
      output.edges.forEach(aiEdge => {
        const sourceId = newNodesMap.get(aiEdge.sourceText);
        const targetId = newNodesMap.get(aiEdge.targetText);
        if (sourceId && targetId) {
          addStoreEdge({
            source: sourceId,
            target: targetId,
            label: aiEdge.relationLabel,
          });
        } else {
            console.warn(`Could not create edge for AI relation: "${aiEdge.sourceText}" -> "${aiEdge.targetText}" (${aiEdge.relationLabel}). One or both nodes not found after adding.`);
        }
      });
    }
    toast({ title: "AI Cluster Added", description: `Added ${output.nodes.length} nodes and ${output.edges?.length || 0} edges to the map.` });
  }, [isViewOnlyMode, addStoreNode, addStoreEdge, toast, getNodePlacementPosition]);

  const handleOpenGenerateSnippetModal = useCallback(() => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot use Generate Snippet in view-only mode.", variant: "default" });
      return;
    }
    setIsGenerateSnippetModalOpen(true);
  }, [isViewOnlyMode, toast]);

  const handleSnippetGenerated = useCallback((output: GenerateMapSnippetOutput) => {
    if (isViewOnlyMode) return;
    const newNodesMap = new Map<string, string>();
    let addedNodesCount = 0;

    output.nodes.forEach((aiNode, index) => {
      const position = getNodePlacementPosition(index, output.nodes.length, addedNodesCount + 5); 
      const newNodeId = addStoreNode({
        text: aiNode.text,
        type: aiNode.type || 'text-derived-concept',
        details: aiNode.details || '',
        position: position,
      });
      newNodesMap.set(aiNode.text, newNodeId);
      addedNodesCount++;
    });

    if (output.edges) {
      output.edges.forEach(aiEdge => {
        const sourceId = newNodesMap.get(aiEdge.sourceText);
        const targetId = newNodesMap.get(aiEdge.targetText);
        if (sourceId && targetId) {
          addStoreEdge({
            source: sourceId,
            target: targetId,
            label: aiEdge.relationLabel,
          });
        } else {
          console.warn(`Could not create edge for AI snippet relation: "${aiEdge.sourceText}" -> "${aiEdge.targetText}" (${aiEdge.relationLabel}).`);
        }
      });
    }
    toast({ title: "AI Snippet Added", description: `Added ${output.nodes.length} nodes and ${output.edges?.length || 0} edges from text.` });
  }, [isViewOnlyMode, addStoreNode, addStoreEdge, toast, getNodePlacementPosition]);


  const prepareAndOpenAskQuestionModal = useCallback((nodeId: string) => {
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot ask questions in view-only mode.", variant: "default" });
        return;
    }
    const node = storeMapData.nodes.find(n => n.id === nodeId);
    if (node) {
        setNodeContextForQuestion({ text: node.text, details: node.details, id: node.id });
        setIsAskQuestionModalOpen(true);
    } else {
        toast({ title: "Error", description: "Node not found.", variant: "destructive" });
    }
  }, [isViewOnlyMode, storeMapData.nodes, toast]);

  const handleQuestionAnswered = useCallback((answer: string) => {
    toast({
        title: "AI Answer Received",
        description: answer.length > 150 ? `${answer.substring(0, 147)}... (See console for full answer)` : answer,
        duration: 7000,
    });
    console.log("AI Answer for node", nodeContextForQuestion?.id, ":\n", answer);
    setNodeContextForQuestion(null); 
  }, [toast, nodeContextForQuestion]);


  const onTogglePropertiesInspector = useCallback(() => setIsPropertiesInspectorOpen(prev => !prev), []);
  const onToggleAiPanel = useCallback(() => setIsAiPanelOpen(prev => !prev), []);

  let mapForInspector: ConceptMap | null = (storeMapId && storeMapId !== 'new' && currentMapOwnerId) ? {
    id: storeMapId, name: mapName, ownerId: currentMapOwnerId,
    mapData: storeMapData, isPublic: isPublic, sharedWithClassroomId: sharedWithClassroomId,
    createdAt: currentMapCreatedAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  } : null;

  if ((isNewMapMode || storeMapId === 'new') && !mapForInspector && user) {
      mapForInspector = {
        id: 'new', name: mapName, ownerId: user.id,
        mapData: storeMapData, isPublic: isPublic, sharedWithClassroomId: sharedWithClassroomId,
        createdAt: currentMapCreatedAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
  }


  let actualSelectedElementForInspector: ConceptMapNode | ConceptMapEdge | null = null;
  if (selectedElementId && selectedElementType) {
    if (selectedElementType === 'node') actualSelectedElementForInspector = storeMapData.nodes.find(n => n.id === selectedElementId) || null;
    else if (selectedElementType === 'edge') actualSelectedElementForInspector = storeMapData.edges.find(e => e.id === selectedElementId) || null;
  }

  const canAddEdge = storeMapData.nodes.length >= 2;

  const handleNewMap = useCallback(() => {
    router.push('/application/concept-maps/editor/new');
  }, [router]);

  const handleExportMap = useCallback(() => {
    const currentMapData = useConceptMapStore.getState().mapData;
    const currentMapName = useConceptMapStore.getState().mapName || 'concept-map';
    const filename = `${currentMapName.replace(/\s+/g, '_').toLowerCase()}.json`;
    
    try {
      const jsonStr = JSON.stringify(currentMapData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Map Exported", description: `Saved as ${filename}` });
    } catch (error) {
      console.error("Error exporting map:", error);
      toast({ title: "Export Failed", description: "Could not serialize map data for export.", variant: "destructive" });
    }
  }, [toast]);

  const handleTriggerImport = useCallback(() => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot import map in view-only mode.", variant: "default"});
      return;
    }
    fileInputRef.current?.click();
  }, [isViewOnlyMode, toast]);

  const handleFileSelectedForImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/json") {
      toast({ title: "Import Error", description: "Invalid file type. Please select a JSON file.", variant: "destructive" });
      if(fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("Failed to read file content.");
        }
        const importedJson = JSON.parse(text);

        if (typeof importedJson === 'object' && importedJson !== null && Array.isArray(importedJson.nodes) && Array.isArray(importedJson.edges)) {
          const importedMapData = importedJson as ConceptMapData;
          const mapNameFromFileName = file.name.replace(/\.json$/i, '');
          importMapData(importedMapData, `Imported: ${mapNameFromFileName}`);
          clearTemporalHistory(); 
          toast({ title: "Map Imported", description: `"${file.name}" loaded successfully. Remember to save if you want to keep it.` });
        } else {
          throw new Error("Invalid JSON structure. Expected 'nodes' and 'edges' arrays.");
        }
      } catch (error) {
        toast({ title: "Import Failed", description: `Error parsing JSON file: ${(error as Error).message}`, variant: "destructive" });
      } finally {
        if(fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({ title: "Import Error", description: "Failed to read the file.", variant: "destructive" });
      if(fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }, [isViewOnlyMode, toast, importMapData, clearTemporalHistory]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    event.preventDefault();
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Context menu actions are disabled.", variant: "default" });
        return;
    }
    setContextMenu({
      isOpen: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  }, [isViewOnlyMode, toast]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteNodeFromContextMenu = useCallback((nodeId: string) => {
    if (isViewOnlyMode) return;
    deleteStoreNode(nodeId);
    toast({ title: "Node Deleted", description: "The node has been removed from the map." });
    closeContextMenu();
  }, [isViewOnlyMode, deleteStoreNode, toast, closeContextMenu]);

  const handleExpandFromContextMenu = useCallback((nodeId: string) => {
    if (isViewOnlyMode) return;
    prepareAndOpenExpandConceptModal(nodeId);
    closeContextMenu();
  }, [isViewOnlyMode, prepareAndOpenExpandConceptModal, closeContextMenu]);

  const handleSuggestRelationsFromContextMenu = useCallback((nodeId: string) => {
    if (isViewOnlyMode) return;
    prepareAndOpenSuggestRelationsModal(nodeId);
    closeContextMenu();
  }, [isViewOnlyMode, prepareAndOpenSuggestRelationsModal, closeContextMenu]);

  const handleExtractConceptsFromContextMenu = useCallback((nodeId: string) => { 
    if (isViewOnlyMode) return;
    prepareAndOpenExtractConceptsModal(nodeId);
    closeContextMenu();
  }, [isViewOnlyMode, prepareAndOpenExtractConceptsModal, closeContextMenu]);

  const handleAskQuestionFromContextMenu = useCallback((nodeId: string) => {
    if (isViewOnlyMode) return;
    prepareAndOpenAskQuestionModal(nodeId);
    closeContextMenu();
  }, [isViewOnlyMode, prepareAndOpenAskQuestionModal, closeContextMenu]);


  const handleSelectedElementPropertyUpdateInspector = useCallback((
    inspectorUpdates: any
  ) => {
    if (isViewOnlyMode || !selectedElementId || !selectedElementType ) return;

    if (selectedElementType === 'node') {
      const nodeUpdates: Partial<ConceptMapNode> = {};
      if (inspectorUpdates.text !== undefined) nodeUpdates.text = inspectorUpdates.text;
      if (inspectorUpdates.details !== undefined) nodeUpdates.details = inspectorUpdates.details;
      if (inspectorUpdates.type !== undefined) nodeUpdates.type = inspectorUpdates.type;
      updateStoreNode(selectedElementId, nodeUpdates);
    } else if (selectedElementType === 'edge') {
      const edgeUpdates: Partial<ConceptMapEdge> = {};
      if (inspectorUpdates.label !== undefined) edgeUpdates.label = inspectorUpdates.label;
      updateStoreEdge(selectedElementId, edgeUpdates);
    }
  }, [isViewOnlyMode, selectedElementId, selectedElementType, updateStoreNode, updateStoreEdge]);


  if (isStoreLoading && !storeError) {
    return (
      <div className="flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Loading Concept Map...</p>
      </div>
    );
  }

  if (storeError) {
    return (
      <div className="flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col items-center justify-center p-4">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Map</h2>
        <p className="text-muted-foreground mb-4 text-center">{storeError}</p>
        <Button asChild variant="outline">
          <Link href={getBackLink()}> <ArrowLeft className="mr-2 h-4 w-4" /> {getBackButtonText()} </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col">
      <input
        type="file"
        accept=".json"
        ref={fileInputRef}
        onChange={handleFileSelectedForImport}
        style={{ display: 'none' }}
        disabled={isViewOnlyMode}
      />
      <DashboardHeader
        title={isViewOnlyMode ? `Viewing: ${mapName}` : mapName}
        description={isViewOnlyMode ? "This map is in view-only mode." : "Create, edit, and visualize your ideas."}
        icon={(isNewMapMode || storeMapId === 'new') ? Compass : Share2}
        iconLinkHref={getRoleBasedDashboardLink()}
      >
        {!isViewOnlyMode && (
          <Button onClick={handleSaveMap} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Map"}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={getBackLink()}> <ArrowLeft className="mr-2 h-4 w-4" /> {getBackButtonText()} </Link>
        </Button>
      </DashboardHeader>

      <ReactFlowProvider>
        <EditorToolbar
          onNewMap={handleNewMap}
          onSaveMap={handleSaveMap} isSaving={isSaving}
          onExportMap={handleExportMap}
          onTriggerImport={handleTriggerImport}
          onExtractConcepts={() => prepareAndOpenExtractConceptsModal()} 
          onSuggestRelations={() => prepareAndOpenSuggestRelationsModal()}
          onExpandConcept={() => prepareAndOpenExpandConceptModal()}
          onQuickCluster={handleOpenQuickClusterModal} 
          onGenerateSnippetFromText={handleOpenGenerateSnippetModal} 
          isViewOnlyMode={isViewOnlyMode}
          onAddNodeToData={handleAddNodeToData} onAddEdgeToData={handleAddAddEdgeToData} canAddEdge={canAddEdge}
          onToggleProperties={onTogglePropertiesInspector}
          onToggleAiPanel={onToggleAiPanel}
          isPropertiesPanelOpen={isPropertiesInspectorOpen}
          isAiPanelOpen={isAiPanelOpen}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        <div className="flex-grow relative overflow-hidden">
            <FlowCanvasCore
              mapDataFromStore={storeMapData}
              isViewOnlyMode={isViewOnlyMode}
              onSelectionChange={handleFlowSelectionChange}
              onMultiNodeSelectionChange={handleMultiNodeSelectionChange} 
              onNodesChangeInStore={updateStoreNode} 
              onNodesDeleteInStore={deleteStoreNode}
              onEdgesDeleteInStore={deleteStoreEdge}
              onConnectInStore={addStoreEdge}
              onNodeContextMenu={handleNodeContextMenu} 
              onNodeDragStop={ (event, node) => {
                  if (!isViewOnlyMode && node.position) {
                      updateStoreNode(node.id, { x: node.position.x, y: node.position.y });
                  }
                }
              }
            />
        </div>

        {contextMenu && contextMenu.isOpen && contextMenu.nodeId && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onClose={closeContextMenu}
            onDeleteNode={handleDeleteNodeFromContextMenu}
            onExpandConcept={handleExpandFromContextMenu}
            onSuggestRelations={handleSuggestRelationsFromContextMenu}
            onExtractConcepts={handleExtractConceptsFromContextMenu} 
            onAskQuestion={handleAskQuestionFromContextMenu}
            isViewOnlyMode={isViewOnlyMode}
          />
        )}

        <Sheet open={isPropertiesInspectorOpen} onOpenChange={setIsPropertiesInspectorOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Map &amp; Element Properties</SheetTitle>
              <SheetDescription>
                {isViewOnlyMode ? "Viewing properties. Editing is disabled." : "Edit map or selected element properties."}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <PropertiesInspector
                currentMap={mapForInspector}
                onMapPropertiesChange={handleMapPropertiesChange}
                selectedElement={actualSelectedElementForInspector}
                selectedElementType={selectedElementType}
                onSelectedElementPropertyUpdate={handleSelectedElementPropertyUpdateInspector}
                isNewMapMode={isNewMapMode}
                isViewOnlyMode={isViewOnlyMode}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
          <SheetContent side="bottom" className="h-[40vh] sm:h-1/3">
            <SheetHeader>
              <SheetTitle>AI Suggestions</SheetTitle>
              <SheetDescription>
                View and add AI-generated suggestions to your map.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 h-[calc(100%-4rem)]"> 
              <AISuggestionPanel
                currentMapNodes={storeMapData.nodes}
                extractedConcepts={aiExtractedConcepts}
                suggestedRelations={aiSuggestedRelations}
                expandedConcepts={aiExpandedConcepts}
                onAddExtractedConcepts={addSelectedExtractedConceptsToMap}
                onAddSuggestedRelations={addSelectedSuggestedRelationsToMap}
                onAddExpandedConcepts={addSelectedExpandedConceptsToMap}
                onClearExtractedConcepts={() => setStoreAiExtractedConcepts([])}
                onClearSuggestedRelations={() => setStoreAiSuggestedRelations([])}
                onClearExpandedConcepts={() => setStoreAiExpandedConcepts([])}
                isViewOnlyMode={isViewOnlyMode}
              />
            </div>
          </SheetContent>
        </Sheet>

        {isExtractConceptsModalOpen && !isViewOnlyMode && (
          <ExtractConceptsModal 
            initialText={textForExtraction} 
            onConceptsExtracted={handleConceptsExtracted} 
            onOpenChange={setIsExtractConceptsModalOpen}
          />
        )}
        {isSuggestRelationsModalOpen && !isViewOnlyMode && (
          <SuggestRelationsModal 
            onRelationsSuggested={handleRelationsSuggested} 
            initialConcepts={conceptsForRelationSuggestion} 
            onOpenChange={setIsSuggestRelationsModalOpen}
          />
        )}
        {isExpandConceptModalOpen && !isViewOnlyMode && (
          <ExpandConceptModal 
            onConceptExpanded={handleConceptExpanded} 
            initialConcept={conceptToExpand} 
            existingMapContext={mapContextForExpansion} 
            onOpenChange={setIsExpandConceptModalOpen}
          />
        )}
        {isQuickClusterModalOpen && !isViewOnlyMode && ( 
          <QuickClusterModal
            isOpen={isQuickClusterModalOpen}
            onOpenChange={setIsQuickClusterModalOpen}
            onClusterGenerated={handleClusterGenerated}
          />
        )}
        {isGenerateSnippetModalOpen && !isViewOnlyMode && ( 
            <GenerateSnippetModal
                isOpen={isGenerateSnippetModalOpen}
                onOpenChange={setIsGenerateSnippetModalOpen}
                onSnippetGenerated={handleSnippetGenerated}
            />
        )}
        {isAskQuestionModalOpen && !isViewOnlyMode && nodeContextForQuestion && (
          <AskQuestionModal
            nodeContext={nodeContextForQuestion}
            onQuestionAnswered={handleQuestionAnswered}
            onOpenChange={setIsAskQuestionModalOpen}
          />
        )}
      </ReactFlowProvider>
    </div>
  );
}

