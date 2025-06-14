import useConceptMapStore from './concept-map-store';
import type { ConceptMapNode } from '@/types'; // For type checking

// Simplified getNodePlacement for test script.
// In a real scenario, this would use the more complex layout-utils.
const getTestNodePlacement = (nodes: ConceptMapNode[], parentNode: ConceptMapNode | undefined, offsetIndex: number) => {
  if (parentNode) {
    return { x: parentNode.x + 50 + (offsetIndex * 10), y: parentNode.y + 100 + (offsetIndex * 10) };
  }
  return { x: 100 + (offsetIndex * 160), y: 250 + (offsetIndex * 10) }; // Fallback if no parent
};

async function testQuickExpand() {
  const { getState, setState } = useConceptMapStore;

  // 1. Setup
  getState().clearDebugLogs();
  console.log("--- Debug logs cleared ---");
  getState().addDebugLog("[QuickExpandTest] Debug logs cleared.");

  getState().initializeNewMap('test-user-mini-toolbar');
  getState().addDebugLog("[QuickExpandTest] initializeNewMap('test-user-mini-toolbar') called.");
  console.log("--- Store initialized for 'test-user-mini-toolbar' ---");

  const sourceNodeOpts = { text: 'Source Node for Quick Expand', type: 'test-source', position: { x: 100, y: 100 } };
  const sourceNodeId = getState().addNode(sourceNodeOpts);
  getState().addDebugLog(`[QuickExpandTest] Added Source Node ID: ${sourceNodeId}. Initial Node count: ${getState().mapData.nodes.length}`);
  console.log(`Added Source Node ID: ${sourceNodeId}. Initial Node count: ${getState().mapData.nodes.length}`);

  // 2. Simulate "Quick Expand" Action (Replicating logic from handleMiniToolbarQuickExpand)
  getState().addDebugLog(`[QuickExpandTest] Simulating Quick Expand for node: ${sourceNodeId}`);
  console.log(`--- Simulating Quick Expand for node: ${sourceNodeId} ---`);

  const sourceNode = getState().mapData.nodes.find(n => n.id === sourceNodeId);
  if (!sourceNode) {
    getState().addDebugLog(`[QuickExpandTest] ERROR: Source node ${sourceNodeId} not found! Aborting test.`);
    console.error(`ERROR: Source node ${sourceNodeId} not found! Aborting test.`);
    return;
  }

  getState().setAiProcessingNodeId(sourceNodeId);
  getState().addDebugLog(`[QuickExpandTest] setAiProcessingNodeId called for ${sourceNodeId}.`);

  // Simulate AI call delay (shortened for test)
  await new Promise(resolve => setTimeout(resolve, 50));
  getState().addDebugLog("[QuickExpandTest] Simulated AI delay complete.");

  // Add first expanded node
  const expandedNode1Opts = {
    text: "Expanded Idea 1 (AI Test)",
    type: 'ai-expanded',
    position: getTestNodePlacement(getState().mapData.nodes, sourceNode, 0),
    parentNode: sourceNodeId,
  };
  const idea1Id = getState().addNode(expandedNode1Opts);
  getState().addDebugLog(`[QuickExpandTest] Added Expanded Node 1 ID: ${idea1Id}. Parent: ${sourceNodeId}. Node count: ${getState().mapData.nodes.length}`);
  console.log(`Added Expanded Node 1 ID: ${idea1Id}. Parent: ${sourceNodeId}. Node count: ${getState().mapData.nodes.length}`);
  if (idea1Id) {
    getState().addEdge({ source: sourceNodeId, target: idea1Id, label: "expands to (test)" });
    getState().addDebugLog(`[QuickExpandTest] Added edge from ${sourceNodeId} to ${idea1Id}. Edge count: ${getState().mapData.edges.length}`);
    console.log(`Added edge from ${sourceNodeId} to ${idea1Id}.`);
  }

  // Add second expanded node
  const expandedNode2Opts = {
    text: "Expanded Idea 2 (AI Test)",
    type: 'ai-expanded',
    position: getTestNodePlacement(getState().mapData.nodes, sourceNode, 1),
    parentNode: sourceNodeId,
  };
  const idea2Id = getState().addNode(expandedNode2Opts);
  getState().addDebugLog(`[QuickExpandTest] Added Expanded Node 2 ID: ${idea2Id}. Parent: ${sourceNodeId}. Node count: ${getState().mapData.nodes.length}`);
  console.log(`Added Expanded Node 2 ID: ${idea2Id}. Parent: ${sourceNodeId}. Node count: ${getState().mapData.nodes.length}`);
  if (idea2Id) {
    getState().addEdge({ source: sourceNodeId, target: idea2Id, label: "related to (test)" });
    getState().addDebugLog(`[QuickExpandTest] Added edge from ${sourceNodeId} to ${idea2Id}. Edge count: ${getState().mapData.edges.length}`);
    console.log(`Added edge from ${sourceNodeId} to ${idea2Id}.`);
  }

  getState().setAiProcessingNodeId(null);
  getState().addDebugLog("[QuickExpandTest] setAiProcessingNodeId(null) called.");
  console.log("--- Quick Expand simulation complete ---");

  // Log final state of relevant nodes for verification
  const finalSourceNode = getState().mapData.nodes.find(n => n.id === sourceNodeId);
  const finalIdea1Node = getState().mapData.nodes.find(n => n.id === idea1Id);
  const finalIdea2Node = getState().mapData.nodes.find(n => n.id === idea2Id);
  getState().addDebugLog(`[QuickExpandTest] Final sourceNode: ${JSON.stringify(finalSourceNode)}`);
  getState().addDebugLog(`[QuickExpandTest] Final idea1Node: ${JSON.stringify(finalIdea1Node)}`);
  getState().addDebugLog(`[QuickExpandTest] Final idea2Node: ${JSON.stringify(finalIdea2Node)}`);


  // 3. Retrieve and Return All Debug Logs
  const logs = getState().debugLogs;
  console.log("---Collected Logs Start---");
  logs.forEach((log: string) => console.log(log));
  console.log("---Collected Logs End---");
}

testQuickExpand().catch(err => {
  console.error("Error during Quick Expand test:", err.message || err);
  // Add a specific log for errors to the store's debug log if possible
  useConceptMapStore.getState().addDebugLog(`[QuickExpandTest] ERROR: ${err.message || err}`);
});
