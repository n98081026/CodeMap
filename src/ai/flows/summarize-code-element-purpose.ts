import { defineFlow, ai } from 'genkit/flow';
import * as z from 'zod';

// Define Zod schema for the input
export const SummarizeCodeElementInputSchema = z.object({
  elementType: z.enum(['function', 'class']),
  elementName: z.string(),
  signature: z.string().optional().describe("e.g., for a function: (price: number, quantity: number): number, for a class: extends BaseService implements IOrderable"),
  filePath: z.string(),
  comments: z.string().optional().describe("JSDoc or other extracted comments"),
  isExported: z.boolean().optional(),
  // For classes:
  classMethods: z.array(z.string()).optional().describe("Array of method signatures or names, e.g., [\"processOrder(order: Order): boolean\", \"getHistory(): Order[]\"]"),
  classProperties: z.array(z.string()).optional().describe("Array of property signatures, e.g., [\"orderQueue: Queue<Order>\", \"maxRetries: number (private)\"]"),
});
export type SummarizeCodeElementInput = z.infer<typeof SummarizeCodeElementInputSchema>;

// Define Zod schema for the output
export const SummarizeCodeElementOutputSchema = z.object({
  semanticSummary: z.string().describe("1-2 sentence summary of the element's purpose, or 'Purpose unclear from available data.'"),
});
export type SummarizeCodeElementOutput = z.infer<typeof SummarizeCodeElementOutputSchema>;

// Define the LLM Prompt
const summarizeCodeElementPurposePrompt = ai.definePrompt({
  name: 'summarizeCodeElementPurposePrompt',
  input: { schema: SummarizeCodeElementInputSchema },
  output: { schema: SummarizeCodeElementOutputSchema },
  prompt: `You are an expert software developer documentation writer. Your task is to generate a concise (1-2 sentence) semantic summary of the purpose or responsibility of a given code element (function or class) based on its signature, associated comments, and other metadata.

Code Element Details:
- Type: {{{elementType}}}
- Name: {{{elementName}}}
{{#if signature}}- Signature/Context: {{{signature}}}{{/if}}
- File Path: {{{filePath}}}
{{#if isExported}}- Exported: Yes{{else}}- Exported: No{{/if}}
{{#if comments}}
- Associated Comments:
{{{comments}}}
{{/if}}
{{#if classMethods}}
- Class Methods (if applicable):
  {{#each classMethods}}- {{{this}}}{{/each}}
{{/if}}
{{#if classProperties}}
- Class Properties (if applicable):
  {{#each classProperties}}- {{{this}}}{{/each}}
{{/if}}

Based on all the provided information:
1.  Infer the primary purpose or responsibility of this {{{elementType}}} named '{{{elementName}}}'.
2.  Describe this purpose in 1-2 concise sentences.
3.  Focus on what it *does* or *manages*.
4.  Avoid simply re-stating the signature or comments if possible; synthesize their meaning.
5.  If the purpose is genuinely unclear from the provided information (e.g., only a name is available with no comments or indicative signature), respond with the phrase "Purpose unclear from available data."

Output your 1-2 sentence summary directly as a plain string for the 'semanticSummary' field of the JSON output. If unclear, use "Purpose unclear from available data." for 'semanticSummary'.
Ensure the output is a valid JSON object matching the defined output schema. Example: {"semanticSummary": "This function calculates the total price by multiplying price and quantity."}
`,
});

// Define the Flow
export const summarizeCodeElementPurposeFlow = defineFlow(
  {
    name: 'summarizeCodeElementPurposeFlow',
    inputSchema: SummarizeCodeElementInputSchema,
    outputSchema: SummarizeCodeElementOutputSchema,
  },
  async (input) => {
    const llmResponse = await summarizeCodeElementPurposePrompt.generate({ input, temperature: 0.4 }); // Adjust temperature as needed
    const output = llmResponse.output();
    if (!output) {
        // This case should ideally be handled by Genkit's schema validation or prompt erroring
        // but as a fallback if output is null/undefined unexpectedly.
        return { semanticSummary: "Purpose unclear due to generation error." };
    }
    return output; // Already matches SummarizeCodeElementOutputSchema
  }
);
