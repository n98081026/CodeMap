
'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate a concept map from a project's code.
 *
 * - generateMapFromProject - A function that handles the concept map generation process.
 * - GenerateMapFromProjectInput - The input type for the generateMapFromProject function.
 * - GenerateMapFromProjectOutput - The return type for the generateMapFromProject function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMapFromProjectInputSchema = z.object({
  projectDescription: z.string().describe('A high-level description of the software project, its purpose, and main functionalities.'),
  projectCodeStructure: z.string().describe(
    "A textual representation of the project's directory and file structure. " +
    "This should ideally include key directories, main files within them, their primary exports or roles, " +
    "and any significant internal or external dependencies if known. " +
    "For example: 'Project Root: my-app.zip\\nsrc/ (contains: components/, services/)\\n  components/Button.tsx (exports: ButtonComponent)\\n  services/api.ts (imports: axios; exports: fetchData)\\nutils/helpers.js (exports: formatData)\\npackage.json (dependencies: react, zod)'"
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

const prompt = ai.definePrompt({
  name: 'generateMapFromProjectPrompt',
  input: {schema: GenerateMapFromProjectInputSchema},
  output: {schema: GenerateMapFromProjectOutputSchema},
  prompt: `You are an expert software architect and system analyst specializing in creating insightful concept maps from code and project descriptions.
Your task is to analyze the provided software project information and generate a concept map that clearly represents its key architectural components, core functionalities, and their primary interrelationships.

Project Description:
{{{projectDescription}}}

Project Code Structure:
{{{projectCodeStructure}}}

Based on the above information, generate a concept map with the following characteristics:

1.  **Nodes**:
    *   Represent major directories as logical blocks or high-level components (e.g., 'src', 'components', 'services').
    *   Represent key files (e.g., main entry points, core modules, service definitions, UI components) as distinct modules or services.
    *   Represent significant classes, functions, or data structures if they are central to the architecture or functionality, especially if mentioned as exports in the code structure.
    *   Infer and represent high-level features or user stories as functional nodes if evident from the description or structure.
    *   Identify and represent key external dependencies or services if mentioned (e.g., from package.json or import statements in the code structure).

2.  **Node Types**: Use clear and consistent types for your nodes. Suggested types include: 'directory', 'file', 'module', 'service', 'class', 'function', 'feature', 'data_structure', 'external_dependency', 'ui_component', 'api_endpoint'. Choose the most appropriate type for each node. Each node must have an "id" (unique string), "text" (display label), and "type". Optionally, include "details" for a brief explanation.

3.  **Relationships (Edges)**: Define meaningful relationships between nodes.
    *   Use descriptive labels like: 'contains', 'imports', 'exports', 'calls', 'inherits_from', 'implements', 'depends_on', 'manages', 'interacts_with', 'routes_to', 'triggers', 'uses_data'.
    *   Pay close attention to 'imports' and 'exports' relationships if this information is present in the projectCodeStructure.
    *   Focus on primary relationships that highlight the architecture and data flow.
    *   Each edge must have an "id" (unique string), "source" (source node id), "target" (target node id), and "label".

4.  **Clarity and Focus**:
    *   Prioritize the most important elements and relationships to create a clear and understandable map. Avoid excessive detail or clutter.
    *   The map should provide a good overview of how the project is structured and how its parts work together.

5.  **Output Format**:
    *   You MUST output the concept map data as a single, well-formed JSON string.
    *   The JSON object must have two top-level keys: "nodes" (an array of node objects) and "edges" (an array of edge objects).
    *   Ensure all node "id" values are unique strings. Edges use these IDs to connect nodes.
    *   Pay close attention to correct JSON syntax: proper quoting of keys and string values, commas between elements in arrays and key-value pairs in objects, and no trailing commas.

Example JSON Output Structure:
{
  "nodes": [
    { "id": "src_dir", "text": "Source Directory (src)", "type": "directory", "details": "Contains all primary source code." },
    { "id": "app_entry", "text": "app.ts", "type": "file", "details": "Main application entry point." },
    { "id": "user_service", "text": "UserService", "type": "service", "details": "Manages user data and authentication." }
  ],
  "edges": [
    { "id": "edge_1", "source": "src_dir", "target": "app_entry", "label": "contains" },
    { "id": "edge_2", "source": "app_entry", "target": "user_service", "label": "initializes" },
    { "id": "edge_3", "source": "user_service", "target": "external_auth_api", "label": "depends_on" }
  ]
}

Analyze the provided project information and generate the concept map JSON data.
`,
});

const generateMapFromProjectFlow = ai.defineFlow(
  {
    name: 'generateMapFromProjectFlow',
    inputSchema: GenerateMapFromProjectInputSchema,
    outputSchema: GenerateMapFromProjectOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Basic validation attempt (can be more sophisticated)
    try {
      JSON.parse(output!.conceptMapData);
    } catch (e) {
      console.error("Generated conceptMapData is not valid JSON:", output?.conceptMapData);
      // Potentially throw or attempt to fix, or rely on schema validation if strict enough
      // For now, we'll let it pass and hope schema validation catches it, or client handles malformed JSON.
    }
    return output!;
  }
);

