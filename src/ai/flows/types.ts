export interface AskQuestionAboutNodeInput {
  nodeId: string;
  nodeText: string;
  nodeDetails: string | undefined;
  nodeType: string | undefined;
  question: string;
}

export interface AskQuestionAboutNodeOutput {
  answer: string;
  error?: string;
}

export interface ExtractConceptsOutput {
  concepts: {
    text: string;
    reason: string;
  }[];
}

export interface SuggestRelationsOutput {
  relations: {
    sourceNodeId: string;
    targetNodeId: string;
    label: string;
    reason: string;
  }[];
}

export interface ExpandConceptOutput {
  newConcepts: {
    text: string;
    reason: string;
  }[];
  edges?: {
    source: string;
    target: string;
    label: string;
  }[];
}

export interface RewriteNodeContentOutput {
  rewrittenText: string;
}
