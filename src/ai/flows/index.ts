
// src/ai/flows/index.ts
export * from './ask-question-about-node';
export * from './expand-concept';
export * from './extract-concepts';
export * from './generate-map-from-project';
export * from './generate-map-snippet-from-text';
export * from './generate-quick-cluster';
export * from './suggest-relations';
export * from './summarize-nodes-flow';

// IMPORTANT: rewrite-node-content-flow.ts and its exports
// are NOT exported from this barrel file due to persistent resolution issues.
// Components or hooks needing `rewriteNodeContent` (e.g., RewriteNodeContentModal, useConceptMapAITools)
// MUST import it directly from its own file (e.g., '../ai/flows/rewrite-node-content-flow' or '@/ai/flows/rewrite-node-content-flow').
// Do NOT attempt to re-export from this index.ts file.
// Example of what NOT to do:
// import {
//   RewriteNodeContentInputSchema,
//   type RewriteNodeContentInput,
//   RewriteNodeContentOutputSchema,
//   type RewriteNodeContentOutput,
//   rewriteNodeContent,
// } from './rewrite-node-content-flow'; // This line (and related exports) should remain commented out or removed.

// export {
//   RewriteNodeContentInputSchema,
//   type RewriteNodeContentInput,
//   RewriteNodeContentOutputSchema,
//   type RewriteNodeContentOutput,
//   rewriteNodeContent,
// };
