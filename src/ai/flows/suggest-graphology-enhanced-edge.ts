// src/ai/flows/suggest-graphology-enhanced-edge.ts
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini10Pro } from '@genkit-ai/googleai'; // Or your preferred model
import { z } from 'zod';

import {
  graphologySharedNeighborsEdgeTool,
  SharedNeighborsEdgeInputSchema,
} from '../tools'; // Assumes index.ts exports these

import {
  MapDataSchema,
  MapImprovementSuggestionSchema,
} from './suggest-map-improvement'; // For input and output structure

// Schema for the LLM's validation and labeling response
const LlmEdgeValidationResponseSchema = z.object({
  isSensible: z
    .boolean()
    .describe(
      'Whether adding a direct edge between the nodes makes semantic sense.'
    ),
  suggestedLabel: z
    .string()
    .nullable()
    .describe(
      'A concise, descriptive, action-oriented label if the edge is sensible; otherwise null.'
    ),
  reason: z
    .string()
    .nullable()
    .describe(
      "Reason for the edge being sensible and the label choice, or why it's not sensible."
    ),
});

// Define a schema for the prompt input, if using structured prompts with Genkit
const ValidateAndLabelEdgePromptInputSchema = z.object({
  sourceNodeId: z.string(),
  sourceNodeText: z.string(),
  sourceNodeDetails: z.string().optional(),
  targetNodeId: z.string(),
  targetNodeText: z.string(),
  targetNodeDetails: z.string().optional(),
  sharedNodesDetails: z.string(),
  jaccardIndex: z.number(),
});

const suggestGraphologyEnhancedEdge = async (
  mapData: z.infer<typeof MapDataSchema>
) => {
  try {
    // Step 1: Call graphologySharedNeighborsEdgeTool
    const toolInput: z.infer<typeof SharedNeighborsEdgeInputSchema> = {
      ...mapData,
      jaccardThreshold: 0.25, // Example threshold, could be configurable
      maxCandidates: 1, // We only want the top candidate for LLM validation
    };
    const toolResult = await runFlow(
      graphologySharedNeighborsEdgeTool,
      toolInput,
    );

    if (
      !toolResult ||
      !toolResult.candidateEdges ||
      toolResult.candidateEdges.length === 0
    ) {
      console.log(
        '[SuggestEdgeFlow] No candidate edges from graphology tool or error:',
        toolResult.error
      );
      return null;
    }

    const topCandidate = toolResult.candidateEdges[0];

    // Step 2: Prepare data for LLM prompt
    const sourceNode = mapData.nodes.find(
      (n) => n.id === topCandidate.sourceNodeId
    );
    const targetNode = mapData.nodes.find(
      (n) => n.id === topCandidate.targetNodeId
    );

    if (!sourceNode || !targetNode) {
      console.error(
        '[SuggestEdgeFlow] Source or target node not found for top candidate.'
      );
      return null;
    }

    const sharedNodesDetails = topCandidate.sharedNeighborIds
      .map((id: string) => mapData.nodes.find((n) => n.id === id)?.text || id)
      .join(', ');

    const promptInput = {
      sourceNodeId: sourceNode.id,
      sourceNodeText: sourceNode.text,
      sourceNodeDetails: sourceNode.details || '',
      targetNodeId: targetNode.id,
      targetNodeText: targetNode.text,
      targetNodeDetails: targetNode.details || '',
      sharedNodesDetails:
        sharedNodesDetails.length > 0 ? sharedNodesDetails : 'none',
      jaccardIndex: topCandidate.jaccardIndex,
    };

    // Step 3: Define the LLM prompt (using Genkit's structured prompt capabilities for clarity)
    // This prompt text is now directly used, no need for a separate ai.definePrompt
    const validateAndLabelEdgePromptText = `
        You are an expert concept map analyst. A graph algorithm has identified a potential edge
        between 'Source Node' and 'Target Node' because they share common neighbors.

        Source Node:
        ID: ${promptInput.sourceNodeId}
        Text: "${promptInput.sourceNodeText}"
        Details: "${promptInput.sourceNodeDetails}"

        Target Node:
        ID: ${promptInput.targetNodeId}
        Text: "${promptInput.targetNodeText}"
        Details: "${promptInput.targetNodeDetails}"

        Shared Neighbors (by text/ID): ${promptInput.sharedNodesDetails}
        Jaccard Index of shared neighbors: ${promptInput.jaccardIndex.toFixed(4)}

        Please perform the following:
        1. Evaluate if adding a direct edge between 'Source Node' and 'Target Node' makes semantic sense given their content and shared connections.
        2. If it makes sense, suggest a concise, descriptive, and action-oriented label for the edge (e.g., 'supports_concept', 'clarifies_details_of', 'depends_on_module'). Avoid generic labels like "connects to" or "related to".
        3. If it makes sense, provide a brief (1-2 sentences) reason why this edge would be a good addition and why the label is appropriate.

        Output a single, well-formed JSON object with the following exact keys:
        - "isSensible": boolean (true if an edge makes sense, false otherwise)
        - "suggestedLabel": string (the label if sensible, otherwise null)
        - "reason": string (your reasoning if sensible, or why not if not sensible; otherwise null)
      `;

    // Step 4: Call LLM for validation and labeling
    const llmResponse = await generate({
      model: gemini10Pro,
      prompt: validateAndLabelEdgePromptText, // Pass the constructed string
      output: {
        format: 'json',
        schema: LlmEdgeValidationResponseSchema,
      },
      config: { temperature: 0.3 },
    });

    const validationResult = llmResponse.output();

    if (!validationResult) {
      console.warn(
        '[SuggestEdgeFlow] LLM did not return valid validation output.'
      );
      return null;
    }

    // Step 5: Construct Flow Output
    if (validationResult.isSensible && validationResult.suggestedLabel) {
      const addEdgeSuggestion = {
        type: 'ADD_EDGE' as const, // Ensure literal type
        data: {
          sourceNodeId: topCandidate.sourceNodeId,
          targetNodeId: topCandidate.targetNodeId,
          label: validationResult.suggestedLabel,
        },
        reason: validationResult.reason || undefined, // Convert null to undefined for optional field
      };
      // Validate against the specific ADD_EDGE part of MapImprovementSuggestionSchema if possible,
      // or ensure the structure matches. MapImprovementSuggestionSchema.parse should handle it.
      return MapImprovementSuggestionSchema.parse(addEdgeSuggestion);
    } else {
      console.log(
        `[SuggestEdgeFlow] LLM deemed edge not sensible for ${topCandidate.sourceNodeId} -> ${topCandidate.targetNodeId}. Reason: ${validationResult.reason}`
      );
      return null;
    }
  } catch (e: unknown) {
    console.error('Error in suggestGraphologyEnhancedEdgeFlow:', e);
    return null; // Return null on error as per output schema
  }
};

export const suggestGraphologyEnhancedEdgeFlow = defineFlow(
  {
    name: 'suggestGraphologyEnhancedEdgeFlow',
    inputSchema: MapDataSchema, // Takes the whole map as input
    outputSchema: MapImprovementSuggestionSchema.nullable(), // Outputs one ADD_EDGE suggestion or null
  },
  suggestGraphologyEnhancedEdge
);
