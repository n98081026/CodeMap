/**
 * @fileOverview 增強的佈局引擎
 * 提供流暢的動畫佈局和智能排列功能
 */

import type { ConceptMapNode, ConceptMapEdge } from '@/types';

export interface LayoutAnimation {
  duration: number;
  easing: string;
  stagger: number;
}

export interface LayoutOptions {
  type: 'hierarchical' | 'circular' | 'force' | 'grid' | 'organic';
  spacing: {
    nodeDistance: number;
    levelDistance: number;
    padding: number;
  };
  animation: LayoutAnimation;
  centerPoint?: { x: number; y: number };
  constraints?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
}

export interface LayoutResult {
  nodes: Array<{
    id: string;
    x: number;
    y: number;
    animationDelay: number;
  }>;
  edges: Array<{
    id: string;
    path: string;
    animationDelay: number;
  }>;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export class EnhancedLayoutEngine {
  private nodes: ConceptMapNode[] = [];
  private edges: ConceptMapEdge[] = [];
  private options: LayoutOptions;

  constructor(options: Partial<LayoutOptions> = {}) {
    this.options = {
      type: 'hierarchical',
      spacing: {
        nodeDistance: 150,
        levelDistance: 100,
        padding: 50,
      },
      animation: {
        duration: 1000,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        stagger: 100,
      },
      ...options,
    };
  }

  /**
   * 設置節點和邊數據
   */
  setData(nodes: ConceptMapNode[], edges: ConceptMapEdge[]): void {
    this.nodes = [...nodes];
    this.edges = [...edges];
  }

  /**
   * 執行佈局計算
   */
  async calculateLayout(): Promise<LayoutResult> {
    switch (this.options.type) {
      case 'hierarchical':
        return this.calculateHierarchicalLayout();
      case 'circular':
        return this.calculateCircularLayout();
      case 'force':
        return this.calculateForceLayout();
      case 'grid':
        return this.calculateGridLayout();
      case 'organic':
        return this.calculateOrganicLayout();
      default:
        return this.calculateHierarchicalLayout();
    }
  }

  /**
   * 層次化佈局
   */
  private calculateHierarchicalLayout(): LayoutResult {
    const { spacing, centerPoint = { x: 400, y: 300 } } = this.options;
    const levels = this.buildHierarchy();
    const result: LayoutResult = {
      nodes: [],
      edges: [],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
    };

    let currentY = centerPoint.y - (levels.length * spacing.levelDistance) / 2;
    let maxWidth = 0;

    levels.forEach((level, levelIndex) => {
      const levelWidth = level.length * spacing.nodeDistance;
      const startX = centerPoint.x - levelWidth / 2;

      level.forEach((node, nodeIndex) => {
        const x = startX + nodeIndex * spacing.nodeDistance;
        const y = currentY;

        result.nodes.push({
          id: node.id,
          x,
          y,
          animationDelay:
            levelIndex * this.options.animation.stagger + nodeIndex * 50,
        });
      });

      maxWidth = Math.max(maxWidth, levelWidth);
      currentY += spacing.levelDistance;
    });

    // 計算邊的路徑
    this.edges.forEach((edge) => {
      const sourcePos = result.nodes.find((n) => n.id === edge.source);
      const targetPos = result.nodes.find((n) => n.id === edge.target);

      if (sourcePos && targetPos) {
        const path = this.createSmoothPath(
          { x: sourcePos.x, y: sourcePos.y },
          { x: targetPos.x, y: targetPos.y }
        );

        result.edges.push({
          id: edge.id,
          path,
          animationDelay:
            Math.max(sourcePos.animationDelay, targetPos.animationDelay) + 200,
        });
      }
    });

    // 計算邊界框
    result.boundingBox = this.calculateBoundingBox(result.nodes);

    return result;
  }

  /**
   * 圓形佈局
   */
  private calculateCircularLayout(): LayoutResult {
    const { centerPoint = { x: 400, y: 300 } } = this.options;
    const radius = Math.min(300, this.nodes.length * 20);
    const angleStep = (2 * Math.PI) / this.nodes.length;

    const result: LayoutResult = {
      nodes: [],
      edges: [],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
    };

    this.nodes.forEach((node, index) => {
      const angle = index * angleStep;
      const x = centerPoint.x + Math.cos(angle) * radius;
      const y = centerPoint.y + Math.sin(angle) * radius;

      result.nodes.push({
        id: node.id,
        x,
        y,
        animationDelay: index * this.options.animation.stagger,
      });
    });

    // 計算邊
    this.edges.forEach((edge) => {
      const sourcePos = result.nodes.find((n) => n.id === edge.source);
      const targetPos = result.nodes.find((n) => n.id === edge.target);

      if (sourcePos && targetPos) {
        const path = this.createSmoothPath(
          { x: sourcePos.x, y: sourcePos.y },
          { x: targetPos.x, y: targetPos.y }
        );

        result.edges.push({
          id: edge.id,
          path,
          animationDelay:
            Math.max(sourcePos.animationDelay, targetPos.animationDelay) + 200,
        });
      }
    });

    result.boundingBox = this.calculateBoundingBox(result.nodes);
    return result;
  }

  /**
   * 力導向佈局
   */
  private calculateForceLayout(): LayoutResult {
    const { centerPoint = { x: 400, y: 300 }, spacing } = this.options;
    const iterations = 100;
    const positions = new Map<
      string,
      { x: number; y: number; vx: number; vy: number }
    >();

    // 初始化位置
    this.nodes.forEach((node, index) => {
      const angle = (index / this.nodes.length) * 2 * Math.PI;
      const radius = 100;
      positions.set(node.id, {
        x: centerPoint.x + Math.cos(angle) * radius,
        y: centerPoint.y + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
      });
    });

    // 力導向模擬
    for (let i = 0; i < iterations; i++) {
      const alpha = 1 - i / iterations;

      // 斥力
      this.nodes.forEach((nodeA) => {
        const posA = positions.get(nodeA.id)!;

        this.nodes.forEach((nodeB) => {
          if (nodeA.id === nodeB.id) return;

          const posB = positions.get(nodeB.id)!;
          const dx = posA.x - posB.x;
          const dy = posA.y - posB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0) {
            const force =
              (spacing.nodeDistance * spacing.nodeDistance) / distance;
            const fx = (dx / distance) * force * alpha;
            const fy = (dy / distance) * force * alpha;

            posA.vx += fx;
            posA.vy += fy;
          }
        });
      });

      // 引力（邊）
      this.edges.forEach((edge) => {
        const posA = positions.get(edge.source);
        const posB = positions.get(edge.target);

        if (posA && posB) {
          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0) {
            const force = distance / spacing.nodeDistance;
            const fx = (dx / distance) * force * alpha * 0.1;
            const fy = (dy / distance) * force * alpha * 0.1;

            posA.vx += fx;
            posA.vy += fy;
            posB.vx -= fx;
            posB.vy -= fy;
          }
        }
      });

      // 更新位置
      positions.forEach((pos) => {
        pos.x += pos.vx;
        pos.y += pos.vy;
        pos.vx *= 0.9; // 阻尼
        pos.vy *= 0.9;
      });
    }

    const result: LayoutResult = {
      nodes: [],
      edges: [],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
    };

    // 轉換結果
    this.nodes.forEach((node, index) => {
      const pos = positions.get(node.id)!;
      result.nodes.push({
        id: node.id,
        x: pos.x,
        y: pos.y,
        animationDelay: index * this.options.animation.stagger,
      });
    });

    // 計算邊
    this.edges.forEach((edge) => {
      const sourcePos = result.nodes.find((n) => n.id === edge.source);
      const targetPos = result.nodes.find((n) => n.id === edge.target);

      if (sourcePos && targetPos) {
        const path = this.createSmoothPath(
          { x: sourcePos.x, y: sourcePos.y },
          { x: targetPos.x, y: targetPos.y }
        );

        result.edges.push({
          id: edge.id,
          path,
          animationDelay:
            Math.max(sourcePos.animationDelay, targetPos.animationDelay) + 200,
        });
      }
    });

    result.boundingBox = this.calculateBoundingBox(result.nodes);
    return result;
  }

  /**
   * 網格佈局
   */
  private calculateGridLayout(): LayoutResult {
    const { spacing, centerPoint = { x: 400, y: 300 } } = this.options;
    const cols = Math.ceil(Math.sqrt(this.nodes.length));
    const rows = Math.ceil(this.nodes.length / cols);

    const result: LayoutResult = {
      nodes: [],
      edges: [],
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
    };

    const startX = centerPoint.x - (cols * spacing.nodeDistance) / 2;
    const startY = centerPoint.y - (rows * spacing.levelDistance) / 2;

    this.nodes.forEach((node, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      result.nodes.push({
        id: node.id,
        x: startX + col * spacing.nodeDistance,
        y: startY + row * spacing.levelDistance,
        animationDelay: (row * cols + col) * this.options.animation.stagger,
      });
    });

    // 計算邊
    this.edges.forEach((edge) => {
      const sourcePos = result.nodes.find((n) => n.id === edge.source);
      const targetPos = result.nodes.find((n) => n.id === edge.target);

      if (sourcePos && targetPos) {
        const path = this.createSmoothPath(
          { x: sourcePos.x, y: sourcePos.y },
          { x: targetPos.x, y: targetPos.y }
        );

        result.edges.push({
          id: edge.id,
          path,
          animationDelay:
            Math.max(sourcePos.animationDelay, targetPos.animationDelay) + 200,
        });
      }
    });

    result.boundingBox = this.calculateBoundingBox(result.nodes);
    return result;
  }

  /**
   * 有機佈局
   */
  private calculateOrganicLayout(): LayoutResult {
    // 結合力導向和一些隨機性創建更自然的佈局
    const forceResult = this.calculateForceLayout();

    // 添加一些有機的變化
    forceResult.nodes.forEach((nodePos) => {
      const randomOffset = 30;
      nodePos.x += (Math.random() - 0.5) * randomOffset;
      nodePos.y += (Math.random() - 0.5) * randomOffset;
    });

    return forceResult;
  }

  /**
   * 構建層次結構
   */
  private buildHierarchy(): ConceptMapNode[][] {
    const levels: ConceptMapNode[][] = [];
    const visited = new Set<string>();
    const adjacencyList = new Map<string, string[]>();

    // 構建鄰接表
    this.edges.forEach((edge) => {
      if (!adjacencyList.has(edge.source)) {
        adjacencyList.set(edge.source, []);
      }
      adjacencyList.get(edge.source)!.push(edge.target);
    });

    // 找到根節點（沒有入邊的節點）
    const hasIncoming = new Set<string>();
    this.edges.forEach((edge) => hasIncoming.add(edge.target));
    const roots = this.nodes.filter((node) => !hasIncoming.has(node.id));

    if (roots.length === 0 && this.nodes.length > 0) {
      // 如果沒有明確的根節點，選擇第一個節點
      roots.push(this.nodes[0]);
    }

    // BFS 構建層次
    let currentLevel = roots;

    while (currentLevel.length > 0) {
      levels.push([...currentLevel]);
      currentLevel.forEach((node) => visited.add(node.id));

      const nextLevel: ConceptMapNode[] = [];
      currentLevel.forEach((node) => {
        const children = adjacencyList.get(node.id) || [];
        children.forEach((childId) => {
          if (!visited.has(childId)) {
            const childNode = this.nodes.find((n) => n.id === childId);
            if (childNode && !nextLevel.some((n) => n.id === childId)) {
              nextLevel.push(childNode);
            }
          }
        });
      });

      currentLevel = nextLevel;
    }

    // 添加未訪問的節點到最後一層
    const unvisited = this.nodes.filter((node) => !visited.has(node.id));
    if (unvisited.length > 0) {
      levels.push(unvisited);
    }

    return levels;
  }

  /**
   * 創建平滑路徑
   */
  private createSmoothPath(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): string {
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const controlOffset = 50;

    // 創建貝塞爾曲線
    return `M ${start.x} ${start.y} Q ${midX} ${midY - controlOffset} ${end.x} ${end.y}`;
  }

  /**
   * 計算邊界框
   */
  private calculateBoundingBox(nodes: Array<{ x: number; y: number }>): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    if (nodes.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
      x: minX - this.options.spacing.padding,
      y: minY - this.options.spacing.padding,
      width: maxX - minX + this.options.spacing.padding * 2,
      height: maxY - minY + this.options.spacing.padding * 2,
    };
  }
}
