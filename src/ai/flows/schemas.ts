import { z } from 'zod';

export const NodeGroupSuggestionSchema = z.object({
  suggestedGroups: z.array(
    z.object({
      reason: z.string(),
      nodeIds: z.array(z.string()),
      groupLabel: z.string(),
    })
  ),
});
