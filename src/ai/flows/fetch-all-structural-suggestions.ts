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
    const suggestionsList: z.infer<typeof StructuralSuggestionItemSchema>[] = [];

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
        if (improvementSuggestion) {
          const suggestion = improvementSuggestion as z.infer<
            typeof MapImprovementSuggestionSchema
          >;
          if (suggestion) {
            let validatedData:
              | z.infer<typeof AddEdgeDataSchema>
              | z.infer<typeof AISuggestionsNewIntermediateNodeDataSchema>
              | z.infer<typeof FormGroupDataSchema>;
            // Validate and parse the data based on the type
            if (suggestion.type === 'ADD_EDGE') {
              validatedData = AddEdgeDataSchema.parse(suggestion.data);
            } else if (suggestion.type === 'NEW_INTERMEDIATE_NODE') {
              // Ensure field names match before parsing
              const intermediateData = {
                ...suggestion.data,
                // newNodeText: suggestion.data.intermediateNodeText, // if there's a mismatch
              };
              validatedData =
                AISuggestionsNewIntermediateNodeDataSchema.parse(
                  intermediateData
                );
            } else if (suggestion.type === 'FORM_GROUP') {
              validatedData = FormGroupDataSchema.parse(suggestion.data);
            } else {
              // Should not happen if MapImprovementSuggestionSchema is correctly defined and followed
              console.warn(
                `Unknown suggestion type from suggestMapImprovementFlow: ${
                  (suggestion as any).type
                }`
              );
              return suggestionsList; // Or handle error appropriately
            }

            suggestionsList.push({
              id: uuidv4(),
              type: suggestion.type as
                | 'ADD_EDGE'
                | 'NEW_INTERMEDIATE_NODE'
                | 'FORM_GROUP',
              data: validatedData,
              reason: suggestion.reason,
              status: 'pending',
            });
          }
        }
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
        groupCandidate.suggestedGroups.forEach((group: any) => {
          const isDuplicateGroupSuggestion = suggestionsList.some(
            (s) =>
              s.type === 'FORM_GROUP' &&
              s.data &&
              Array.isArray((s.data as Record<string, unknown>).nodeIds) && // Changed from nodeIdsToGroup
              JSON.stringify(
                ((s.data as Record<string, unknown>).nodeIds as string[])
                  .slice()
                  .sort()
              ) === JSON.stringify(group.nodeIds.slice().sort())
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



    // Ensure the final list conforms to the output schema
    return AllStructuralSuggestionsSchema.parse(suggestionsList);
  }
);
