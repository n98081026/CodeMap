
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-map-from-project.ts';
import '@/ai/flows/expand-concept.ts';
import '@/ai/flows/suggest-relations.ts';
import '@/ai/flows/extract-concepts.ts';
import '@/ai/tools/project-analyzer-tool.ts';
import '@/ai/flows/generate-quick-cluster.ts';
import '@/ai/flows/ask-question-about-node.ts';
import '@/ai/flows/generate-map-snippet-from-text.ts';
import '@/ai/flows/summarize-nodes-flow.ts'; // Import the new flow

