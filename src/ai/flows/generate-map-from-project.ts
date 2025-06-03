
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
  prompt: `You are an expert software architect and system analyst specializing in creating insightful, Whimsical-style concept maps from code and project descriptions.
Your task is to analyze the provided software project information and generate a concept map that clearly represents its key architectural components, core functionalities, data entities, and their primary interrelationships in a conceptually organized manner.

Project Description:
{{{projectDescription}}}

Project Code Structure:
{{{projectCodeStructure}}}

Based on the above information, generate a concept map with the following characteristics:

1.  **Nodes**: Identify and represent the following conceptual elements:
    *   **Key Features / User Stories**: High-level functionalities or user goals (e.g., "User Registration", "Concept Map Creation", "Project Analysis"). Use type: 'key_feature'.
    *   **Core Architectural Components / Services**: Major logical blocks or services (e.g., "Authentication Service", "Data Processing Engine", "Notification Service"). Use type: 'service_component'.
    *   **Primary UI Views / Screens**: Significant user interface screens or views (e.g., "Student Dashboard", "Map Editor Canvas", "Login Page"). Use type: 'ui_view'.
    *   **Data Models / Entities**: Important data structures or database entities (e.g., "User Profile", "Classroom Data", "Concept Map Schema"). Use type: 'data_model'.
    *   **Key Modules / Libraries**: Important code modules, libraries, or helper utilities if they represent a distinct functionality block (e.g., "API Client", "Validation Utilities"). Use type: 'code_module'.
    *   **External Dependencies / APIs**: Significant external services or APIs the project interacts with (e.g., "External Payment API", "Cloud Storage Service"). Use type: 'external_dependency'.
    *   **User Roles** (if applicable): Distinct types of users interacting with the system (e.g., "Student", "Teacher"). Use type: 'user_role'.
    *   **Core Processes / Flows**: Important operational flows or sequences of actions (e.g., "Project Submission Pipeline", "Map Generation Process"). Use type: 'core_process'.
    *   Avoid overly granular nodes like individual small functions or files unless they represent a very distinct and important concept. Focus on abstraction.

2.  **Node Properties**: Each node MUST have:
    *   "id": A unique string identifier (e.g., "user_auth_feature", "main_dashboard_view").
    *   "text": A concise, descriptive display label for the node.
    *   "type": One of the suggested types above (e.g., 'key_feature', 'service_component', 'ui_view', 'data_model', 'code_module', 'external_dependency', 'user_role', 'core_process').
    *   "details" (optional): A brief explanation of the node's purpose or key responsibilities.

3.  **Relationships (Edges)**: Define meaningful, action-oriented relationships between nodes.
    *   Use descriptive labels like: 'triggers', 'uses_data_from', 'displays_info_for', 'manages_access_to', 'interacts_with_api', 'depends_on_service', 'navigates_to_view', 'part_of_flow', 'owned_by_role'.
    *   Focus on primary relationships that highlight the architecture, data flow, and user interaction.
    *   Each edge MUST have: "id" (unique string), "source" (source node id), "target" (target node id), and "label".

4.  **Clarity, Conciseness, and Structure**:
    *   Prioritize the most important elements and relationships. Aim for 10-20 key nodes for a good overview unless the project is very large.
    *   The map should provide a clear, high-level understanding of how the project is structured and how its parts work together, much like a well-designed Whimsical diagram.
    *   Think about logical groupings and flow. For example, a 'key_feature' might 'use' several 'service_components' and 'display_on' a 'ui_view'.

5.  **Output Format**:
    *   You MUST output the concept map data as a single, well-formed JSON string.
    *   The JSON object must have two top-level keys: "nodes" (an array of node objects) and "edges" (an array of edge objects).
    *   Ensure all node "id" values are unique strings. Edges use these IDs to connect nodes.
    *   Pay close attention to correct JSON syntax: proper quoting of keys and string values, commas between elements in arrays and key-value pairs in objects, and no trailing commas.

Example JSON Output Structure:
{
  "nodes": [
    { "id": "feat_user_login", "text": "User Login Feature", "type": "key_feature", "details": "Handles user authentication and session management." },
    { "id": "service_auth", "text": "Authentication Service", "type": "service_component", "details": "Manages user credentials and token generation." },
    { "id": "view_login_page", "text": "Login Page", "type": "ui_view", "details": "UI for users to enter credentials." },
    { "id": "data_user_creds", "text": "User Credentials", "type": "data_model", "details": "Stores hashed passwords and user identifiers." }
  ],
  "edges": [
    { "id": "edge_1", "source": "feat_user_login", "target": "service_auth", "label": "uses_service" },
    { "id": "edge_2", "source": "view_login_page", "target": "feat_user_login", "label": "triggers_feature" },
    { "id": "edge_3", "source": "service_auth", "target": "data_user_creds", "label": "accesses_data" }
  ]
}

Analyze the provided project information and generate the concept map JSON data adhering to these Whimsical-style guidelines.
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

