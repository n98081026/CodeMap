import { z } from 'zod';

// Schema for individual suggestion items
export const StructuralSuggestionItemSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['ADD_EDGE', 'NEW_INTERMEDIATE_NODE', 'FORM_GROUP']),
  data: z.any(), // The flow will ensure data structure corresponds to 'type'.
                  // Client-side will interpret 'data' based on 'type'.
  reason: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'dismissed']),
});

// Schema for the array of suggestions
export const AllStructuralSuggestionsSchema = z.array(StructuralSuggestionItemSchema);

// Specific data schemas for each suggestion type, to be used by the orchestrating flow
// and potentially by the client for type assertion/parsing if needed.

// This AddEdgeDataSchema is for structural suggestions like "link X to Y"
// The suggestRelationsFlow output is different and handled by its own schema.
export const AddEdgeDataSchema = z.object({
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    label: z.string(),
    reason: z.string().optional(), // Added reason here as well for consistency if structural suggestions also provide it
});

export const NewIntermediateNodeDataSchema = z.object({
    sourceNodeId: z.string(),
    targetNodeId: z.string(), // This is the original target
    intermediateNodeText: z.string(), // Changed from newNodeText to align with suggestMapImprovementFlow
    labelToIntermediate: z.string(),   // Added to align with suggestMapImprovementFlow
    labelFromIntermediate: z.string(), // Added to align with suggestMapImprovementFlow
});

export const FormGroupDataSchema = z.object({
    nodeIdsToGroup: z.array(z.string()),
    suggestedParentName: z.string(), // Made suggestedParentName mandatory
});
