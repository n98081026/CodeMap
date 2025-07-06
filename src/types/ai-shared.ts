// src/types/ai-shared.ts

/**
 * Simplified node structure for AI flow inputs.
 * Ensure this aligns with the actual expectations of the AI flows.
 */
export interface AISharedSimplifiedNodeInput {
  id: string;
  text: string;
  details?: string;
  // Add other common properties if flows expect them, e.g., type, parentNode
}

/**
 * Simplified edge structure for AI flow inputs.
 * Ensure this aligns with the actual expectations of the AI flows.
 */
export interface AISharedSimplifiedEdgeInput {
  source: string;
  target: string;
  label?: string;
  // Add other common properties if flows expect them
}

/**
 * Input structure for flows that suggest map improvements or
 * fetch structural suggestions, typically involving a list of nodes and edges.
 */
export interface AISharedNodesAndEdgesInput {
  nodes: AISharedSimplifiedNodeInput[];
  edges: AISharedSimplifiedEdgeInput[];
  // userQuery?: string; // Optional: if some flows take an additional query
}

// Specific type aliases for clarity if needed, though they might be identical to AISharedNodesAndEdgesInput
export type AISuggestMapImprovementsInput = AISharedNodesAndEdgesInput;
export type AIFetchAllStructuralSuggestionsInput = AISharedNodesAndEdgesInput;

// If a flow has a more unique input structure, define it separately here.
// Example:
// export interface AISpecificFlowInput extends AISharedNodesAndEdgesInput {
//   specificParameter: string;
// }
