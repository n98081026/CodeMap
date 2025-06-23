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

const newPromptText = `You are an expert software architect and analyst tasked with creating a concept map from an analysis of a single project file. Your goal is to represent not just the file's structure, but also its inferred semantic role and key characteristics.

To obtain details about the file, you MUST use the 'projectStructureAnalyzerTool'.
Provide the tool with the 'projectStoragePath': {{{projectStoragePath}}}.
{{#if userGoals}}
Also, provide the 'userHint': {{{userGoals}}} to the tool. This hint might specify the project type (e.g., "e-commerce backend", "data processing pipeline", "web frontend") or specific aspects the user is interested in.
{{/if}}

The 'projectStructureAnalyzerTool' will return an 'analysis_output' object with fields like:
- analyzedFileName: The name of the file.
- effectiveFileType: e.g., 'javascript', 'python', 'markdown', 'json'.
- analysisSummary: A general summary from the tool.
- detailedNodes: An array of objects, where each object represents an extracted code element (like a function or class) from the file. Each such object usually contains:
    - id: A unique ID for the element.
    - label: A display label (e.g., "myFunction (function)").
    - type: The type of element (e.g., "js_function", "py_class").
    - details: A string containing more information, crucially including an AI-generated 'semanticPurpose' (e.g., "This function calculates user scores." or "Service class to manage product inventory."). It may also contain information about exports, parameters, etc.
    - lineNumbers: e.g., "10-25".
    - structuredInfo: Raw extracted data, including local calls if detected.
- error: (Optional) An error message if file fetching or initial analysis failed.

Concept Map Generation Rules:

1.  **Handle Analysis Errors:**
    *   If 'analysis_output.error' is present, output a single node of type 'error_node', with 'text' being "File Analysis Error" and 'details' containing the 'analysis_output.error' message. No edges.
    Example: { "nodes": [{"id": "error_node_1", "text": "File Analysis Error", "type": "error_node", "details": "Error details here"}], "edges": [] }

2.  **Main File Node - Basic Representation:**
    *   Create a central node representing the analyzed file.
        *   id: Sanitize 'analysis_output.analyzedFileName' to create a valid ID (e.g., prefix with "file_" and replace special chars with "_"). Let's call this 'fileNodeId'.
        *   text: 'analysis_output.analyzedFileName'.
        *   type: Use a type like 'file_js', 'file_py', 'file_md' based on 'analysis_output.effectiveFileType'. If binary, use 'file_binary'.
        *   details: Start with 'analysis_output.analysisSummary'. Append 'analysis_output.contentType' and 'analysis_output.fileSize' if available.

3.  **Deeper Semantic Interpretation of the File:**
    *   Based on 'analysis_output.analyzedFileName', the 'analysis_output.analysisSummary', the types and semantic purposes of elements in 'analysis_output.detailedNodes', and any '{{{userGoals}}}':
        *   **Architectural Role:** Infer the primary architectural role of this file. Examples: "Configuration File", "Service Logic", "Controller/Router", "UI Component", "Data Model/Entity", "Utility Library", "Main Entry Point", "Documentation".
        *   **Key Responsibilities:** Identify 1-3 key responsibilities or capabilities this file provides.
    *   Add this inferred architectural role and key responsibilities to the 'details' of the 'fileNodeId' node. For example: "Role: Service Logic. Responsibilities: Manages user authentication, Retrieves user profiles."

4.  **Represent Significant Code Elements (from \`analysis_output.detailedNodes\`):**
    *   Select up to 5-7 of the most important elements from 'analysis_output.detailedNodes'. Prioritize elements like functions and classes, especially those that are exported or have a clear semantic purpose.
    *   For each selected element:
        *   Create a new concept map node.
        *   id: Use the 'id' from the element in 'detailedNodes', ensuring it's unique in the map (perhaps prefix with 'element_').
        *   text: Use the 'label' from the element (e.g., "myFunction (function)").
        *   type: Use the 'type' from the element (e.g., "js_function", "py_class").
        *   details: Primarily use the 'semanticPurpose' found in the element's 'details' string. Also include line numbers. If 'structuredInfo.localCalls' exists and is not empty, mention the number of local calls or list them.
    *   Create edges from 'fileNodeId' to each of these element nodes. Use edge labels like 'contains_function', 'defines_class'.

5.  **Represent Key Intra-File Relationships (Local Calls):**
    *   If 'analysis_output.detailedNodes' contains elements with 'structuredInfo.localCalls', and both the calling element and the target element are represented as nodes in your map:
        *   Create an edge between the node representing the calling function/method and the node representing the target function/method.
        *   Label the edge 'calls_local' or 'invokes_method'.
        *   Add the line number of the call to the edge's 'details' if available.

6.  **Incorporate User Goals (If Provided and No Error):**
    *   If '{{{userGoals}}}' were provided, create a node (id: 'user_goals_node', text: 'User Goals', type: 'user_goal', details: '{{{userGoals}}}').
    *   Draw a 'relevant_to_goal' edge from 'fileNodeId' to this 'user_goals_node'.

7.  **Output Format (Mandatory):**
    *   Output the concept map data as a single, well-formed JSON string.
    *   The JSON object must have two top-level keys: "nodes" (an array of node objects) and "edges" (an array of edge objects).
    *   Node structure: { "id": "unique_id", "text": "Display Label", "type": "node_type_category", "details": "Descriptive details including semantic purpose, role, responsibilities." }
        *   Example node types: 'file_js', 'file_py', 'js_function', 'py_class', 'user_goal', 'error_node'.
    *   Edge structure: { "id": "unique_edge_id", "source": "source_node_id", "target": "target_node_id", "label": "relationship_type", "details": "Optional details like line number of call" }
    *   Ensure all node "id" values are unique. Edges must use these valid "id"s for "source" and "target".
    *   The map should remain focused on the single file but provide richer semantic insights. Aim for roughly 3-10 nodes depending on file complexity.

Example (Successful Analysis of a JavaScript Service File):
{
  "nodes": [
    { "id": "file_userService_js", "text": "userService.js", "type": "file_js", "details": "Analyzed file: userService.js (application/javascript, 1500 bytes). Role: Service Logic. Responsibilities: Manages user creation, Handles user login. Contains 2 functions, 1 class, 3 imports." },
    { "id": "element_userService_js_class_UserServ", "text": "UserService (class)", "type": "js_class", "details": "Service class responsible for user account management and business logic. Exports: Yes. Methods: createUser, login. Local calls: 1." },
    { "id": "element_userService_js_function_createUser", "text": "createUser (method)", "type": "js_method", "details": "Creates a new user in the database after validating input. Line numbers: 10-25. Part of UserService class." },
    { "id": "element_userService_js_function_login", "text": "login (method)", "type": "js_method", "details": "Authenticates a user based on provided credentials. Line numbers: 28-45. Part of UserService class. Calls local: validateCredentials (line 30)." },
    { "id": "element_userService_js_function_validateCred", "text": "validateCredentials (function)", "type": "js_function", "details": "Utility function to validate user credentials against security policies. Line numbers: 48-55. Exports: No." }
  ],
  "edges": [
    { "id": "edge_f_cls", "source": "file_userService_js", "target": "element_userService_js_class_UserServ", "label": "defines_class" },
    { "id": "edge_cls_m1", "source": "element_userService_js_class_UserServ", "target": "element_userService_js_function_createUser", "label": "has_method" },
    { "id": "edge_cls_m2", "source": "element_userService_js_class_UserServ", "target": "element_userService_js_function_login", "label": "has_method" },
    { "id": "edge_f_fn", "source": "file_userService_js", "target": "element_userService_js_function_validateCred", "label": "contains_function" },
    { "id": "edge_call_1", "source": "element_userService_js_function_login", "target": "element_userService_js_function_validateCred", "label": "calls_local", "details": "Line: 30" }
  ]
}

Begin analysis using the tool and generate the concept map JSON based on these enhanced rules.
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
