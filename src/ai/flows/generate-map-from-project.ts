'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a concept map from a project's code.
 * It now uses the projectStructureAnalyzerTool to get project details.
 *
 * - generateMapFromProject - A function that handles the concept map generation process.
 * - GenerateMapFromProjectInput - The input type for the generateMapFromProject function.
 * - GenerateMapFromProjectOutput - The return type for the generateMapFromProject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { projectStructureAnalyzerTool } from '@/ai/tools/project-analyzer-tool';

const GenerateMapFromProjectInputSchema = z.object({
  projectStoragePath: z.string().describe(
    'The cloud storage path or reference to the uploaded project archive (e.g., .zip, .tar.gz).'
  ),
  userGoals: z.string().optional().describe(
    'Optional user-provided goals or focus areas for the concept map generation, which can guide the AI on what to emphasize.'
  ),
});
export type GenerateMapFromProjectInput = z.infer<typeof GenerateMapFromProjectInputSchema>;

const GenerateMapFromProjectOutputSchema = z.object({
  conceptMapData: z.string().describe('The concept map data in a well-formed JSON string format, representing nodes and edges. Node IDs must be unique strings.'),
});
export type GenerateMapFromProjectOutput = z.infer<typeof GenerateMapFromProjectOutputSchema>;

export async function generateMapFromProject(
  input: GenerateMapFromProjectInput
): Promise<GenerateMapFromProjectOutput> {
  return generateMapFromProjectFlow(input);
}

const newPromptText = `You are an expert software analyst tasked with creating a simple concept map from an analysis of a single project file.

To obtain details about the file, you MUST use the 'projectStructureAnalyzerTool'.
Provide the tool with the 'projectStoragePath': {{{projectStoragePath}}}.
{{#if userGoals}}
Also, provide the 'userHint': {{{userGoals}}} to the tool.
{{/if}}

The 'projectStructureAnalyzerTool' will return an 'analysis_output' object with the following fields:
- analyzedFileName: The name of the file.
- contentType: The file's MIME type.
- fileSize: (Optional) The size of the file in bytes.
- isBinary: A boolean indicating if the file is binary.
- analysisSummary: A textual summary of the file's properties (e.g., line count, first line, or binary file type). This is your primary source of information.
- detailedNodes: (Optional) An array of a few pre-generated generic nodes based on the summary. Example: [{ id: "file_summary_node", label: "File Summary", type: "summary", details: "..."}]
- error: (Optional) An error message if file fetching or initial analysis failed.

Concept Map Generation Rules:

1.  **Handle Analysis Errors:**
    *   If 'analysis_output.error' is present, your primary goal is to represent this error.
    *   Output: A single node of type 'error_node', with 'text' being "File Analysis Error" and 'details' containing the 'analysis_output.error' message. No edges.
    Example: { "nodes": [{"id": "error_node_1", "text": "File Analysis Error", "type": "error_node", "details": "Error details here"}], "edges": [] }

2.  **Represent the Analyzed File (No Error):**
    *   Create a central node representing the analyzed file.
        *   id: Sanitize 'analysis_output.analyzedFileName' to create a valid ID (e.g., replace special characters with underscores, prefix with "file_").
        *   text: 'analysis_output.analyzedFileName'.
        *   type: If 'analysis_output.isBinary' is true, use 'binary_file_info'; otherwise, use 'text_file_info'.
        *   details: 'analysis_output.analysisSummary'. Also include 'analysis_output.contentType' and 'analysis_output.fileSize' (if available) in the details.
    *   If 'analysis_output.detailedNodes' are provided by the tool, you may include them as distinct nodes. Create simple 'describes_property' edges from the central file node to these nodes. Ensure their IDs are unique (e.g., by prefixing them if necessary).
    *   Alternatively, or if 'detailedNodes' are not suitable or empty, create 1-2 additional child nodes connected to the primary file node that highlight key aspects from 'analysisSummary'. For example:
        *   If not binary: a node for 'Line Count' (if mentioned), and/or a node for 'Content Snippet' (if a first line or excerpt is in summary).
        *   If binary: a node for 'File Type' (from contentType) and 'File Size'.
        *   Label edges appropriately (e.g., 'has_property', 'shows_snippet').

3.  **Incorporate User Goals (If Provided and No Error):**
    *   If '{{{userGoals}}}' were provided, create a node representing these goals (e.g., id: 'user_goals_node', text: 'User Goals', type: 'goal', details: '{{{userGoals}}}').
    *   Draw a conceptual edge (e.g., label: 'relevant_to_goals') from the central file node to this user goals node if the file's analysis seems pertinent.

4.  **Output Format (Mandatory):**
    *   Output the concept map data as a single, well-formed JSON string.
    *   The JSON object must have two top-level keys: "nodes" (an array of node objects) and "edges" (an array of edge objects).
    *   Ensure all node "id" values are unique. Edges must use these valid "id"s for "source" and "target".
    *   Aim for a small map (2-5 nodes total) focused on the single file analysis.

Example (Successful Analysis of a Text File, with user goals):
{
  "nodes": [
    { "id": "file_example_txt", "text": "example.txt", "type": "text_file_info", "details": "File 'example.txt' (text/plain, 123 bytes) has 10 lines. First line: 'Hello world'. User hint: 'check content'." },
    { "id": "file_prop_lines", "text": "Line Count: 10", "type": "file_property", "details": "Total lines in the file." },
    { "id": "user_goals_check", "text": "User Goals", "type": "goal", "details": "check content" }
  ],
  "edges": [
    { "id": "edge_fp_1", "source": "file_example_txt", "target": "file_prop_lines", "label": "has_property" },
    { "id": "edge_fg_1", "source": "file_example_txt", "target": "user_goals_check", "label": "relevant_to_goals" }
  ]
}

Begin analysis using the tool and generate the concept map JSON.
`;

const prompt = ai.definePrompt({
  name: 'generateMapFromProjectPrompt',
  input: {schema: GenerateMapFromProjectInputSchema},
  output: {schema: GenerateMapFromProjectOutputSchema},
  tools: [projectStructureAnalyzerTool], // Make the tool available
  prompt: newPromptText, // Use the new prompt text here
});

const generateMapFromProjectFlow = ai.defineFlow(
  {
    name: 'generateMapFromProjectFlow',
    inputSchema: GenerateMapFromProjectInputSchema,
    outputSchema: GenerateMapFromProjectOutputSchema,
  },
  async (input) => {
    // The prompt will handle calling the tool.
    // We just need to pass the input to the prompt.
    const {output} = await prompt(input);

    // Basic validation attempt
    try {
      JSON.parse(output!.conceptMapData);
    } catch (e) {
      console.error("Generated conceptMapData is not valid JSON:", output?.conceptMapData);
      // Potentially throw or attempt to fix.
      // For now, rely on schema validation by Genkit if strict enough.
      // Or return a structured error in outputSchema if that's preferred.
      throw new Error("AI failed to generate valid JSON for the concept map.");
    }
    return output!;
  }
);
