import { z } from 'zustand';
import { create } from 'zustand';
import type { ConceptMapNode, ConceptMapEdge, ConceptMapData } from '@/types';
import { StructuralSuggestionItemSchema } from '@/types/ai-suggestions';
import { useMapDataStore } from './map-data-store';
import { runFlow } from '@/ai/flows';

// Copied from original store, should be defined in a shared types file
const uniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export interface StagedMapDataWithContext {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  actionType?:
    | 'extractConcepts'
    | 'suggestRelations'
    | 'expandConcept'
    | 'intermediateNode'
    | 'summarizeNodes'
    | 'quickCluster'
    | 'generateSnippet'
    | 'aiTidyUpComplete';
  originalElementId?: string;
  originalElementIds?: string[];
}

export interface AISuggestionState {
  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;
  stagedMapData: StagedMapDataWithContext | null;
  isStagingActive: boolean;
  structuralSuggestions: z.infer<typeof StructuralSuggestionItemSchema>[];
  ghostPreviewData: {
    nodes: Array<{
      id: string;
      x: number;
      y: number;
      originalX?: number;
      originalY?: number;
      width?: number;
      height?: number;
    }>;
  } | null;
  isOverviewModeActive: boolean;
  projectOverviewData: {
    overallSummary: string;
    keyModules: { name: string; description: string }[];
    error?: string;
  } | null;
  isFetchingOverview: boolean;

  setAiExtractedConcepts: (concepts: string[]) => void;
  setAiSuggestedRelations: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  resetAiSuggestions: () => void;
  removeExtractedConceptsFromSuggestions: (conceptsToRemove: string[]) => void;
  removeSuggestedRelationsFromSuggestions: (relationsToRemove: Array<{ source: string; target: string; relation: string }>) => void;
  setStagedMapData: (data: StagedMapDataWithContext | null) => void;
  clearStagedMapData: () => void;
  commitStagedMapData: () => void;
  deleteFromStagedMapData: (elementIds: string[]) => void;
  toggleOverviewMode: () => void;
  setProjectOverviewData: (data: AISuggestionState['projectOverviewData']) => void;
  setIsFetchingOverview: (fetching: boolean) => void;
  fetchProjectOverview: (input: { projectStoragePath: string; userGoals: string; }) => Promise<void>;
  setGhostPreview: (nodesToPreview: Array<{ id: string; x: number; y: number; width?: number; height?: number; }>) => void;
  acceptGhostPreview: () => void;
  cancelGhostPreview: () => void;
  setStructuralSuggestions: (suggestions: z.infer<typeof StructuralSuggestionItemSchema>[]) => void;
  addStructuralSuggestion: (suggestion: z.infer<typeof StructuralSuggestionItemSchema>) => void;
  updateStructuralSuggestion: (updatedSuggestion: Partial<z.infer<typeof StructuralSuggestionItemSchema>> & { id: string; }) => void;
  removeStructuralSuggestion: (suggestionId: string) => void;
  clearStructuralSuggestions: () => void;
}

export const useAISuggestionStore = create<AISuggestionState>((set, get) => ({
  aiExtractedConcepts: [],
  aiSuggestedRelations: [],
  stagedMapData: null,
  isStagingActive: false,
  structuralSuggestions: [],
  ghostPreviewData: null,
  isOverviewModeActive: false,
  projectOverviewData: null,
  isFetchingOverview: false,

  setAiExtractedConcepts: (concepts) => set({ aiExtractedConcepts: concepts }),
  setAiSuggestedRelations: (relations) => set({ aiSuggestedRelations: relations }),
  resetAiSuggestions: () => set({ aiExtractedConcepts: [], aiSuggestedRelations: [] }),
  removeExtractedConceptsFromSuggestions: (conceptsToRemove) =>
    set((state) => ({
      aiExtractedConcepts: state.aiExtractedConcepts.filter((concept) => !conceptsToRemove.includes(concept)),
    })),
  removeSuggestedRelationsFromSuggestions: (relationsToRemove) =>
    set((state) => ({
      aiSuggestedRelations: state.aiSuggestedRelations.filter(
        (relation) =>
          !relationsToRemove.some(
            (rtr) =>
              rtr.source === relation.source &&
              rtr.target === relation.target &&
              rtr.relation === relation.relation
          )
      ),
    })),
  setStagedMapData: (data) => set({ stagedMapData: data, isStagingActive: !!data, ghostPreviewData: null }),
  clearStagedMapData: () => set({ stagedMapData: null, isStagingActive: false }),
  commitStagedMapData: () => {
    const stagedData = get().stagedMapData;
    if (!stagedData) return;

    const { addNode, addEdge, deleteEdge } = useMapDataStore.getState();

    if (stagedData.actionType === 'intermediateNode' && stagedData.originalElementId) {
      deleteEdge(stagedData.originalElementId);
    }

    const stagedNodeToPermanentIdMap = new Map<string, string>();
    stagedData.nodes.forEach((node) => {
        const permanentId = addNode(node);
        stagedNodeToPermanentIdMap.set(node.id, permanentId);
    });

    (stagedData.edges || []).forEach((edge) => {
        const sourceId = stagedNodeToPermanentIdMap.get(edge.source) || edge.source;
        const targetId = stagedNodeToPermanentIdMap.get(edge.target) || edge.target;
        addEdge({ ...edge, source: sourceId, target: targetId });
    });

    set({ stagedMapData: null, isStagingActive: false });
  },
  deleteFromStagedMapData: (elementIdsToRemove) => {
    set((state) => {
      const { stagedMapData } = state;
      if (!stagedMapData) return state;

      const elementIdsToRemoveSet = new Set(elementIdsToRemove);
      const newStagedNodes = stagedMapData.nodes.filter((node) => !elementIdsToRemoveSet.has(node.id));
      const remainingStagedNodeIds = new Set(newStagedNodes.map((n) => n.id));

      const newStagedEdges = (stagedMapData.edges || []).filter((edge) => {
        if (elementIdsToRemoveSet.has(edge.id)) return false;
        const isSourceStaged = stagedMapData.nodes.some((n) => n.id === edge.source);
        const isTargetStaged = stagedMapData.nodes.some((n) => n.id === edge.target);
        if (isSourceStaged && !remainingStagedNodeIds.has(edge.source)) return false;
        if (isTargetStaged && !remainingStagedNodeIds.has(edge.target)) return false;
        return true;
      });

      if (newStagedNodes.length === 0 && newStagedEdges.length === 0) {
        return { stagedMapData: null, isStagingActive: false };
      } else {
        return {
          stagedMapData: { ...stagedMapData, nodes: newStagedNodes, edges: newStagedEdges },
          isStagingActive: true,
        };
      }
    });
  },
  toggleOverviewMode: () => set((state) => ({ isOverviewModeActive: !state.isOverviewModeActive })),
  setProjectOverviewData: (data) => set({ projectOverviewData: data, isFetchingOverview: false }),
  setIsFetchingOverview: (fetching) => set({ isFetchingOverview: fetching }),
  fetchProjectOverview: async (input) => {
    if (get().isFetchingOverview) return;
    set({ isFetchingOverview: true, projectOverviewData: null });
    try {
      const overviewData = await runFlow<{ projectPath: string; context: string; }, any>('generateProjectOverview', {
        projectPath: input.projectStoragePath,
        context: input.userGoals,
      });
      set({ projectOverviewData: overviewData, isFetchingOverview: false });
    } catch (e: unknown) {
      set({
        projectOverviewData: {
          overallSummary: 'Failed to generate overview.',
          keyModules: [],
          error: (e as Error).message,
        },
        isFetchingOverview: false,
      });
    }
  },
  setGhostPreview: (nodesToPreview) => {
    const { nodes } = useMapDataStore.getState().mapData;
    const previewNodesWithOriginalData = nodesToPreview.map((previewNode) => {
      const originalNode = nodes.find((n) => n.id === previewNode.id);
      return {
        ...previewNode,
        originalX: originalNode?.x,
        originalY: originalNode?.y,
        width: originalNode?.width || previewNode.width || 150,
        height: originalNode?.height || previewNode.height || 70,
      };
    });
    set({
      ghostPreviewData: { nodes: previewNodesWithOriginalData },
      stagedMapData: null,
      isStagingActive: false,
    });
  },
  acceptGhostPreview: () => {
    const previewData = get().ghostPreviewData;
    if (!previewData) return;
    const updates = previewData.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, }));
    useMapDataStore.getState().applyLayout(updates);
    set({ ghostPreviewData: null });
  },
  cancelGhostPreview: () => set({ ghostPreviewData: null }),
  setStructuralSuggestions: (suggestions) => set({ structuralSuggestions: suggestions }),
  addStructuralSuggestion: (suggestion) =>
    set((state) => ({
      structuralSuggestions: [...state.structuralSuggestions, suggestion],
    })),
  updateStructuralSuggestion: (updatedSuggestion) =>
    set((state) => ({
      structuralSuggestions: state.structuralSuggestions.map((s) =>
        s.id === updatedSuggestion.id
          ? ({ ...s, ...updatedSuggestion } as z.infer<typeof StructuralSuggestionItemSchema>)
          : s
      ),
    })),
  removeStructuralSuggestion: (suggestionId) =>
    set((state) => ({
      structuralSuggestions: state.structuralSuggestions.filter((s) => s.id !== suggestionId),
    })),
  clearStructuralSuggestions: () => set({ structuralSuggestions: [] }),
}));
