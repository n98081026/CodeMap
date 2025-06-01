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
  projectDescription: z.string().describe('A description of the project.'),
  projectCodeStructure: z.string().describe('The project code structure.'),
});
export type GenerateMapFromProjectInput = z.infer<typeof GenerateMapFromProjectInputSchema>;

const GenerateMapFromProjectOutputSchema = z.object({
  conceptMapData: z.string().describe('The concept map data in JSON format.'),
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
  prompt: `Analyze the following software project's structure and generate a concept map representing its key architectural components, functionalities, and their primary relationships.\n\nProject Description: {{{projectDescription}}}\n\nProject Code Structure: {{{projectCodeStructure}}}\n\nGenerate a concept map with:\n1. Nodes: Represent major directories (as logical blocks), key files (as modules), significant classes/functions (as components or functionalities), and high-level features inferred.\n2. Node Types: Use 'directory', 'file', 'class', 'function', 'feature', 'external_dependency'.\n3. Relationships: Use labels like 'contains', 'imports', 'calls', 'inherits_from', 'implements', 'depends_on'.\n4. Focus on the most important elements to avoid an overly cluttered map.\n\nOutput the concept map data as a JSON object with \"nodes\" (each with \"id\", \"text\", \"type\", optional \"details\") and \"edges\" (each with \"id\", \"source\", \"target\", \"label\") arrays. Ensure node IDs are unique strings.\n\nExample:\n{
  \"nodes\": [
    { \"id\": \"dir_src\", \"text\": \"src Directory\", \"type\": \"directory\" },
    { \"id\": \"file_app_js\", \"text\": \"app.js\", \"type\": \"file\", \"details\": \"Main entry point\" }
  ],
  \"edges\": [
    { \"id\": \"edge1\", \"source\": \"dir_src\", \"target\": \"file_app_js\", \"label\": \"contains\" }
  ]
}`,
});

const generateMapFromProjectFlow = ai.defineFlow(
  {
    name: 'generateMapFromProjectFlow',
    inputSchema: GenerateMapFromProjectInputSchema,
    outputSchema: GenerateMapFromProjectOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
