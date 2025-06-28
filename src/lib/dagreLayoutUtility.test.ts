import { DagreLayoutUtility } from './dagreLayoutUtility';
import type { NodeLayoutInput, EdgeLayoutInput, DagreLayoutOptions, NodePositionOutput } from '../types/graph-adapter';

// Mock dagre library
const mockDagreNode = jest.fn();
const mockDagreSetNode = jest.fn();
const mockDagreSetEdge = jest.fn();
const mockDagreNodes = jest.fn();
const mockDagreLayout = jest.fn();

jest.mock('dagre', () => ({
  graphlib: {
    Graph: jest.fn().mockImplementation(() => ({
      setGraph: jest.fn(),
      setDefaultEdgeLabel: jest.fn(),
      node: mockDagreNode,
      setNode: mockDagreSetNode,
      setEdge: mockDagreSetEdge,
      nodes: mockDagreNodes,
      // Add other methods if needed by the utility
    })),
  },
  layout: mockDagreLayout,
}));

describe('DagreLayoutUtility', () => {
  let dagreUtil: DagreLayoutUtility;

  beforeEach(() => {
    dagreUtil = new DagreLayoutUtility();
    // Reset mocks before each test
    mockDagreNode.mockReset();
    mockDagreSetNode.mockReset();
    mockDagreSetEdge.mockReset();
    mockDagreNodes.mockReset();
    mockDagreLayout.mockReset();
  });

  test('should perform a basic layout and convert coordinates', async () => {
    const nodes: NodeLayoutInput[] = [
      { id: 'n1', width: 100, height: 50, label: 'Node 1' },
      { id: 'n2', width: 120, height: 60, label: 'Node 2' },
    ];
    const edges: EdgeLayoutInput[] = [{ id: 'e1', source: 'n1', target: 'n2' }];

    // Mock Dagre's output (center coordinates)
    mockDagreNodes.mockReturnValue(['n1', 'n2']);
    mockDagreNode.mockImplementation((nodeId) => {
      if (nodeId === 'n1') return { x: 75, y: 25, width: 100, height: 50 }; // Center x, y for n1
      if (nodeId === 'n2') return { x: 75, y: 125, width: 120, height: 60 }; // Center x, y for n2
      return undefined;
    });

    const result = await dagreUtil.layout(nodes, edges);

    expect(mockDagreLayout).toHaveBeenCalled();
    expect(result).toHaveLength(2);

    const node1Result = result.find(n => n.id === 'n1');
    const node2Result = result.find(n => n.id === 'n2');

    expect(node1Result).toBeDefined();
    expect(node2Result).toBeDefined();

    // Check coordinate conversion (center to top-left)
    // x = dagreNode.x - dagreNode.width / 2
    // y = dagreNode.y - dagreNode.height / 2
    expect(node1Result?.x).toBe(75 - 100 / 2); // 25
    expect(node1Result?.y).toBe(25 - 50 / 2);   // 0
    expect(node2Result?.x).toBe(75 - 120 / 2); // 15
    expect(node2Result?.y).toBe(125 - 60 / 2);  // 95
  });

  test('should apply default dimensions if not provided', async () => {
    const nodes: NodeLayoutInput[] = [{ id: 'n1', label: 'Node 1' }]; // No width/height
    const edges: EdgeLayoutInput[] = [];
    const options: DagreLayoutOptions = { defaultNodeWidth: 200, defaultNodeHeight: 80 };

    mockDagreNodes.mockReturnValue(['n1']);
    mockDagreNode.mockReturnValue({ x: 100, y: 40, width: 200, height: 80 }); // Dagre would use the defaults we pass

    await dagreUtil.layout(nodes, edges, options);

    expect(mockDagreSetNode).toHaveBeenCalledWith('n1', {
      width: 200,
      height: 80,
      label: 'Node 1',
    });
  });

  test('should handle layout options like direction', async () => {
    const nodes: NodeLayoutInput[] = [{ id: 'n1', width: 100, height: 50 }];
    const graphInstance = (dagre as any).graphlib.Graph.mock.results[0].value; // Get the mocked graph instance

    await dagreUtil.layout(nodes, [], { direction: 'LR' });
    expect(graphInstance.setGraph).toHaveBeenCalledWith(expect.objectContaining({ rankdir: 'LR' }));

    await dagreUtil.layout(nodes, [], { direction: 'TB' });
    expect(graphInstance.setGraph).toHaveBeenCalledWith(expect.objectContaining({ rankdir: 'TB' }));

    // Test default direction
    await dagreUtil.layout(nodes, [], {});
    expect(graphInstance.setGraph).toHaveBeenCalledWith(expect.objectContaining({ rankdir: 'TB' }));
  });

  test('should handle empty nodes and edges gracefully', async () => {
    mockDagreNodes.mockReturnValue([]);
    const result = await dagreUtil.layout([], []);
    expect(result).toEqual([]);
    expect(mockDagreLayout).toHaveBeenCalled(); // layout is still called on the empty graph
  });

  test('should warn if edge references non-existent node', async () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const nodes: NodeLayoutInput[] = [{ id: 'n1', width: 100, height: 50 }];
    // n2 does not exist in nodes array
    const edges: EdgeLayoutInput[] = [{ id: 'e1', source: 'n1', target: 'n2' }];

    // Mock hasNode to reflect the actual nodes set
    const graphInstance = (dagre as any).graphlib.Graph.mock.results[0].value;
    graphInstance.hasNode = jest.fn(id => id === 'n1');


    mockDagreNodes.mockReturnValue(['n1']); // Only n1 is processed by dagre
    mockDagreNode.mockReturnValue({ x: 50, y: 25, width: 100, height: 50 });


    await dagreUtil.layout(nodes, edges);

    expect(mockDagreSetEdge).not.toHaveBeenCalled(); // Edge should not be set
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Dagre layout: edge references non-existent node. Source: n1, Target: n2"
    );
    consoleWarnSpy.mockRestore();
  });

  // TODO: Add more tests for other options (ranksep, nodesep, etc.) - these are harder to assert precisely
  // TODO: Test edge properties like minlen, weight if they have a noticeable effect with dagre's mock
});
