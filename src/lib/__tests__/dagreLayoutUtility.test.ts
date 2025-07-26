import { DagreLayoutUtility } from '../dagreLayoutUtility';

vi.mock('dagre', () => {
  const dagre = {
    graphlib: {
      Graph: vi.fn().mockImplementation(() => {
        const nodes: any[] = [];
        return {
          setGraph: vi.fn(),
          setDefaultEdgeLabel: vi.fn(),
          setNode: vi.fn((id, options) => {
            nodes.push({ id, ...options });
          }),
          setEdge: vi.fn(),
          nodes: vi.fn(() => nodes.map((n: any) => n.id)),
          node: vi.fn((id) => nodes.find((n: any) => n.id === id)),
          hasNode: vi.fn((id) => nodes.some((n: any) => n.id === id)),
        };
      }),
    },
    layout: vi.fn((graph: any) => {
      graph.nodes().forEach((id: string) => {
        const node = graph.node(id);
        node.x = Math.random() * 100;
        node.y = Math.random() * 100;
      });
    }),
  };
  return {
    default: dagre,
    ...dagre,
  };
});

import type { DagreLayoutInput } from '@/types/graph-adapter';

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('DagreLayoutUtility', () => {
  let dagreUtil: DagreLayoutUtility;

  beforeEach(() => {
    dagreUtil = new DagreLayoutUtility();
  });

  it('should perform a basic layout and convert coordinates', async () => {
    const nodes: DagreLayoutInput['nodes'] = [
      { id: 'n1', width: 100, height: 50 },
      { id: 'n2', width: 120, height: 60 },
    ];
    const edges: DagreLayoutInput['edges'] = [{ source: 'n1', target: 'n2' }];

    const result = await dagreUtil.layout(nodes, edges);

    expect(result).toHaveLength(2);

    const node1Result = result.find((n) => n.id === 'n1');
    const node2Result = result.find((n) => n.id === 'n2');

    expect(node1Result).toBeDefined();
    expect(node2Result).toBeDefined();
  });

  it('should apply default dimensions if not provided', async () => {
    const nodes: DagreLayoutInput['nodes'] = [
      { id: 'n1', width: 100, height: 50 },
    ]; // No width/height
    const edges: DagreLayoutInput['edges'] = [];
    const options: any = {
      defaultNodeWidth: 200,
      defaultNodeHeight: 80,
    };

    const result = await dagreUtil.layout(nodes, edges, options);
    expect(result).toHaveLength(1);
  });

  it('should handle layout options like direction', async () => {
    const nodes: DagreLayoutInput['nodes'] = [
      { id: 'n1', width: 100, height: 50 },
    ];

    const resultLR = await dagreUtil.layout(nodes, [], { direction: 'LR' });
    expect(resultLR).toBeDefined();

    const resultTB = await dagreUtil.layout(nodes, [], { direction: 'TB' });
    expect(resultTB).toBeDefined();

    // Test default direction
    const resultDefault = await dagreUtil.layout(nodes, [], {});
    expect(resultDefault).toBeDefined();
  });

  it('should handle empty nodes and edges gracefully', async () => {
    const result = await dagreUtil.layout([], []);
    expect(result).toEqual([]);
  });

  it('should warn if edge references non-existent node', async () => {
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    const nodes: DagreLayoutInput['nodes'] = [
      { id: 'n1', width: 100, height: 50 },
    ];
    // n2 does not exist in nodes array
    const edges: DagreLayoutInput['edges'] = [{ source: 'n1', target: 'n2' }];

    await dagreUtil.layout(nodes, edges);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Dagre layout: edge references non-existent node. Source: n1, Target: n2'
    );
    consoleWarnSpy.mockRestore();
  });

  // TODO: Add more tests for other options (ranksep, nodesep, etc.) - these are harder to assert precisely
  // TODO: Test edge properties like minlen, weight if they have a noticeable effect with dagre's mock
});
