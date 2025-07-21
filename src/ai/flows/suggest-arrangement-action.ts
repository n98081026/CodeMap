import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { DEFAULT_MODEL } from '../../config/genkit';
import * as z from 'zod';

// Define the list of valid action IDs that the AI can suggest
const ArrangementActionIdEnum = z.enum([
  'alignLefts',
  'alignCentersH',
  'alignRights',
  'alignTops',
  'alignMiddlesV',
  'alignBottoms',
  'distributeHorizontally',
  'distributeVertically',
]);

// Input Schema
export const SuggestArrangementActionInputSchema = z.object({
  selectedNodesInfo: z
    .array(
      z.object({
        id: z.string(),
        x: z.number(),
        y: z.number(),
        width: z.number().optional(),
        height: z.number().optional(),
        text: z.string().optional(),
      })
    )
    .min(2, 'At least two nodes are required for an arrangement suggestion.'),
});

// Output Schema
export const SuggestArrangementActionOutputSchema = z.object({
  suggestion: z.object({
    actionId: ArrangementActionIdEnum,
    reason: z.string().optional(),
  }),
});

export const suggestArrangementActionFlow = defineFlow(
  {
    name: 'suggestArrangementActionFlow',
    inputSchema: SuggestArrangementActionInputSchema,
    outputSchema: SuggestArrangementActionOutputSchema,
  },
  async (input) => {
    const { selectedNodesInfo } = input;

    // Create a textual summary of the selected nodes' current state
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    let totalWidth = 0,
      totalHeight = 0;
    const nodeTextsSample = selectedNodesInfo
      .slice(0, 3)
      .map((n) => n.text || 'Untitled Node')
      .join(', ');

    selectedNodesInfo.forEach((node) => {
      const w = node.width || 150; // Use default if not provided
      const h = node.height || 70; // Use default if not provided
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x + w);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y + h);
      totalWidth += w;
      totalHeight += h;
    });

    const overallWidth = maxX - minX;
    const overallHeight = maxY - minY;

    const nodesSummary = `
      Number of nodes selected: ${selectedNodesInfo.length}
      Approximate bounding box of selection: width=${overallWidth.toFixed(0)}, height=${overallHeight.toFixed(0)}
      Average node width: ${(totalWidth / selectedNodesInfo.length).toFixed(0)}
      Average node height: ${(totalHeight / selectedNodesInfo.length).toFixed(0)}
      Sample node texts: ${nodeTextsSample}
    `;

    const availableActions = `
      Available action IDs and their descriptions:
      - "alignLefts": Align selected nodes to their leftmost edge.
      - "alignCentersH": Align selected nodes to their horizontal centers.
      - "alignRights": Align selected nodes to their rightmost edge.
      - "alignTops": Align selected nodes to their topmost edge.
      - "alignMiddlesV": Align selected nodes to their vertical middles.
      - "alignBottoms": Align selected nodes to their bottommost edge.
      - "distributeHorizontally": Space selected nodes evenly horizontally.
      - "distributeVertically": Space selected nodes evenly vertically.
    `;

    const prompt = `
      You are a UX expert specializing in diagramming tools.
      Given the following summary of currently selected nodes in a concept map and a list of available arrangement actions, suggest the single most appropriate arrangement action to tidy up their layout.
      Also, provide a brief reason for your suggestion.

      Selected Nodes Summary:
      ${nodesSummary}

      Available Arrangement Actions:
      ${availableActions}

      Consider the number of nodes, their overall spread, and what action would likely improve their visual organization.
      For example, if nodes are roughly in a row but uneven, "alignTops" or "alignMiddlesV" might be good. If they are spread out, a distribution action might be suitable.

      Return your answer as a JSON object with the exact keys "actionId" (must be one of the provided action IDs) and "reason" (a short explanation).
      Example:
      {
        "actionId": "alignTops",
        "reason": "The selected nodes appear to be in a row, aligning their tops will make them look neater."
      }
    `;

    const llmResponse = await generate(
      {
        model: DEFAULT_MODEL,
        prompt: prompt,
        config: {
          temperature: 0.3, // Low temperature for more deterministic suggestions
          maxOutputTokens: 100,
        },
        output: {
          format: 'json',
          schema: z.object({
            actionId: ArrangementActionIdEnum,
            reason: z.string().optional(),
          }),
        },
      }
    );

    const outputData = llmResponse.output();

    if (
      !outputData ||
      !outputData.actionId ||
      !ArrangementActionIdEnum.safeParse(outputData.actionId).success
    ) {
      // Fallback if AI fails to provide a valid actionId or output
      console.error(
        'AI failed to provide a valid arrangement suggestion. Output:',
        outputData
      );
      return {
        suggestion: {
          actionId: 'alignLefts', // Default fallback action
          reason: 'AI suggestion failed, defaulting to align lefts.',
        },
      };
    }

    return { suggestion: outputData };
  }
);
