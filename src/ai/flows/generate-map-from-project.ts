
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

Your primary task is to generate a concept map that clearly represents a software project's key architectural components, core functionalities, data entities, and their primary interrelationships, adhering to the goals provided.

To obtain the necessary details about the project, you MUST use the 'projectStructureAnalyzerTool'.
Provide the tool with the 'projectStoragePath': {{{projectStoragePath}}}.
{{#if userGoals}}
Also, provide the 'userHint': {{{userGoals}}} to the tool to help focus its analysis. The tool may flag certain elements as 'hintRelevant' in its output if the hint influences its findings.
{{/if}}

Once you receive the structured JSON output from 'projectStructureAnalyzerTool' (referred to as 'analysis_output' hereafter), use that information as the basis for your concept map.
Interpret all fields from 'analysis_output', including "projectName", "projectSummary", "potentialArchitecturalComponents", "keyFiles", "dependencies", and "inferredLanguagesFrameworks".

**Concept Map Generation Rules:**

**1. Node Generation (Goal: Enhance Clarity and Relevance):**
    *   **Primary Nodes from Architectural Components:**
        *   Each item in \`analysis_output.potentialArchitecturalComponents\` should become a primary node.
        *   The node \`type\` should be derived from the component's \`type\` (e.g., 'service' becomes 'service_component', 'module' becomes 'code_module', 'ui_area' becomes 'ui_view', 'data_store_interface' becomes 'data_interface', 'external_api' becomes 'external_dependency'). Use 'unknown_component' as a fallback.
        *   The node \`text\` should be the component's \`name\`.
        *   The node \`details\` should include the component's \`type\`, its purpose (inferred or from analysis), and a list of its \`relatedFiles\`.
    *   **Key Feature Nodes:**
        *   From \`analysis_output.projectSummary\` and the names/descriptions of \`potentialArchitecturalComponents\`, infer 3-7 high-level Key Features or User Stories that describe the project's main functionalities.
        *   Create a node for each inferred Key Feature. These nodes must have \`type: 'key_feature'\`.
        *   The \`text\` should be a concise description of the feature (e.g., "User Authentication Management", "Product Discovery and Browsing", "Order Placement and Tracking").
        *   The \`details\` should briefly explain the feature.
    *   **Nodes from Key Files (Secondary):**
        *   An item from \`analysis_output.keyFiles\` should become a node ONLY IF it represents a significant, distinct functionality *not already covered* by a \`potentialArchitecturalComponents\` node OR if it's a critical configuration/manifest file essential for understanding the project structure.
        *   If a \`keyFile\` becomes a node:
            *   Its \`type\` should be derived from the \`keyFile.type\` (e.g., 'configuration' becomes 'config_file', 'model' becomes 'data_model', 'entry_point' becomes 'entry_point_file').
            *   Its \`text\` should be its \`filePath\` or a descriptive name.
            *   Its \`details\` should include \`keyFile.briefDescription\` and \`keyFile.extractedSymbols\`.
        *   Otherwise, relevant information from \`keyFiles\` (like \`briefDescription\` or \`extractedSymbols\`) should be incorporated into the \`details\` of the primary architectural component nodes they relate to (based on \`relatedFiles\` lists).
    *   **User Goal Emphasis:**
        *   If the \`analysis_output\` contains elements specifically flagged as relevant to the \`userGoals\` (e.g., a property like \`isHintRelevant: true\` on a component or file), ensure these are represented as nodes.
        *   For such nodes, add a property \`"highlight": true\` in their JSON object.

**2. Node Properties (Mandatory for all nodes):**
    *   \`"id"\`: A unique, concise string identifier (e.g., "feat_user_auth", "comp_order_service", "file_package_json"). Use prefixes like \`feat_\`, \`comp_\`, \`file_\`, \`data_\`, \`ext_\` for different types.
    *   \`"text"\`: A concise, descriptive display label.
    *   \`"type"\`: The specific type as defined above (e.g., 'key_feature', 'service_component', 'data_model', 'config_file', 'external_dependency', 'data_interface').
    *   \`"details"\` (optional but highly recommended): Brief explanation of purpose/responsibilities. For components, list key related files.
    *   \`"highlight"\` (optional): Set to \`true\` if the node is directly relevant to \`userGoals\` as indicated by the analysis tool.

**3. Relationship (Edge) Generation (Goal: Improve Accuracy and Descriptiveness):**
    *   Define meaningful, action-oriented relationships based on \`analysis_output\`.
    *   **Infer relationships from:**
        *   \`relatedFiles\` in \`potentialArchitecturalComponents\` (e.g., if Component A includes a file from Component B's module, they might be related).
        *   Explicit \`dependencies\` (e.g., a service depending on a library).
        *   Keywords in \`briefDescription\` or \`extractedSymbols\` from \`keyFiles\` or component descriptions (e.g., "Component X calls API Y", "Service Z writes to DatabaseTableA").
        *   Common architectural patterns (e.g., a 'Controller' component likely \`sends_requests_to\` a 'Service' component; a 'Service' component \`uses_data_model\` a 'Data Model' node).
        *   Key Feature nodes should be connected to the primary components that implement them, using labels like \`is_implemented_by\` or \`relies_on_component\`.
    *   **Edge Labels:**
        *   MUST be descriptive and action-oriented. Examples: \`authenticates_user_for\`, \`retrieves_data_from\`, \`sends_commands_to\`, \`depends_on_library\`, \`manages_entity\`, \`publishes_event_to\`, \`subscribes_to_event_from\`, \`includes_file_from\`.
        *   AVOID generic labels like "connects", "related to", or "uses".
    *   **Edge Structure:** Each edge MUST have:
        *   \`"id"\`: A unique string identifier (e.g., "edge_auth_user_retrieval").
        *   \`"source"\`: The \`id\` of the source node.
        *   \`"target"\`: The \`id\` of the target node.
        *   \`"label"\`: The descriptive label.

**4. Clarity, Conciseness, and Structure (Goal: Valid and Manageable Output):**
    *   Aim for a manageable number of nodes (e.g., 15-30 for a medium project) to provide a clear overview. Prioritize broader components and key features over excessive granularity unless a file/detail is critically important.
    *   The map should provide a clear, high-level understanding of the project's architecture and purpose.

**5. Output Format (Mandatory for Robustness):**
    *   You MUST output the concept map data as a single, well-formed JSON string.
    *   The JSON object must have two top-level keys: \`"nodes"\` (an array of node objects) and \`"edges"\` (an array of edge objects).
    *   Ensure all node \`id\` values are unique. Edges must use these valid \`id\`s for \`source\` and \`target\`.
    *   Pay meticulous attention to correct JSON syntax (quotes, commas, brackets).
    *   If \`analysis_output.parsingErrors\` is non-empty, you may optionally include a general node of type \`info_node\` with \`text: "Project Analysis Note"\` and details summarizing the parsing errors, but prioritize generating the map from the valid parts of the analysis.

**Example JSON Snippet (Illustrative):**
{
  "nodes": [
    { "id": "feat_user_onboarding", "text": "User Onboarding Feature", "type": "key_feature", "details": "Handles new user registration, email verification, and profile setup." },
    { "id": "comp_auth_service", "text": "Authentication Service", "type": "service_component", "details": "Manages user credentials, sessions, and JWT generation. Related files: [src/services/authService.ts, src/controllers/authController.ts]", "highlight": true },
    { "id": "data_user_profile", "text": "User Profile Model", "type": "data_model", "details": "Defines the structure for user data. From: src/models/User.ts, Symbols: [UserSchema, IUser]" }
  ],
  "edges": [
    { "id": "edge_feat_onboarding_uses_auth", "source": "feat_user_onboarding", "target": "comp_auth_service", "label": "is_implemented_by" },
    { "id": "edge_auth_service_manages_user_profile", "source": "comp_auth_service", "target": "data_user_profile", "label": "manages_entity" }
  ]
}

Begin analysis of the provided project data and generate the concept map JSON according to all the rules specified above.
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
