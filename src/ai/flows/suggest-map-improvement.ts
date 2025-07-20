import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini10Pro } from '@genkit-ai/googleai';
import * as z from 'zod';

// Input Schema: Current map data
export const MapDataSchema = z.object({
  nodes: z
    .array(
      z.object({
        id: z.string(),
        text: z.string().min(1, 'Node text cannot be empty.'),
        details: z.string().optional(),
        // Consider adding x, y, parentNode for more context if useful for AI
      })
    )
    .min(2, 'Map must have at least 2 nodes for improvement suggestions.'), // Require min nodes
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    })
  ),
});

// Schemas for the 'data' field based on suggestion type
const AddEdgeDataSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  label: z.string(),
});

export const NewIntermediateNodeDataSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(), // This is the original target
  intermediateNodeText: z.string(),
  labelToIntermediate: z.string(),
  labelFromIntermediate: z.string(),
  originalEdgeId: z.string().optional(), // Added field
});

const FormGroupDataSchema = z.object({
  nodeIdsToGroup: z.array(z.string()).min(2).max(5), // Group 2-5 nodes
  suggestedParentName: z.string(),
});

// Output Schema: A single map improvement suggestion, or null
export const MapImprovementSuggestionSchema = z
  .union([
    z.object({
      type: z.literal('ADD_EDGE'),
      data: AddEdgeDataSchema,
      reason: z.string().optional(),
    }),
    z.object({
      type: z.literal('NEW_INTERMEDIATE_NODE'),
      data: NewIntermediateNodeDataSchema,
      reason: z.string().optional(),
    }),
    z.object({
      type: z.literal('FORM_GROUP'),
      data: FormGroupDataSchema,
      reason: z.string().optional(),
    }),
  ])
  .nullable();

const suggestMapImprovement = async (input: z.infer<typeof MapDataSchema>) => {
  const { nodes, edges } = input;

  if (nodes.length < 3 && edges.length < 1) {
    // Need enough elements for meaningful suggestions
    return null;
  }

  const nodesSummary = nodes
    .map(
      (n) =>
        `Node(id="${n.id}", text="${n.text}"${
          n.details ? `, details_preview="${n.details.substring(0, 50)}..."` : ''
        })`
    )
    .join(', ');
  const edgesSummary = edges
    .map(
      (e) =>
        `Edge(source="${e.source}", target="${e.target}"${
          e.label ? `, label="${e.label}"` : ''
        })`
    )
    .join(', ');

  const prompt = `
      You are an expert concept map analyst and knowledge structurer.
      Analyze the provided concept map data (nodes and edges). Your goal is to suggest ONE high-impact structural improvement.
      The types of improvements you can suggest are:
      1.  ADD_EDGE: Suggest adding a new edge between two existing, currently unconnected (or weakly connected) nodes if it reveals a significant missing relationship. Provide 'sourceNodeId', 'targetNodeId', and a 'label' for the new edge.
      2.  NEW_INTERMEDIATE_NODE: Suggest inserting a new intermediate node between two existing connected nodes if their current relationship could be clarified or broken down. Provide 'sourceNodeId' (original source), 'targetNodeId' (original target), 'intermediateNodeText' for the new node, 'labelToIntermediate' (for source to new node), 'labelFromIntermediate' (for new node to target), and optionally 'originalEdgeId' (ID of the edge being replaced).
      3.  FORM_GROUP: Suggest grouping 2 to 5 existing nodes under a new parent node if they represent a strong, coherent sub-theme not yet explicitly grouped. Provide 'nodeIdsToGroup' (an array of existing node IDs) and 'suggestedParentName' for the new parent.

      Map Data:
      Nodes: [${nodesSummary}]
      Edges: [${edgesSummary}]

      Based on your analysis, choose ONE type of improvement that would most significantly enhance the map's clarity, structure, or completeness.
      Provide a brief 'reason' for your suggestion.
      If no single high-impact improvement stands out, return null.

      Return your answer as a JSON object matching ONE of the allowed output structures for the 'type' you choose (ADD_EDGE, NEW_INTERMEDIATE_NODE, FORM_GROUP), including its specific 'data' object and optional 'reason'.
      Example for ADD_EDGE:
      { "type": "ADD_EDGE", "data": { "sourceNodeId": "node1", "targetNodeId": "node5", "label": "is related to" }, "reason": "These concepts are thematically linked but not connected." }
      Example for FORM_GROUP:
      { "type": "FORM_GROUP", "data": { "nodeIdsToGroup": ["node2", "node3"], "suggestedParentName": "Core Methods" }, "reason": "Nodes 2 and 3 both describe core methodologies." }
      Example for NEW_INTERMEDIATE_NODE:
      { "type": "NEW_INTERMEDIATE_NODE", "data": { "sourceNodeId": "nodeA", "targetNodeId": "nodeC", "intermediateNodeText": "Bridge Concept B", "labelToIntermediate": "leads to", "labelFromIntermediate": "then to", "originalEdgeId": "edge_AC_original" }, "reason": "Concept B clarifies the path from A to C." }
    `;

  const llmResponse = await generate(
    {
      model: gemini10Pro,
      prompt: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 300,
      },
      output: {
        format: 'json',
        schema: MapImprovementSuggestionSchema, // Zod schema for the union type
      },
    },
    {
      tools: [],
    }
  );

  const outputData = llmResponse.output();

  // Basic validation for suggested IDs (can be enhanced)
  if (outputData) {
    const inputNodeIds = new Set(nodes.map((n) => n.id));
    if (
      outputData.type === 'ADD_EDGE' ||
      outputData.type === 'NEW_INTERMEDIATE_NODE'
    ) {
      if (
        !inputNodeIds.has(outputData.data.sourceNodeId) ||
        !inputNodeIds.has(outputData.data.targetNodeId)
      ) {
        console.warn(
          'AI suggested an edge or intermediate node involving non-existent node IDs. Clearing suggestion.'
        );
        return null;
      }
    } else if (outputData.type === 'FORM_GROUP') {
      const allGroupIdsValid = outputData.data.nodeIdsToGroup.every(
        (id: string) => inputNodeIds.has(id)
      );
      if (
        !allGroupIdsValid ||
        new Set(outputData.data.nodeIdsToGroup).size !==
          outputData.data.nodeIdsToGroup.length
      ) {
        console.warn(
          'AI suggested grouping with invalid or duplicate node IDs. Clearing suggestion.'
        );
        return null;
      }
    }
  }
  return outputData;
};

export const suggestMapImprovementFlow = defineFlow(
  {
    name: 'suggestMapImprovementFlow',
    inputSchema: MapDataSchema,
    outputSchema: MapImprovementSuggestionSchema,
  },
  suggestMapImprovement
);
