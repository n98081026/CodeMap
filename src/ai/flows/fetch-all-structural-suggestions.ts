import { defineFlow, runFlow } from '@genkit-ai/flow';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import {
  AllStructuralSuggestionsSchema,
  StructuralSuggestionItemSchema,
  AddEdgeDataSchema,
  NewIntermediateNodeDataSchema as AISuggestionsNewIntermediateNodeDataSchema,
  FormGroupDataSchema,
} from '../../types/ai-suggestions';

import { suggestGraphologyEnhancedEdgeFlow } from './suggest-graphology-enhanced-edge';
import { suggestGraphologyIntermediateNodeFlow } from './suggest-graphology-intermediate-node'; // Added new flow
import {
  suggestMapImprovementFlow,
  MapImprovementSuggestionSchema,
} from './suggest-map-improvement';
import {
  MapDataSchema,
  NewIntermediateNodeDataSchema as MapImprovementNewIntermediateNodeDataSchema,
} from './suggest-map-improvement'; // Import specific schema for parsing
import { suggestNodeGroupCandidatesFlow } from './suggest-node-group-candidates';
import { NodeGroupSuggestionSchema } from './schemas';

export const fetchAllStructuralSuggestionsFlow = defineFlow(
  {
    name: 'fetchAllStructuralSuggestions',
    inputSchema: MapDataSchema,
    outputSchema: AllStructuralSuggestionsSchema,
  },
  async (mapData) => {
    const suggestionsList: z.infer<typeof StructuralSuggestionItemSchema>[] =
      [];

    // 1. Call suggestMapImprovementFlow
    try {
      const mapDataWithCoords = {
        ...mapData,
        nodes: mapData.nodes.map(node => ({ ...node, x: 0, y: 0 })),
      };
      const improvementSuggestion = await runFlow(
        suggestMapImprovementFlow,
        mapDataWithCoords
      );
      if (improvementSuggestion) {
        let validatedData: z.infer<typeof AddEdgeDataSchema> | z.infer<typeof AISuggestionsNewIntermediateNodeDataSchema> | z.infer<typeof FormGroupDataSchema>;
        // Validate and parse the data based on the type
        if (improvementSuggestion.type === 'ADD_EDGE') {
          validatedData = AddEdgeDataSchema.parse(improvementSuggestion.data);
        } else if (improvementSuggestion.type === 'NEW_INTERMEDIATE_NODE') {
          // Ensure field names match before parsing
          const intermediateData = {
            ...improvementSuggestion.data,
            // newNodeText: improvementSuggestion.data.intermediateNodeText, // if there's a mismatch
          };
          validatedData = AISuggestionsNewIntermediateNodeDataSchema.parse(intermediateData);
        } else if (improvementSuggestion.type === 'FORM_GROUP') {
          validatedData = FormGroupDataSchema.parse(improvementSuggestion.data);
        } else {
          // Should not happen if MapImprovementSuggestionSchema is correctly defined and followed
          console.warn(
            `Unknown suggestion type from suggestMapImprovementFlow: ${
              improvementSuggestion.type
            }`
          );
          return suggestionsList; // Or handle error appropriately
        }

        suggestionsList.push({
          id: uuidv4(),
          type: improvementSuggestion.type as
            | 'ADD_EDGE'
            | 'NEW_INTERMEDIATE_NODE'
            | 'FORM_GROUP',
          data: validatedData,
          reason: improvementSuggestion.reason,
          status: 'pending',
        });
      }
    } catch (error) {
      console.error('Error running suggestMapImprovementFlow:', error);
      // Decide if you want to stop or continue if one flow fails
    }

    // 2. Call suggestNodeGroupCandidatesFlow
    try {
      const groupCandidate = await runFlow(
        suggestNodeGroupCandidatesFlow,
        mapData
      );
      if (groupCandidate && groupCandidate.suggestedGroups) {
        groupCandidate.suggestedGroups.forEach((group) => {
          const isDuplicateGroupSuggestion = suggestionsList.some(
            (s) =>
              s.type === 'FORM_GROUP' &&
              s.data &&
              Array.isArray((s.data as Record<string, unknown>).nodeIds) && // Changed from nodeIdsToGroup
              JSON.stringify(((s.data as Record<string, unknown>).nodeIds as string[]).slice().sort()) ===
                JSON.stringify(group.nodeIds.slice().sort())
          );

          if (!isDuplicateGroupSuggestion) {
            const groupData = FormGroupDataSchema.parse({
              nodeIds: group.nodeIds, // Changed from nodeIdsToGroup
              groupLabel: group.groupLabel, // Changed from suggestedParentName
            });
            suggestionsList.push({
              id: uuidv4(),
              type: 'FORM_GROUP',
              data: groupData,
              reason: group.reason,
              status: 'pending',
            });
          }
        });
      }
    } catch (error) {
      console.error('Error running suggestNodeGroupCandidatesFlow:', error);
    }

    // 3. Call suggestGraphologyEnhancedEdgeFlow
    try {
      const enhancedEdgeResult = await runFlow(
        suggestGraphologyEnhancedEdgeFlow,
        mapData
      );
      if (enhancedEdgeResult && enhancedEdgeResult.type === 'ADD_EDGE') {
        const isDuplicateEdge = suggestionsList.some(
          (s) =>
            s.type === 'ADD_EDGE' &&
            (s.data as Record<string, unknown>).sourceNodeId ===
              enhancedEdgeResult.data.sourceNodeId &&
            (s.data as Record<string, unknown>).targetNodeId ===
              enhancedEdgeResult.data.targetNodeId
        );
        if (!isDuplicateEdge) {
          const validatedEdgeData = AddEdgeDataSchema.parse(
            enhancedEdgeResult.data
          );
          suggestionsList.push({
            id: uuidv4(),
            type: 'ADD_EDGE',
            data: validatedEdgeData,
            reason: enhancedEdgeResult.reason,
            status: 'pending',
          });
        }
      }
    } catch (error) {
      console.error('Error running suggestGraphologyEnhancedEdgeFlow:', error);
    }

    // 4. Call suggestGraphologyIntermediateNodeFlow
    try {
      const intermediateNodeSuggestion = await runFlow(
        suggestGraphologyIntermediateNodeFlow,
        mapData
      );
      if (
        intermediateNodeSuggestion &&
        intermediateNodeSuggestion.type === 'NEW_INTERMEDIATE_NODE'
      ) {
        // Parse with the schema from suggest-map-improvement which includes originalEdgeId
        const parsedData = MapImprovementNewIntermediateNodeDataSchema.parse(
          intermediateNodeSuggestion.data
        );

        let isDuplicateIntermediate = false;
        if ('originalEdgeId' in parsedData && parsedData.originalEdgeId) {
          isDuplicateIntermediate = suggestionsList.some(
            (s) =>
              s.type === 'NEW_INTERMEDIATE_NODE' &&
              (s.data as Record<string, unknown>).originalEdgeId === parsedData.originalEdgeId
          );
        } else {
          // Fallback if no originalEdgeId: check source/target
          isDuplicateIntermediate = suggestionsList.some(
            (s) =>
              s.type === 'NEW_INTERMEDIATE_NODE' &&
              (s.data as Record<string, unknown>).sourceNodeId === parsedData.sourceNodeId &&
              (s.data as Record<string, unknown>).targetNodeId === parsedData.targetNodeId
          );
        }

        if (!isDuplicateIntermediate) {
          suggestionsList.push({
            id: uuidv4(),
            type: 'NEW_INTERMEDIATE_NODE',
            data: parsedData, // Use the parsed data which includes originalEdgeId
            reason: intermediateNodeSuggestion.reason,
            status: 'pending',
          });
        }
      }
    } catch (error) {
      console.error(
        'Error running suggestGraphologyIntermediateNodeFlow:',
        error
      );
    }

    // Ensure the final list conforms to the output schema
    const result = AllStructuralSuggestionsSchema.parse(suggestionsList);
    return result;
  }
);
