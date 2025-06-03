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

const prompt = ai.definePrompt({
  name: 'generateMapFromProjectPrompt',
  input: {schema: GenerateMapFromProjectInputSchema},
  output: {schema: GenerateMapFromProjectOutputSchema},
  tools: [projectStructureAnalyzerTool], // Make the tool available
  prompt: `You are an expert software architect and system analyst specializing in creating insightful, Whimsical-style concept maps from analyzed project structures.

Your primary task is to generate a concept map that clearly represents a software project's key architectural components, core functionalities, data entities, and their primary interrelationships.

To obtain the necessary details about the project, you MUST use the 'projectStructureAnalyzerTool'.
Provide the tool with the 'projectStoragePath': {{{projectStoragePath}}}.
{{#if userGoals}}
Also, provide the 'userHint': {{{userGoals}}} to the tool to help focus its analysis.
{{/if}}

Once you receive the structured JSON output from 'projectStructureAnalyzerTool', use that information as the basis for your concept map.
Interpret the "projectName", "inferredLanguagesFrameworks", "projectSummary", "dependencies", "directoryStructureSummary", "keyFiles", and "potentialArchitecturalComponents" fields from the tool's output.

Based on the analysis from the tool, generate a concept map with the following characteristics:

1.  **Nodes**: Identify and represent the following conceptual elements. Prioritize items from 'potentialArchitecturalComponents' and 'keyFiles'.
    *   **Key Features / User Stories**: High-level functionalities (e.g., "User Registration", "Map Creation"). Use type: 'key_feature'.
    *   **Core Architectural Components / Services**: Major logical blocks (e.g., "Authentication Service", "Data Engine"). Use type: 'service_component'.
    *   **Primary UI Views / Screens**: Significant UI elements (e.g., "Student Dashboard", "Map Editor"). Use type: 'ui_view'.
    *   **Data Models / Entities**: Important data structures (e.g., "User Profile", "Classroom Schema"). Use type: 'data_model'.
    *   **Key Modules / Libraries**: Distinct code modules or libraries (e.g., "API Client", "Validation Utils"). Use type: 'code_module'.
    *   **External Dependencies / APIs**: External services/APIs identified (e.g., "Payment API", "Cloud Storage"). Use type: 'external_dependency'.
    *   **User Roles**: Distinct user types if inferable (e.g., "Student", "Teacher"). Use type: 'user_role'.
    *   **Core Processes / Flows**: Important operational flows (e.g., "Submission Pipeline", "Map Generation"). Use type: 'core_process'.
    *   Focus on abstraction. Avoid overly granular nodes unless they represent a crucial concept.

2.  **Node Properties**: Each node MUST have:
    *   "id": A unique string identifier (e.g., "feat_user_login", "service_auth").
    *   "text": A concise, descriptive display label.
    *   "type": One of the suggested types above. Use "unknown_component" or "code_module" as fallbacks if a more specific type isn't clear.
    *   "details" (optional): Brief explanation of purpose/responsibilities, possibly derived from 'briefDescription' in 'keyFiles' or inferred.

3.  **Relationships (Edges)**: Define meaningful, action-oriented relationships based on the tool's output.
    *   Infer relationships from dependencies, file structures (e.g., colocation in directories like 'services' might imply interaction), and symbol names (e.g., 'OrderController' using 'OrderService').
    *   Use descriptive labels like: 'triggers', 'uses_data_from', 'displays_info_for', 'manages_access_to', 'interacts_with_api', 'imports_module', 'depends_on_framework'.
    *   Focus on primary relationships highlighting architecture, data flow, and user interaction.
    *   Each edge MUST have: "id" (unique), "source" (node id), "target" (node id), and "label".

4.  **Clarity, Conciseness, and Structure**:
    *   Prioritize 10-20 key nodes for a good overview unless the project is very large and the tool provides rich details.
    *   The map should provide a clear, high-level understanding.
    *   If 'userGoals' were provided, try to ensure components and relationships relevant to those goals are represented.

5.  **Output Format**:
    *   You MUST output the concept map data as a single, well-formed JSON string.
    *   The JSON object must have two top-level keys: "nodes" (array of node objects) and "edges" (array of edge objects).
    *   Ensure all node "id" values are unique strings. Edges use these IDs.
    *   Pay close attention to correct JSON syntax. If the 'parsingErrors' field from the tool output is non-empty, you can optionally include a note about potential incompleteness in the map details or a general node.

Example JSON Output Structure:
{
  "nodes": [
    { "id": "comp_auth_service", "text": "Authentication Service", "type": "service_component", "details": "Manages user credentials and sessions. Related files: [src/services/authService.ts, src/pages/login.tsx]" },
    { "id": "mod_cart_module", "text": "Shopping Cart Module", "type": "code_module", "details": "Handles shopping cart logic. Related files: [src/components/ShoppingCart.tsx, src/store/cartStore.ts]" }
  ],
  "edges": [
    { "id": "edge_1", "source": "mod_cart_module", "target": "comp_auth_service", "label": "requires_user_auth" }
  ]
}

Begin analysis and generate the concept map JSON.
`,
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
