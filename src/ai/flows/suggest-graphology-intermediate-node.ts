// src/ai/flows/suggest-graphology-intermediate-node.ts
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { gemini10Pro } from '@genkit-ai/googleai'; // Or your preferred model
import { z } from 'zod';

import {
  graphologyInterCommunityEdgeTool,
  InterCommunityEdgeInputSchema,
  CandidateLocationSchema,
} from '../tools/graphology-inter-community-edge-tool'; // Assumes index.ts exports these

import { generate } from '@genkit-ai/ai';
import {
  MapDataSchema,
  MapImprovementSuggestionSchema,
  NewIntermediateNodeDataSchema,
} from '../../types/suggestion-types';

// Schema for the LLM's validation and intermediate node text suggestion response
const LlmIntermediateNodeResponseSchema = z.object({
  isValidSuggestion: z
    .boolean()
    .describe(
      'Whether inserting an intermediate node based on the suggested text is a good idea.'
    ),
  newNodeText: z
    .string()
    .nullable()
    .describe(
      'The concise text/label for the new intermediate node if valid; otherwise null.'
    ),
  reason: z
    .string()
    .nullable()
    .describe(
      'Reason for why this intermediate node (and text) would be a good addition, or why not.'
    ),
});

// Define a schema for the prompt input, for clarity with Genkit's structured prompts
const SuggestIntermediateNodeContentPromptInputSchema = z.object({
  sourceNodeId: z.string(),
  sourceNodeText: z.string(),
  sourceNodeDetails: z.string().optional(),
  targetNodeId: z.string(),
  targetNodeText: z.string(),
  targetNodeDetails: z.string().optional(),
  sourceCommunityId: z.number(),
  targetCommunityId: z.number(),
});

const suggestGraphologyIntermediateNode = async (
  mapData: z.infer<typeof MapDataSchema>
) => {
  try {
    // Step 1: Call graphologyInterCommunityEdgeTool
    // The input for this tool is MapDataSchema, which matches the flow's input.
    const toolResult = await runFlow(graphologyInterCommunityEdgeTool, mapData,);

    if (
      toolResult.error ||
      !toolResult.candidateLocations ||
      toolResult.candidateLocations.length === 0
    ) {
      console.log(
        '[SuggestIntermediateNodeFlow] No candidate inter-community edges found or error occurred:',
        toolResult.error
      );
      return null;
    }

    // Process the first candidate location for now
    const candidateLocation = toolResult.candidateLocations[0];

    // Step 2: Prepare data for LLM prompt
    const sourceNode = mapData.nodes.find(
      (n) => n.id === candidateLocation.sourceNodeId
    );
    const targetNode = mapData.nodes.find(
      (n) => n.id === candidateLocation.targetNodeId
    );

    if (!sourceNode || !targetNode) {
      console.error(
        '[SuggestIntermediateNodeFlow] Source or target node not found for candidate location.'
      );
      return null;
    }

    const promptInput = {
      sourceNodeId: sourceNode.id,
      sourceNodeText: sourceNode.text,
      sourceNodeDetails: sourceNode.details || '',
      targetNodeId: targetNode.id,
      targetNodeText: targetNode.text,
      targetNodeDetails: targetNode.details || '',
      sourceCommunityId: candidateLocation.sourceCommunityId,
      targetCommunityId: candidateLocation.targetCommunityId,
    };

    // Step 3: Define the LLM prompt text
    const suggestIntermediateNodeContentPromptText = `
        You are an expert concept map analyst. An edge has been identified connecting two distinct conceptual communities/clusters.
        This edge is between 'Source Node' (from community ${promptInput.sourceCommunityId}) and 'Target Node' (from community ${promptInput.targetCommunityId}).
        We are considering inserting an intermediate node along this edge to clarify or bridge the relationship.

        Source Node:
        ID: ${promptInput.sourceNodeId}
        Text: "${promptInput.sourceNodeText}"
        Details: "${promptInput.sourceNodeDetails}"

        Target Node:
        ID: ${promptInput.targetNodeId}
        Text: "${promptInput.targetNodeText}"
        Details: "${promptInput.targetNodeDetails}"

        Please perform the following:
        1. Suggest a concise concept, process, or relationship that could act as a meaningful intermediate step or bridge between 'Source Node' and 'Target Node'. This will be the text for the new intermediate node.
        2. Provide a short text label (max 5 words) for this new intermediate node based on your suggestion in step 1.
        3. Evaluate if inserting this specific intermediate node (with your suggested text from step 2) would significantly clarify the map structure (respond true/false for "isValidSuggestion").
        4. Provide a brief reason for why this intermediate node (with your suggested text) would be a good addition, or why it might not be suitable.

        Output a single, well-formed JSON object with the following exact keys:
        - "isValidSuggestion": boolean
        - "newNodeText": string (the suggested label from step 2, or null if not a valid suggestion)
        - "reason": string (your reasoning from step 4, or null)
      `;

    // Step 4: Call LLM
    const llmResponse = await generate({
      model: gemini10Pro,
      prompt: suggestIntermediateNodeContentPromptText,
      output: {
        format: 'json',
        schema: LlmIntermediateNodeResponseSchema,
      },
      config: { temperature: 0.5 },
    });

    const validationResult = llmResponse.output();

    if (!validationResult) {
      console.warn(
        '[SuggestIntermediateNodeFlow] LLM did not return valid output for intermediate node suggestion.'
      );
      return null;
    }

    // Step 5: Construct Flow Output
    if (validationResult.isValidSuggestion && validationResult.newNodeText) {
      // Prepare data matching the NEW_INTERMEDIATE_NODE variant of MapImprovementSuggestionSchema
      // The NewIntermediateNodeDataSchema expects:
      // sourceNodeId, targetNodeId, intermediateNodeText, labelToIntermediate, labelFromIntermediate
      // We need to ask LLM for labels for the new edges or use defaults.
      // For now, let's use default labels. A more advanced prompt could ask for these.
      const intermediateSuggestionData: z.infer<
        typeof NewIntermediateNodeDataSchema
      > = {
        sourceNodeId: candidateLocation.sourceNodeId,
        targetNodeId: candidateLocation.targetNodeId,
        intermediateNodeText: validationResult.newNodeText,
        // Using default labels for now. Prompt could be enhanced to ask LLM for these.
        labelToIntermediate: 'leads to',
        labelFromIntermediate: 'related to',
        // originalEdgeId: candidateLocation.originalEdgeId, // This field is not in NewIntermediateNodeDataSchema from suggest-map-improvement
      };

      const finalSuggestion = {
        type: 'NEW_INTERMEDIATE_NODE' as const,
        data: intermediateSuggestionData,
        reason: validationResult.reason || undefined,
      };

      // Validate against the main output schema for the flow
      return MapImprovementSuggestionSchema.parse(finalSuggestion);
    } else {
      console.log(
        `[SuggestIntermediateNodeFlow] LLM deemed intermediate node not valid. Reason: ${validationResult.reason}`
      );
      return null;
    }
  } catch (e: unknown) {
    console.error('Error in suggestGraphologyIntermediateNodeFlow:', e);
    return null;
  }
};

export const suggestGraphologyIntermediateNodeFlow = defineFlow(
  {
    name: 'suggestGraphologyIntermediateNodeFlow',
    inputSchema: MapDataSchema, // Takes the whole map as input
    outputSchema: MapImprovementSuggestionSchema.nullable(), // Outputs one NEW_INTERMEDIATE_NODE suggestion or null
  },
  suggestGraphologyIntermediateNode
);
