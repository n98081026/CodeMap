'use server';
/**
 * @fileOverview Flow to generate concept map data from pre-analyzed project structure.
 */

import { z } from 'genkit';

import type { ConceptMapData } from '@/types';

import { ai } from '@/ai/genkit';
import {
  ProjectAnalysisOutputSchema,
  type ProjectAnalysisOutput,
} from '@/ai/tools/project-analyzer-tool';
import { ConceptMapDataSchema } from '@/types/zodSchemas'; // Assuming this is the desired output structure

export const GenerateMapFromAnalysisInputSchema = z.object({
  analysisOutput: ProjectAnalysisOutputSchema.describe(
    'The structured analysis output from projectStructureAnalyzerTool.'
  ),
  userGoals: z
    .string()
    .optional()
    .describe(
      'Optional user-provided goals or focus areas for the concept map generation.'
    ),
});
export type GenerateMapFromAnalysisInput = z.infer<
  typeof GenerateMapFromAnalysisInputSchema
>;

// Output will be ConceptMapData, but Genkit flows often return an object,
// so we'll wrap it, similar to generateMapSummaryFlow's output.
export const GenerateMapFromAnalysisOutputSchema = z.object({
  conceptMapData: ConceptMapDataSchema.describe(
    'The generated concept map data (nodes and edges).'
  ),
  error: z
    .string()
    .optional()
    .describe('Error message if map generation failed.'),
});
export type GenerateMapFromAnalysisOutput = z.infer<
  typeof GenerateMapFromAnalysisOutputSchema
>;

// Adapted prompt logic from the original generateMapFromProject.ts
// This prompt now assumes 'analysisOutput' is provided directly as input, not called via a tool.
const generateMapFromStructurePrompt = ai.definePrompt({
  name: 'generateMapFromAnalysisOutputPrompt', // New name for this specific prompt
  input: { schema: GenerateMapFromAnalysisInputSchema }, // Takes the full analysis and goals
  output: { schema: GenerateMapFromAnalysisOutputSchema }, // Outputs map data or error
  prompt: `You are an expert software analyst tasked with creating a simple concept map FROM A PRE-ANALYZED project file structure.
You are given the 'analysisOutput' object directly.

Analysis Output Details:
- analyzedFileName: {{analysisOutput.analyzedFileName}}
- contentType: {{analysisOutput.contentType}}
- fileSize: {{analysisOutput.fileSize}}
- isBinary: {{analysisOutput.isBinary}}
- analysisSummary: {{{analysisOutput.analysisSummary}}}
{{#if analysisOutput.detailedNodes.length}}
- detailedNodes (from tool):
{{#each analysisOutput.detailedNodes}}
  - ID: {{this.id}}, Label: "{{this.label}}", Type: {{this.type}}, Details: "{{this.details}}"
{{/each}}
{{/if}}
{{#if analysisOutput.error}}
- analysisError: {{{analysisOutput.error}}}
{{/if}}

User Goals/Hints (if any): {{{userGoals}}}

Concept Map Generation Rules:

1.  **Handle Analysis Errors:**
    *   If 'analysisOutput.error' is present, your primary goal is to represent this error.
    *   Output: A single node of type 'error_node', with 'text' being "File Analysis Error" and 'details' containing the 'analysisOutput.error' message. No edges.
    Example for conceptMapData: { "nodes": [{"id": "error_node_1", "text": "File Analysis Error", "type": "error_node", "details": "Error details here"}], "edges": [] }

2.  **Represent the Analyzed File (No Error from analysisOutput):**
    *   Create a central node representing the analyzed file.
        *   id: Sanitize 'analysisOutput.analyzedFileName' to create a valid ID (e.g., replace special characters with underscores, prefix with "file_").
        *   text: 'analysisOutput.analyzedFileName'.
        *   type: If 'analysisOutput.isBinary' is true, use 'binary_file_info'; otherwise, use 'text_file_info'.
        *   details: Concatenate 'analysisOutput.analysisSummary', 'analysisOutput.contentType', and 'analysisOutput.fileSize' (if available).
    *   If 'analysisOutput.detailedNodes' are provided, you SHOULD include them as distinct nodes. Create simple 'describes_property' or 'contains_element' edges from the central file node to these nodes. Ensure their IDs are unique (e.g., by prefixing them with 'analyzed_detail_').
    *   Alternatively, or if 'detailedNodes' are not suitable or empty, create 1-2 additional child nodes connected to the primary file node that highlight key aspects from 'analysisOutput.analysisSummary'. For example:
        *   If not binary: a node for 'Line Count' (if mentioned), and/or a node for 'Content Snippet' (if a first line or excerpt is in summary).
        *   If binary: a node for 'File Type' (from contentType) and 'File Size'.
        *   Label edges appropriately (e.g., 'has_property', 'shows_snippet').

3.  **Incorporate User Goals (If Provided and No Error from analysisOutput):**
    *   If '{{{userGoals}}}' were provided, create a node representing these goals (e.g., id: 'user_goals_node', text: 'User Goals', type: 'goal', details: '{{{userGoals}}}').
    *   Draw a conceptual edge (e.g., label: 'relevant_to_goals') from the central file node to this user goals node if the file's analysis seems pertinent.

4.  **Output Format (Mandatory):**
    *   The entire output MUST be a JSON object with a 'conceptMapData' key.
    *   'conceptMapData' itself must be an object with two top-level keys: "nodes" (an array of node objects) and "edges" (an array of edge objects).
    *   Ensure all node "id" values are unique. Edges must use these valid "id"s for "source" and "target".
    *   Aim for a small map (2-5 nodes total) focused on the single file analysis.

Example (Successful Analysis of a Text File, with user goals):
{
  "conceptMapData": {
    "nodes": [
      { "id": "file_example_txt", "text": "example.txt", "type": "text_file_info", "details": "File 'example.txt' (text/plain, 123 bytes) has 10 lines. First line: 'Hello world'." },
      { "id": "analyzed_detail_lines", "text": "Line Count: 10", "type": "file_property", "details": "Total lines in the file." },
      { "id": "user_goals_check", "text": "User Goals", "type": "goal", "details": "check content" }
    ],
    "edges": [
      { "id": "edge_fp_1", "source": "file_example_txt", "target": "analyzed_detail_lines", "label": "has_property" },
      { "id": "edge_fg_1", "source": "file_example_txt", "target": "user_goals_check", "label": "relevant_to_goals" }
    ]
  }
}

Generate the concept map JSON based on the provided 'analysisOutput'.
`,
});

export const generateMapFromAnalysisOutputFlow = ai.defineFlow(
  {
    name: 'generateMapFromAnalysisOutputFlow',
    inputSchema: GenerateMapFromAnalysisInputSchema,
    outputSchema: GenerateMapFromAnalysisOutputSchema,
  },
  async (input) => {
    if (
      'error' in input.analysisOutput &&
      (input.analysisOutput as any).error &&
      (!('detailedNodes' in input.analysisOutput) ||
        !(input.analysisOutput as any).detailedNodes ||
        (input.analysisOutput as any).detailedNodes.length === 0)
    ) {
      // If the input analysis itself has a significant error, reflect that.
      const errorNodeId = `error_${('analyzedFileName' in input.analysisOutput && (input.analysisOutput as any).analyzedFileName.replace(/[^a-zA-Z0-9_]/g, '_')) || 'general'}`;
      return {
        conceptMapData: {
          nodes: [
            {
              id: errorNodeId,
              text: 'File Analysis Error',
              type: 'error_node',
              details: (input.analysisOutput as any).error,
            },
          ],
          edges: [],
        },
        error: `Upstream analysis error: ${(input.analysisOutput as any).error}`,
      };
    }

    try {
      const { output } = await generateMapFromStructurePrompt(input); // Pass the whole input object
      if (!output) {
        return {
          conceptMapData: { nodes: [], edges: [] }, // Empty map on null output
          error: 'AI prompt for map generation returned null or undefined.',
        };
      }
      // Ensure output.conceptMapData exists, even if empty, to satisfy schema
      if (!output.conceptMapData) {
        return {
          conceptMapData: { nodes: [], edges: [] },
          error: output.error || 'AI did not produce concept map data.',
        };
      }
      return output; // Contains { conceptMapData: {nodes, edges}, error? }
    } catch (e: any) {
      console.error('Error in generateMapFromAnalysisOutputFlow LLM call:', e);
      return {
        conceptMapData: { nodes: [], edges: [] },
        error: `AI map generation failed: ${e.message}`,
      };
    }
  }
);
