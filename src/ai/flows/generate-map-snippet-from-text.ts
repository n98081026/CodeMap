
// src/ai/flows/generate-map-snippet-from-text.ts
'use server';
/**
 * @fileOverview A Genkit flow to generate a concept map snippet from a block of text.
 *
 * - generateMapSnippetFromText - Function to handle snippet generation.
 * - GenerateMapSnippetInputSchema - Input schema.
 * - GenerateMapSnippetOutputSchema - Output schema.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const GenerateMapSnippetInputSchema = z.object({
  text: z.string().min(50, { message: "Text should be at least 50 characters to generate a meaningful snippet."})
    .describe('A block of text (e.g., meeting notes, documentation paragraph) to analyze and structure into a concept map snippet.'),
});
export type GenerateMapSnippetInput = z.infer<typeof GenerateMapSnippetInputSchema>;

const NodeSchema = z.object({
  text: z.string().describe('The concise label for the concept node.'),
  type: z.string().optional().describe('An optional type for the node (e.g., "key_idea", "person", "action_item", "system_component"). Default if not provided could be "text-derived-concept".'),
  details: z.string().optional().describe('Optional brief details or elaboration for the node, extracted or inferred from the text.'),
});

const EdgeSchema = z.object({
  sourceText: z.string().describe('The exact text label of one of the generated source nodes for this edge.'),
  targetText: z.string().describe('The exact text label of one of the generated target nodes for this edge.'),
  relationLabel: z.string().describe('A concise label describing the relationship (e.g., "influences", "discusses", "responsible_for", "part_of").'),
});

export const GenerateMapSnippetOutputSchema = z.object({
  nodes: z.array(NodeSchema).min(2).max(7).describe('An array of 2 to 7 generated concept nodes representing key entities or ideas from the text.'),
  edges: z.array(EdgeSchema).min(1).max(5).optional().describe('An optional array of 1 to 5 suggested edges connecting the generated nodes, representing relationships found in the text.'),
});
export type GenerateMapSnippetOutput = z.infer<typeof GenerateMapSnippetOutputSchema>;

export async function generateMapSnippetFromText(input: GenerateMapSnippetInput): Promise<GenerateMapSnippetOutput> {
  return generateMapSnippetFromTextFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMapSnippetFromTextPrompt',
  input: {schema: GenerateMapSnippetInputSchema},
  output: {schema: GenerateMapSnippetOutputSchema},
  prompt: `You are an AI assistant skilled at analyzing text and structuring information into concise concept map snippets.
Given the following text:
'''
{{text}}
'''

Your task is to:
1.  Identify 2 to 7 key entities, concepts, or main ideas from the text. These will become nodes.
    *   For each node, provide a "text" label (concise, ideally 1-5 words).
    *   Optionally, suggest a "type" (e.g., "key_idea", "person", "action_item", "system_component", "question").
    *   Optionally, provide brief "details" or an elaboration extracted or inferred from the text.
2.  Identify 1 to 5 significant relationships between these generated nodes. These will become edges.
    *   For each edge, specify the "sourceText" (exact text of a generated source node), "targetText" (exact text of a generated target node), and a "relationLabel" (e.g., "influences", "discusses", "responsible_for", "part_of", "leads_to").

Focus on the most important information to create a coherent and insightful mini-map. Ensure all node texts in edges match texts of generated nodes.

Output strictly as a JSON object adhering to the specified output schema.
Example:
{
  "nodes": [
    { "text": "Project Alpha", "type": "project_name", "details": "Main focus of the meeting." },
    { "text": "User Authentication", "type": "feature", "details": "Needs to be redesigned." },
    { "text": "Security Concerns", "type": "topic", "details": "Raised by Jane Doe regarding data encryption." }
  ],
  "edges": [
    { "sourceText": "Project Alpha", "targetText": "User Authentication", "relationLabel": "includes feature" },
    { "sourceText": "User Authentication", "targetText": "Security Concerns", "relationLabel": "has associated" }
  ]
}
`,
});

const generateMapSnippetFromTextFlow = ai.defineFlow(
  {
    name: 'generateMapSnippetFromTextFlow',
    inputSchema: GenerateMapSnippetInputSchema,
    outputSchema: GenerateMapSnippetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Basic validation for node texts in edges
    if (output?.nodes && output.edges) {
      const nodeTexts = new Set(output.nodes.map(n => n.text));
      output.edges = output.edges.filter(edge =>
        nodeTexts.has(edge.sourceText) && nodeTexts.has(edge.targetText)
      );
    }
    return output!;
  }
);

