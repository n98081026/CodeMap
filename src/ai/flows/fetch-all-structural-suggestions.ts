import { defineFlow } from '@genkit-ai/flow';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import {
  AllStructuralSuggestionsSchema,
  StructuralSuggestionItemSchema,
  AddEdgeDataSchema,
  NewIntermediateNodeDataSchema,
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
import {
  suggestNodeGroupCandidatesFlow,
  NodeGroupSuggestionSchema,
} from './suggest-node-group-candidates';

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
      const improvementSuggestion =
        await suggestMapImprovementFlow.run(mapData);
      if (improvementSuggestion) {
        let validatedData: any;
        // Validate and parse the data based on the type
        if (improvementSuggestion.type === 'ADD_EDGE') {
          validatedData = AddEdgeDataSchema.parse(improvementSuggestion.data);
        } else if (improvementSuggestion.type === 'NEW_INTERMEDIATE_NODE') {
          // Ensure field names match before parsing
          const intermediateData = {
            ...improvementSuggestion.data,
            // newNodeText: improvementSuggestion.data.intermediateNodeText, // if there's a mismatch
          };
          validatedData = NewIntermediateNodeDataSchema.parse(intermediateData);
        } else if (improvementSuggestion.type === 'FORM_GROUP') {
          validatedData = FormGroupDataSchema.parse(improvementSuggestion.data);
        } else {
          // Should not happen if MapImprovementSuggestionSchema is correctly defined and followed
          console.warn(
            `Unknown suggestion type from suggestMapImprovementFlow: ${improvementSuggestion.type}`
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
      const groupCandidate = await suggestNodeGroupCandidatesFlow.run(mapData);
      if (
        groupCandidate &&
        groupCandidate.nodeIdsToGroup &&
        groupCandidate.suggestedParentName
      ) {
        const isDuplicateGroupSuggestion = suggestionsList.some(
          (s) =>
            s.type === 'FORM_GROUP' &&
            s.data &&
            Array.isArray((s.data as any).nodeIdsToGroup) && // Added type assertion for data
            JSON.stringify((s.data as any).nodeIdsToGroup.slice().sort()) ===
              JSON.stringify(groupCandidate.nodeIdsToGroup.slice().sort())
        );

        if (!isDuplicateGroupSuggestion) {
          const groupData = FormGroupDataSchema.parse({
            nodeIdsToGroup: groupCandidate.nodeIdsToGroup,
            suggestedParentName: groupCandidate.suggestedParentName,
          });
          suggestionsList.push({
            id: uuidv4(),
            type: 'FORM_GROUP',
            data: groupData,
            reason: groupCandidate.reason,
            status: 'pending',
          });
        }
      }
    } catch (error) {
      console.error('Error running suggestNodeGroupCandidatesFlow:', error);
    }

    // 3. Call suggestGraphologyEnhancedEdgeFlow
    try {
      const enhancedEdgeResult =
        await suggestGraphologyEnhancedEdgeFlow.run(mapData);
      if (enhancedEdgeResult && enhancedEdgeResult.type === 'ADD_EDGE') {
        const isDuplicateEdge = suggestionsList.some(
          (s) =>
            s.type === 'ADD_EDGE' &&
            (s.data as any).sourceNodeId ===
              enhancedEdgeResult.data.sourceNodeId &&
            (s.data as any).targetNodeId ===
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
      const intermediateNodeSuggestion =
        await suggestGraphologyIntermediateNodeFlow.run(mapData);
      if (
        intermediateNodeSuggestion &&
        intermediateNodeSuggestion.type === 'NEW_INTERMEDIATE_NODE'
      ) {
        // Parse with the schema from suggest-map-improvement which includes originalEdgeId
        const parsedData = MapImprovementNewIntermediateNodeDataSchema.parse(
          intermediateNodeSuggestion.data
        );

        let isDuplicateIntermediate = false;
        if (parsedData.originalEdgeId) {
          isDuplicateIntermediate = suggestionsList.some(
            (s) =>
              s.type === 'NEW_INTERMEDIATE_NODE' &&
              (s.data as any).originalEdgeId === parsedData.originalEdgeId
          );
        } else {
          // Fallback if no originalEdgeId: check source/target
          isDuplicateIntermediate = suggestionsList.some(
            (s) =>
              s.type === 'NEW_INTERMEDIATE_NODE' &&
              (s.data as any).sourceNodeId === parsedData.sourceNodeId &&
              (s.data as any).targetNodeId === parsedData.targetNodeId
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
    return AllStructuralSuggestionsSchema.parse(suggestionsList);
  }
);
