// src/ai/flows/index.ts
export * from './ask-question-about-node';
export * from './expand-concept';
export * from './extract-concepts';
export * from './generate-map-from-project';
export * from './generate-map-snippet-from-text';
export * from './generate-quick-cluster';
export * from './suggest-relations';
export * from './summarize-nodes-flow';

// Explicitly import and re-export for rewrite-node-content-flow
// Changed from './rewrite-node-content-flow' to '@/ai/flows/rewrite-node-content-flow'
import {
  RewriteNodeContentInputSchema,
  type RewriteNodeContentInput,
  RewriteNodeContentOutputSchema,
  type RewriteNodeContentOutput,
  rewriteNodeContent
} from '@/ai/flows/rewrite-node-content-flow'; 

export {
  RewriteNodeContentInputSchema,
  type RewriteNodeContentInput,
  RewriteNodeContentOutputSchema,
  type RewriteNodeContentOutput,
  rewriteNodeContent
};
    
