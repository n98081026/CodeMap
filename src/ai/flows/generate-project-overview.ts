// src/ai/flows/generate-project-overview.ts
'use server';
/**
 * @fileOverview Flow to generate a high-level overview of a project.
 * This includes a concise text summary and identification of key modules/components.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { projectStructureAnalyzerTool, type ProjectAnalysisOutput } from '@/ai/tools/project-analyzer-tool';

// --- Input Schema ---
export const GenerateProjectOverviewInputSchema = z.object({
  projectStoragePath: z.string().describe('File path in Supabase Storage for the project file (e.g., a ZIP archive).'),
  userGoals: z.string().optional().describe("User-provided hint about the project's nature or specific areas of interest for the overview."),
});
export type GenerateProjectOverviewInput = z.infer<typeof GenerateProjectOverviewInputSchema>;

// --- Output Schema ---
const KeyModuleSchema = z.object({
  name: z.string().describe('Name of the identified key module or component.'),
  description: z.string().describe('A concise, plain-language description of this module\'s purpose or functionality.'),
  filePaths: z.array(z.string()).optional().describe('Optional: List of 1-3 key file paths primarily constituting this module.'),
});
export type KeyModule = z.infer<typeof KeyModuleSchema>;

export const GenerateProjectOverviewOutputSchema = z.object({
  overallSummary: z.string().describe('A concise (2-4 sentences) high-level summary of the project, its main purpose, and potentially its primary technology stack, in plain language.'),
  keyModules: z.array(KeyModuleSchema).min(2).max(7).describe('An array of 2-7 identified key modules/components of the project.'),
  error: z.string().optional().describe('Error message if the overview generation failed.'),
});
export type GenerateProjectOverviewOutput = z.infer<typeof GenerateProjectOverviewOutputSchema>;

// --- Prompt for LLM ---
const generateOverviewPrompt = ai.definePrompt({
  name: 'generateProjectOverviewPrompt',
  input: { schema: z.object({ analyzedStructure: ProjectAnalysisOutputSchema, userGoals: z.string().optional() }) },
  output: { schema: GenerateProjectOverviewOutputSchema },
  prompt: `You are an expert software architect skilled at quickly understanding and summarizing codebases **for a general audience, including those who may not be programmers.** Your goal is to provide a high-level, easy-to-grasp overview.
Given the following analyzed project structure:

Project Name: {{analyzedStructure.analyzedFileName}}
Analysis Summary: {{analyzedStructure.analysisSummary}}
{{#if analyzedStructure.detailedNodes.length}}
Key identified elements (sample):
{{#each analyzedStructure.detailedNodes}}
- {{this.label}} (Type: {{this.type}}): {{this.details}}
{{/each}}
{{/if}}

User Goals/Hints (if any): {{userGoals}}

Your tasks are:
1.  **Overall Summary**: Write a concise (2-4 sentences) high-level summary of the project. Describe its main purpose and, if truly evident and widely recognizable (e.g., "built with Python and React"), its primary technology stack. **Use plain, everyday language. Avoid technical jargon unless absolutely necessary and briefly explained.** Imagine you're explaining this to a project manager or a new team member from a non-technical department.
2.  **Identify Key Modules/Components**: Identify 3-5 (but no less than 2 and no more than 7) of the most important **conceptual, high-level functional areas or main parts** of this project, based on the analysis. These should be understandable to someone trying to get a general idea of what the project *does* and how it's broadly organized, rather than just code-level directories. For each key module:
    *   "name": A short, descriptive, and intuitive name for the module (e.g., "User Sign-up & Login", "Product Catalog Display", "Payment Processing Gateway", "Main Data Analysis Engine").
    *   "description": A 1-2 sentence **plain-language description of what this module's primary responsibility or purpose is from a user's or business perspective.** What does it achieve?
    *   "filePaths" (optional): If specific files clearly define this module, list 1-3 of the most relevant file paths. This is optional and should only be included if it adds significant clarity for a slightly more technical user.

Focus on providing a simplified, bird's-eye view that a non-expert could grasp. If user goals are provided, try to tailor the summary and module identification to those goals.

Output strictly as a JSON object matching the specified output schema.
Ensure 'keyModules' array has between 2 and 7 items.
If the provided analysis seems insufficient to generate a meaningful overview (e.g., very few files, parsing errors in analysisSummary), set the 'error' field in the output. In such cases, 'overallSummary' should state that a detailed overview couldn't be generated and why, and 'keyModules' can be an empty array or contain a single entry like {"name": "Project Files", "description": "General collection of project files, detailed structure not clear from analysis."}.

Example for 'keyModules':
[
  { "name": "User Account Management", "description": "Handles everything related to user registration, login, and profile updates.", "filePaths": ["src/services/user.ts", "src/controllers/authController.ts"] },
  { "name": "Order Processing System", "description": "Manages how customer orders are taken, processed, and tracked through to fulfillment." }
]
`,
});

// --- Genkit Flow ---
export const generateProjectOverviewFlow = ai.defineFlow(
  {
    name: 'generateProjectOverviewFlow',
    inputSchema: GenerateProjectOverviewInputSchema,
    outputSchema: GenerateProjectOverviewOutputSchema,
  },
  async (input) => {
    let projectAnalysis: ProjectAnalysisOutput;
    try {
      // Step 1: Analyze the project structure using the existing tool.
      projectAnalysis = await projectStructureAnalyzerTool.run({
        projectStoragePath: input.projectStoragePath,
        userHint: input.userGoals, // Pass userGoals as a hint to the analyzer
      });

      if (projectAnalysis.error && (!projectAnalysis.detailedNodes || projectAnalysis.detailedNodes.length < 3)) {
        // If analysis itself failed significantly, reflect this in the overview output.
        return {
          overallSummary: `Could not generate a project overview due to issues analyzing the project structure: ${projectAnalysis.error}.`,
          keyModules: [],
          error: `Project structure analysis failed: ${projectAnalysis.error}`,
        };
      }
    } catch (e: any) {
      console.error("Error running projectStructureAnalyzerTool in generateProjectOverviewFlow:", e);
      return {
        overallSummary: "Failed to analyze project structure to generate an overview.",
        keyModules: [],
        error: `Failed to run project analyzer: ${e.message}`,
      };
    }

    try {
      // Step 2: Pass the analysis results to the LLM to generate the overview.
      const { output } = await generateOverviewPrompt({
        analyzedStructure: projectAnalysis,
        userGoals: input.userGoals,
      });

      if (!output) {
        return {
          overallSummary: "AI failed to generate an overview from the project structure.",
          keyModules: [],
          error: "AI prompt output was null or undefined.",
        };
      }
      // Ensure keyModules has at least 2 items if no error, otherwise fulfill schema with empty or error indication
      if (!output.error && output.keyModules.length < 2) {
          if (projectAnalysis.detailedNodes && projectAnalysis.detailedNodes.length > 0) {
              // Attempt to create generic modules if LLM failed to provide enough
              output.keyModules = projectAnalysis.detailedNodes.slice(0, Math.min(2, projectAnalysis.detailedNodes.length)).map(node => ({
                  name: node.label.split('(')[0].trim() || "Unnamed Module",
                  description: node.details || "A component of the project."
              }));
               if (output.keyModules.length < 2) { // Still not enough
                 output.keyModules.push({name: "General Project Files", description: "Other files and components."});
                 if (output.keyModules.length < 2 && output.keyModules.length > 0) { // If only one, add another generic
                    output.keyModules.push({name: "Core Logic", description: "Main functionalities."});
                 } else if (output.keyModules.length === 0) { // If absolutely nothing, create two placeholders
                    output.keyModules = [
                        {name: "Primary Component", description: "A main part of the project."},
                        {name: "Supporting Component", description: "Another significant part of the project."}
                    ];
                 }
              }
              output.overallSummary += " (Key modules derived generically due to limited AI output.)";
          } else {
             // If no detailed nodes either, this is a very sparse project or analysis failed more deeply
             output.keyModules = [
                {name: "Project Files", description: "The files comprising the project."},
                {name: "Overall Structure", description: "The general organization."}
             ];
             output.overallSummary = output.overallSummary || "A basic project structure was analyzed.";
             output.error = output.error || "Limited information available for a detailed overview.";
          }
      }


      return output;
    } catch (e: any) {
      console.error("Error in generateOverviewPrompt call:", e);
      return {
        overallSummary: "An error occurred while AI was generating the project overview.",
        keyModules: [],
        error: `AI overview generation failed: ${e.message}`,
      };
    }
  }
);
