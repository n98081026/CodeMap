import { useMemo } from 'react';

import type { CustomNodeData } from '@/components/concept-map/custom-node';
import type { ConceptMapData } from '@/types';
import type { Node as RFNode, Edge as RFEdge } from 'reactflow';

interface UseFlowCanvasDataCombinerProps {
  convertedNodes: RFNode<CustomNodeData>[];
  convertedEdges: RFEdge[];
  stagedMapData: ConceptMapData | null;
  ghostPreviewData: ConceptMapData | null;
  structuralSuggestions: any[];
  isViewOnlyMode?: boolean;
}

export const useFlowCanvasDataCombiner = ({
  convertedNodes,
  convertedEdges,
  stagedMapData,
  ghostPreviewData,
  structuralSuggestions,
  isViewOnlyMode,
}: UseFlowCanvasDataCombinerProps) => {
  // Combine nodes from different sources
  const combinedNodes = useMemo(() => {
    let baseNodes = [...convertedNodes];

    // Add staged nodes
    if (stagedMapData?.nodes) {
      const rfStagedNodes = stagedMapData.nodes.map((node) => ({
        id: node.id,
        type: 'custom',
        position: { x: node.x, y: node.y },
        data: {
          label: node.text,
          details: node.details,
          type: node.type,
          isViewOnly: isViewOnlyMode,
          backgroundColor: node.backgroundColor,
          shape: node.shape,
          width: node.width,
          height: node.height,
          isStaged: true,
        } as CustomNodeData,
        width: node.width,
        height: node.height,
        className: 'staged-node',
      }));
      baseNodes = [...baseNodes, ...rfStagedNodes];
    }

    // Add ghost preview nodes
    if (ghostPreviewData?.nodes) {
      const rfGhostNodes = ghostPreviewData.nodes.map((node) => ({
        id: `ghost-${node.id}`,
        type: 'ghost',
        position: { x: node.x, y: node.y },
        data: {
          label: node.text,
          details: node.details,
          type: node.type,
          isViewOnly: true,
          backgroundColor: node.backgroundColor,
          shape: node.shape,
          width: node.width,
          height: node.height,
          isGhost: true,
        } as CustomNodeData,
        width: node.width,
        height: node.height,
        className: 'ghost-node',
        selectable: false,
        draggable: false,
      }));
      baseNodes = [...baseNodes, ...rfGhostNodes];
    }

    // Add structural suggestion nodes
    if (structuralSuggestions && structuralSuggestions.length > 0) {
      const suggestionNodes = structuralSuggestions
        .filter((suggestion) => suggestion.type === 'groupSuggestion')
        .map((suggestion) => ({
          id: `suggestion-${suggestion.id}`,
          type: 'suggestedGroup',
          position: { x: suggestion.data.x || 0, y: suggestion.data.y || 0 },
          data: {
            suggestion: suggestion.data,
            isViewOnly: isViewOnlyMode,
          },
          className: 'suggestion-node',
          selectable: false,
          draggable: false,
        }));
      baseNodes = [...baseNodes, ...suggestionNodes];
    }

    return baseNodes;
  }, [
    convertedNodes,
    stagedMapData,
    ghostPreviewData,
    structuralSuggestions,
    isViewOnlyMode,
  ]);

  // Combine edges from different sources
  const combinedEdges = useMemo(() => {
    let baseEdges = [...convertedEdges];

    // Add staged edges
    if (stagedMapData?.edges) {
      const rfStagedEdges = stagedMapData.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'orthogonal',
        label: edge.label,
        data: {
          label: edge.label,
          color: edge.color,
          lineType: edge.lineType,
          markerStart: edge.markerStart,
          markerEnd: edge.markerEnd,
          isStaged: true,
        },
        className: 'staged-edge',
      }));
      baseEdges = [...baseEdges, ...rfStagedEdges];
    }

    // Add ghost preview edges
    if (ghostPreviewData?.edges) {
      const rfGhostEdges = ghostPreviewData.edges.map((edge) => ({
        id: `ghost-${edge.id}`,
        source: `ghost-${edge.source}`,
        target: `ghost-${edge.target}`,
        type: 'orthogonal',
        label: edge.label,
        data: {
          label: edge.label,
          color: edge.color,
          lineType: edge.lineType,
          markerStart: edge.markerStart,
          markerEnd: edge.markerEnd,
          isGhost: true,
        },
        className: 'ghost-edge',
        selectable: false,
      }));
      baseEdges = [...baseEdges, ...rfGhostEdges];
    }

    // Add structural suggestion edges
    if (structuralSuggestions && structuralSuggestions.length > 0) {
      const newSuggestionEdges = structuralSuggestions
        .filter((suggestion) => suggestion.type === 'edgeSuggestion')
        .map((suggestion) => ({
          id: `suggestion-edge-${suggestion.id}`,
          source: suggestion.data.source,
          target: suggestion.data.target,
          type: 'suggested',
          label: suggestion.data.label,
          data: {
            suggestion: suggestion.data,
            isViewOnly: isViewOnlyMode,
          },
          className: 'suggestion-edge',
          selectable: false,
        }));
      baseEdges = [...baseEdges, ...newSuggestionEdges];
    }

    return baseEdges;
  }, [
    convertedEdges,
    stagedMapData,
    ghostPreviewData,
    structuralSuggestions,
    isViewOnlyMode,
  ]);

  return {
    combinedNodes,
    combinedEdges,
  };
};
