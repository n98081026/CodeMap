
// src/ai/flows/ask-question-about-node.ts
'use server';
/**
 * @fileOverview A Genkit flow to answer a user's question about a specific concept map node.
 *
 * - askQuestionAboutNode - A function that handles answering the question.
 * - AskQuestionAboutNodeInput - The input type for the function.
 * - AskQuestionAboutNodeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Updated Input Schema
export const AskQuestionAboutNodeInputSchema = z.object({
  nodeId: z.string().describe("The ID of the node the question is about."),
  nodeText: z.string().describe("The main text/label of the node."),
  nodeDetails: z.string().optional().describe("The detailed description or content of the node."),
  nodeType: z.string().optional().describe("The type of the node (e.g., 'js_function', 'py_class', 'ai-summary-node')."),
  userQuestion: z.string().min(5).describe("The user's question about this specific node."),
});
export type AskQuestionAboutNodeInput = z.infer<typeof AskQuestionAboutNodeInputSchema>;

// Updated Output Schema
export const AskQuestionAboutNodeOutputSchema = z.object({
  answer: z.string().describe("The AI's answer to the user's question, explained in simple terms."),
  error: z.string().optional().describe("Error message if the question could not be answered."),
});
export type AskQuestionAboutNodeOutput = z.infer<typeof AskQuestionAboutNodeOutputSchema>;

export async function askQuestionAboutNode(input: AskQuestionAboutNodeInput): Promise<AskQuestionAboutNodeOutput> {
  return askQuestionAboutNodeFlow(input);
}

// Updated Prompt
const answerNodeQuestionPrompt = ai.definePrompt({
  name: 'answerNodeQuestionPrompt', // Renamed for clarity
  input: {schema: AskQuestionAboutNodeInputSchema},
  output: {schema: AskQuestionAboutNodeOutputSchema},
  prompt: `You are a helpful AI assistant embedded in a concept mapping tool. Your primary goal is to explain specific concepts or elements from a concept map to a user, **as if you are explaining it to someone who may not have a deep technical background.** Use simple, clear, and direct language.

The user is asking a question about a specific node in their concept map. Here's the information about the node:
- Node Label (Text): "{{nodeText}}"
{{#if nodeType}}
- Node Type: "{{nodeType}}"  // This might be 'js_function', 'py_class', 'ai-summary-node', 'user-defined-concept', etc.
{{/if}}
{{#if nodeDetails}}
- Node Details/Content:
  """
  {{nodeDetails}} // This could be code snippets, AI-generated summaries, or user notes.
  """
{{else}}
- Node Details/Content: (No additional details provided for this node)
{{/if}}

The user's question is: "{{userQuestion}}"

Please answer the user's question based *strictly* on the information provided about this specific node (Label, Type, Details).
- **Explain things like you're talking to a curious friend who is smart but not a software engineer.** Avoid jargon. If a technical term from the node's content is essential to the answer, briefly explain what it means in simple terms.
- If the node's type is 'ai-summary-node' or similar, and the user asks for clarification, try to rephrase or simplify the existing summary in the node's details.
- If the question cannot be answered with the given node information, politely state that. Explain *why* you cannot answer (e.g., "This node's details don't include information about its performance.") and, **if appropriate, suggest what other information might be helpful** (e.g., "To understand its performance, one might need to look at the surrounding system or run specific tests.").
- **Do not make up information or answer questions about topics outside the scope of this specific node's provided information.** Do not infer relationships to other nodes unless explicitly stated in the current node's details.
- If the node details are extensive, focus your answer on the parts most relevant to the user's question.

Format your response as a JSON object with an "answer" field containing your explanation. If an error occurs or the question is unanswerable from the context, include an "error" field with a brief explanation of the issue.

Example (success for a code-like node): {"answer": "This node, labeled 'getUserData', is a JavaScript function. Based on its details, it likely takes a user ID and fetches that user's information, possibly from a database or another service."}
Example (success for an 'ai-summary-node' asking for clarification): {"answer": "This 'AI Summary' node means that the system tried to automatically summarize a larger piece of information. The summary 'User login process' indicates it's about how users access the system."}
Example (cannot answer): {"answer": "I'm sorry, I can't determine the exact performance implications from this node's information alone, as the details don't cover performance metrics.", "error": "Information not available in the provided node context."}
Example (question out of scope): {"answer": "This node describes 'Database Connection Pooling'. While related to databases, I can't tell you about specific database server brands from this information alone.", "error": "Information out of scope for this node."}
`,
});

const askQuestionAboutNodeFlow = ai.defineFlow(
  {
    name: 'askQuestionAboutNodeFlow',
    inputSchema: AskQuestionAboutNodeInputSchema,
    outputSchema: AskQuestionAboutNodeOutputSchema,
  },
  async (input) => {
    try {
      if (!input.userQuestion.trim() || input.userQuestion.length < 5) {
        return { answer: "Your question seems a bit short. Could you please provide more details?", error: "Question too short or empty." };
      }

      const { output } = await answerNodeQuestionPrompt(input);

      if (!output) {
        return {
          answer: "Sorry, I couldn't generate an answer at this time.",
          error: "AI prompt output was null or undefined.",
        };
      }

      if (!output.answer && output.error) {
          output.answer = `I encountered an issue: ${output.error}`;
      } else if (!output.answer && !output.error) {
          output.answer = "I'm unable to provide an answer for that question based on the current node's information.";
          output.error = "No specific answer generated by AI.";
      }

      return output;

    } catch (e: any) {
      console.error("Error in askQuestionAboutNodeFlow:", e);
      return {
        answer: "An unexpected error occurred while trying to answer your question.",
        error: `Flow execution failed: ${e.message}`,
      };
    }
  }
);

