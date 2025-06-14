import useConceptMapStore from './concept-map-store';
import type { ConceptMapNode } from '@/types'; // For type checking
import { getNodePlacement } from '@/lib/layout-utils'; // Assuming this can be imported and used
import { expandConcept as aiExpandConcept } from '@/ai/flows'; // Direct import of the AI flow

const GRID_SIZE_FOR_AI_PLACEMENT = 20; // Matching the hook

async function testQuickExpandExecution() {
  const { getState, setState } = useConceptMapStore;

  // 1. Setup
  getState().clearDebugLogs();
  getState().addDebugLog("[TestQuickExpandLogic] Debug logs cleared.");
  console.log("--- Debug logs cleared ---");

  getState().initializeNewMap('test-user-quick-expand');
  getState().addDebugLog("[TestQuickExpandLogic] initializeNewMap('test-user-quick-expand') called.");
  console.log("--- Store initialized for 'test-user-quick-expand' ---");

  const sourceNodeOpts = { text: 'Main Topic for AI Expand', type: 'source-topic', position: { x: 200, y: 200 } };
  const sourceNodeId = getState().addNode(sourceNodeOpts);
  getState().addDebugLog(`[TestQuickExpandLogic] Added source node: ${sourceNodeId}. Initial Node count: ${getState().mapData.nodes.length}`);
  console.log(`Added source node: ${sourceNodeId}. Node count: ${getState().mapData.nodes.length}`);

  // Replicating handleMiniToolbarQuickExpand logic:
  getState().addDebugLog(`[TestQuickExpandLogic] Starting Quick Expand logic for node: ${sourceNodeId}`);
  console.log(`--- Starting Quick Expand logic for node: ${sourceNodeId} ---`);

  const sourceNode = getState().mapData.nodes.find(n => n.id === sourceNodeId);
  if (!sourceNode) {
    const errorMsg = `[TestQuickExpandLogic] ERROR: Source node ${sourceNodeId} not found! Aborting.`;
    getState().addDebugLog(errorMsg);
    console.error(errorMsg);
    // Output current logs before returning due to error
    const errorLogs = getState().debugLogs;
    console.log(JSON.stringify(errorLogs));
    return;
  }

  getState().setAiProcessingNodeId(sourceNodeId);
  getState().addDebugLog(`[TestQuickExpandLogic] setAiProcessingNodeId('${sourceNodeId}')`);

  try {
    const neighborIds = new Set<string>();
    getState().mapData.edges?.forEach(edge => {
        if (edge.source === sourceNode.id) neighborIds.add(edge.target);
        if (edge.target === sourceNode.id) neighborIds.add(edge.source);
    });
    const existingMapContext = Array.from(neighborIds)
        .map(id => getState().mapData.nodes.find(n => n.id === id)?.text)
        .filter((text): text is string => !!text)
        .slice(0, 2);
    getState().addDebugLog(`[TestQuickExpandLogic] Context for AI: ${JSON.stringify(existingMapContext)}`);

    const output = await aiExpandConcept({
      concept: sourceNode.text,
      existingMapContext: existingMapContext,
      userRefinementPrompt: "Generate one concise, directly related child idea for this concept. Focus on a primary sub-topic or component.",
    });
    getState().addDebugLog(`[TestQuickExpandLogic] AI flow 'aiExpandConcept' output: ${JSON.stringify(output)}`);

    if (output.expandedIdeas && output.expandedIdeas.length > 0) {
      const idea = output.expandedIdeas[0];
      const currentNodes = getState().mapData.nodes; // Get fresh nodes list
      const newNodeOpts = {
        text: idea.text,
        type: 'ai-expanded',
        position: getNodePlacement(currentNodes, 'child', sourceNode, null, GRID_SIZE_FOR_AI_PLACEMENT),
        parentNode: sourceNodeId,
      };
      const newNodeId = getState().addNode(newNodeOpts);
      getState().addDebugLog(`[TestQuickExpandLogic] Added new AI node: ${newNodeId}. Options: ${JSON.stringify(newNodeOpts)}. Node count: ${getState().mapData.nodes.length}`);
      console.log(`Added new AI node: ${newNodeId}. Node count: ${getState().mapData.nodes.length}`);

      if (newNodeId) {
        getState().addEdge({
          source: sourceNodeId,
          target: newNodeId,
          label: idea.relationLabel || 'related to',
        });
        getState().addDebugLog(`[TestQuickExpandLogic] Added edge between ${sourceNodeId} and ${newNodeId}. Edge count: ${getState().mapData.edges.length}`);
        console.log(`Added edge between ${sourceNodeId} and ${newNodeId}.`);
      }
      console.log(`--- Quick Expand AI processing successful for: ${idea.text} ---`);
    } else {
      getState().addDebugLog("[TestQuickExpandLogic] AI returned no expanded ideas.");
      console.log("--- AI returned no expanded ideas ---");
    }
  } catch (error: any) {
    const errorMsg = `[TestQuickExpandLogic] ERROR during AI operation: ${error.message || error}`;
    getState().addDebugLog(errorMsg);
    console.error(errorMsg);
  } finally {
    getState().setAiProcessingNodeId(null);
    getState().addDebugLog("[TestQuickExpandLogic] setAiProcessingNodeId(null)");
  }

  console.log("--- Quick Expand logic finished ---");

  // Retrieve and print all debug logs
  const logs = getState().debugLogs;
  console.log("---Collected Logs Start---");
  // Print as JSON string for easier parsing by the calling environment
  console.log(JSON.stringify(logs, null, 2));
  console.log("---Collected Logs End---");
}

testQuickExpandExecution().catch(err => {
  // This catch is for issues in testQuickExpandExecution itself, not for AI errors handled within.
  console.error("Critical error in testQuickExpandExecution:", err.message || err);
  useConceptMapStore.getState().addDebugLog(`[TestQuickExpandLogic] CRITICAL SCRIPT ERROR: ${err.message || err}`);
  // Still try to print logs if the script fails catastrophically
  const logs = useConceptMapStore.getState().debugLogs;
  console.log("---Collected Logs (on critical error) Start---");
  console.log(JSON.stringify(logs, null, 2));
  console.log("---Collected Logs (on critical error) End---");
});
