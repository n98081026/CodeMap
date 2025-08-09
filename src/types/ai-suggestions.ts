import { z } from 'zod';

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
  labelToIntermediate: z.string(), // Added to align with suggestMapImprovementFlow
  labelFromIntermediate: z.string(), // Added to align with suggestMapImprovementFlow
});

export const FormGroupDataSchema = z.object({
  nodeIdsToGroup: z.array(z.string()),
  suggestedParentName: z.string(), // Made suggestedParentName mandatory
});

// Base schema for common properties across all suggestion types
const BaseSuggestionSchema = z.object({
  id: z.string().uuid(),
  reason: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'dismissed']),
});

// Discriminated union for individual suggestion items
// This allows TypeScript to correctly infer the type of `data` based on the `type` property.
export const StructuralSuggestionItemSchema = z.discriminatedUnion('type', [
  BaseSuggestionSchema.merge(
    z.object({
      type: z.literal('ADD_EDGE'),
      data: AddEdgeDataSchema,
    })
  ),
  BaseSuggestionSchema.merge(
    z.object({
      type: z.literal('NEW_INTERMEDIATE_NODE'),
      data: NewIntermediateNodeDataSchema,
    })
  ),
  BaseSuggestionSchema.merge(
    z.object({
      type: z.literal('FORM_GROUP'),
      data: FormGroupDataSchema,
    })
  ),
]);

// Schema for the array of suggestions
export const AllStructuralSuggestionsSchema = z.array(
  StructuralSuggestionItemSchema
);

export interface VisualEdgeSuggestion {
  source: string;
  target: string;
  label: string;
}
