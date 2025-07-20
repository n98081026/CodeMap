import { z } from 'zod';

export const MapDataSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      details: z.string().optional(),
    })
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    })
  ),
});

export const NewIntermediateNodeDataSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  intermediateNodeText: z.string(),
  labelToIntermediate: z.string(),
  labelFromIntermediate: z.string(),
});

export const MapImprovementSuggestionSchema = z.object({
  type: z.enum(['NEW_INTERMEDIATE_NODE']),
  data: NewIntermediateNodeDataSchema,
  reason: z.string().optional(),
});
