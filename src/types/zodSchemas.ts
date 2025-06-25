import { z } from 'zod';

export const ConceptMapNodeSchema = z.object({
  id: z.string(),
  text: z.string(),
  type: z.string(),
  details: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  parentNode: z.string().optional(),
  childIds: z.array(z.string()).optional(),
  backgroundColor: z.string().optional(),
  shape: z.enum(['rectangle', 'ellipse']).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  highlight: z.boolean().optional(),
  // data: z.record(z.any()).optional(), // From graph-adapter.ts, if needed for consistency
});

export const ConceptMapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
  color: z.string().optional(),
  lineType: z.enum(['solid', 'dashed']).optional(),
  markerStart: z.string().optional(), // Could be enum if values are fixed
  markerEnd: z.string().optional(),   // Could be enum if values are fixed
});

export const ConceptMapDataSchema = z.object({
  nodes: z.array(ConceptMapNodeSchema),
  edges: z.array(ConceptMapEdgeSchema),
});

export const ConceptMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  ownerId: z.string(),
  mapData: ConceptMapDataSchema,
  isPublic: z.boolean(),
  sharedWithClassroomId: z.string().nullable().optional(),
  createdAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "createdAt must be a valid ISO string date",
  }),
  updatedAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "updatedAt must be a valid ISO string date",
  }),
});
