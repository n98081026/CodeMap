// src/ai/flows/index.ts
export * from './ask-question-about-node';
export * from './expand-concept';
export * from './extract-concepts';
export * from './generate-map-from-project';
export * from './generate-map-snippet-from-text';
export * from './generate-quick-cluster';
export * from './suggest-edge-label'; // Added new flow
export * from './suggest-intermediate-node';
export * from './suggest-quick-child-texts';
export * from './suggest-relations';
export * from './suggest-semantic-parent';
export * from './summarize-nodes-flow';
export * from './suggest-arrangement-action';
export {
  suggestNodeGroupCandidatesFlow,
  NodeGroupSuggestionSchema,
} from './suggest-node-group-candidates';
export * from './suggest-map-improvement';
export * from './refine-node-suggestion'; // Added new flow for refining suggestions
export * from './ai-tidy-up-selection'; // Added new flow for tidying selection

// IMPORTANT: rewrite-node-content-logic.ts (formerly rewrite-node-content-flow.ts) and its exports
// are NOT exported from this barrel file due to persistent module resolution issues.
// Components or hooks needing `rewriteNodeContent` (e.g., RewriteNodeContentModal, useConceptMapAITools)
// MUST import it directly from its own file (e.g., '@/ai/flows/rewrite-node-content-logic.ts').
// Do NOT attempt to re-export from this index.ts file.
