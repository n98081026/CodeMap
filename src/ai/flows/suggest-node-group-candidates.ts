import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini10Pro } from '@genkit-ai/googleai';
import * as z from 'zod';

import { graphologyCommunityDetectionTool } from '../tools'; // Adjusted import path assuming tools/index.ts exports it

// Input Schema: Current map data (remains the same)
export const MapDataSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1, 'Node text cannot be empty.'),
      details: z.string().optional(),
    })
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    })
  ),
});

// Output Schema: A single group suggestion, or null (remains the same)
export const NodeGroupSuggestionSchema = z
  .object({
    nodeIdsToGroup: z
      .array(z.string())
      .min(2)
      .max(5, 'Suggest grouping 2 to 5 nodes.'),
    suggestedParentName: z
      .string()
      .min(1, 'Suggested parent name cannot be empty.'),
    reason: z.string().optional(),
  })
  .nullable();

// New Zod schema for the LLM's validation and naming response
const LlmGroupValidationResponseSchema = z.object({
  isCoherent: z
    .boolean()
    .describe(
      'Whether the provided list of nodes forms a semantically coherent group.'
    ),
  suggestedParentName: z
    .string()
    .optional()
    .nullable()
    .describe(
      'A concise parent name if the group is coherent, otherwise null.'
    ),
  reason: z
    .string()
    .optional()
    .nullable()
    .describe(
      "A brief reason for the grouping if coherent, or why it's not, otherwise null."
    ),
});

const suggestNodeGroupCandidates = async (
  mapData: z.infer<typeof MapDataSchema>
) => {
  if (!mapData.nodes || mapData.nodes.length < 2) {
    return null; // Not enough nodes to form a group or for community detection
  }

  // Step 1: Graphology Community Detection
  const communityDetectionResult = await graphologyCommunityDetectionTool.run(
    mapData
  );

  if (
    communityDetectionResult.error ||
    !communityDetectionResult.detectedCommunities ||
    communityDetectionResult.detectedCommunities.length === 0
  ) {
    console.log(
      '[SuggestNodeGroup] No communities found by graphology tool or error occurred.',
      communityDetectionResult.error
    );
    return null;
  }

  // Take the first valid community (already filtered by size 2-5 in the tool)
  const firstCommunity = communityDetectionResult.detectedCommunities[0];
  if (!firstCommunity || firstCommunity.nodeIds.length < 2) {
    // Should be redundant due to tool's filtering
    console.log('[SuggestNodeGroup] First community is invalid or too small.');
    return null;
  }

  // Step 2: LLM Refinement & Naming
  const nodesInCommunity = mapData.nodes.filter((node) =>
    firstCommunity.nodeIds.includes(node.id)
  );

  if (nodesInCommunity.length !== firstCommunity.nodeIds.length) {
    console.warn(
      '[SuggestNodeGroup] Mismatch between community node IDs and found nodes. Aborting.'
    );
    return null;
  }

  const communityNodesSummary = nodesInCommunity
    .map(
      (n) =>
        `Node(id="${n.id}", text="${n.text}"${
          n.details ? `, details_preview="${n.details.substring(0, 70)}..."` : ''
        })`
    )
    .join('; ');

  const validateAndNamePrompt = `
      You are an expert knowledge organizer. A community detection algorithm has identified the following group of nodes from a concept map:
      [${communityNodesSummary}]

      Your tasks are:
      1.  Assess if these nodes form a semantically coherent group that would benefit from being explicitly grouped under a parent concept.
      2.  If they DO form a coherent group:
          a.  Suggest a concise and meaningful name for a NEW PARENT NODE that would group these nodes (max 5 words).
          b.  Provide a brief reason (1-2 sentences) explaining why they form a good group and why this name is suitable.
      3.  If they DO NOT form a coherent group, indicate this.

      Return your answer as a single, well-formed JSON object with the following exact keys:
      - "isCoherent": boolean (true if they form a good group, false otherwise)
      - "suggestedParentName": string (the suggested parent name if coherent, otherwise null or omit)
      - "reason": string (your reasoning if coherent, or why not, if not coherent; otherwise null or omit)

      Example for a coherent group:
      {
        "isCoherent": true,
        "suggestedParentName": "User Authentication Methods",
        "reason": "These nodes all describe different ways users can authenticate, making them a logical group."
      }
      Example for a non-coherent group:
      {
        "isCoherent": false,
        "suggestedParentName": null,
        "reason": "These nodes cover disparate topics (e.g., payment processing and UI themes) and would not form a clear conceptual group."
      }
    `;

  const llmResponse = await generate(
    {
      model: gemini10Pro,
      prompt: validateAndNamePrompt,
      output: {
        format: 'json',
        schema: LlmGroupValidationResponseSchema,
      },
      config: {
        temperature: 0.5, // Moderate temperature for creative but relevant naming
      },
    },
    {
      tools: [],
    }
  );

  const validationOutput = llmResponse.output();

  if (!validationOutput) {
    console.warn(
      '[SuggestNodeGroup] LLM validation/naming returned no output.'
    );
    return null;
  }

  if (validationOutput.isCoherent && validationOutput.suggestedParentName) {
    // Ensure the output matches NodeGroupSuggestionSchema
    const finalSuggestion = {
      nodeIdsToGroup: firstCommunity.nodeIds.sort(), // Ensure sorted order
      suggestedParentName: validationOutput.suggestedParentName,
      reason: validationOutput.reason || undefined, // Convert null to undefined if that's what schema expects for optional
    };
    // Validate with the final output schema before returning
    const parsedResult = NodeGroupSuggestionSchema.safeParse(finalSuggestion);
    if (parsedResult.success) {
      return parsedResult.data;
    } else {
      console.warn(
        '[SuggestNodeGroup] LLM output for coherent group failed final schema validation:',
        parsedResult.error
      );
      return null;
    }
  } else {
    console.log(
      '[SuggestNodeGroup] LLM deemed the community not coherent or failed to provide a name.'
    );
    return null;
  }
};

export const suggestNodeGroupCandidatesFlow = defineFlow(
  {
    name: 'suggestNodeGroupCandidatesFlow',
    inputSchema: MapDataSchema,
    outputSchema: NodeGroupSuggestionSchema,
  },
  suggestNodeGroupCandidates
);
