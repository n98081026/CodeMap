# 🎨 視覺增強功能整合指南

## 📋 **整合步驟**

### 1. 📦 **安裝依賴**

```bash
# 安裝 Framer Motion (已添加到 package.json)
npm install framer-motion@^10.16.16

# 安裝其他可能需要的依賴
npm install
```

### 2. 🎨 **導入樣式**

在主要的 CSS 文件中導入增強視覺效果樣式：

```css
/* 在 src/app/globals.css 中添加 */
@import '../styles/enhanced-visual-effects.css';
```

### 3. 🔧 **整合到概念圖編輯器**

#### A. 更新編輯器頁面

```tsx
// src/app/(app)/concept-maps/editor/[mapId]/page.tsx

import { VisualEnhancementManager } from '@/components/concept-map/visual-enhancement-manager';
import { useEnhancedVisualEffects } from '@/hooks/useEnhancedVisualEffects';

export default function ConceptMapEditor({
  params,
}: {
  params: { mapId: string };
}) {
  // 現有的 hooks 和狀態...
  const visualEffects = useEnhancedVisualEffects(isViewOnlyMode);

  return (
    <div className='concept-map-editor'>
      {/* 現有的工具欄和控制項... */}

      {/* 添加視覺增強管理器 */}
      <VisualEnhancementManager
        nodes={mapData.nodes}
        edges={mapData.edges}
        onNodesUpdate={(updatedNodes) => {
          // 更新節點位置
          updatedNodes.forEach((node) =>
            updateNode(node.id, { x: node.x, y: node.y })
          );
        }}
        onNodeSelect={setSelectedElementId}
        selectedNodeId={selectedElementId}
        isViewOnlyMode={isViewOnlyMode}
      />

      {/* 現有的 React Flow 或其他組件... */}
    </div>
  );
}
```

#### B. 整合到 Whimsical AI 助手

```tsx
// 更新 WhimsicalAIAssistant 組件
import { useEnhancedVisualEffects } from '@/hooks/useEnhancedVisualEffects';

export function WhimsicalAIAssistant({ ... }) {
  const visualEffects = useEnhancedVisualEffects(isViewOnlyMode);

  const handleSmartLayout = useCallback(async () => {
    // 使用增強的佈局動畫
    await visualEffects.executeEnhancedLayout('hierarchical');
  }, [visualEffects]);

  const handleExtractConcepts = useCallback(async (text: string) => {
    // 在 AI 生成時添加視覺效果
    visualEffects.animateAIGeneration({ x: 400, y: 300 });

    // 現有的概念提取邏輯...
    const result = await whimsicalExtractConcepts(input);

    // 為新生成的節點添加動畫
    if (result.concepts) {
      const newNodeIds = result.concepts.map(c => `concept-${Date.now()}-${Math.random()}`);
      visualEffects.batchAnimateNodes(newNodeIds, 'bounce');
    }
  }, [visualEffects]);
}
```

### 4. 🎬 **動畫觸發點整合**

#### A. 節點交互動畫

```tsx
// 在節點組件中
const handleNodeClick = (nodeId: string) => {
  visualEffects.triggerNodeClickEffect(nodeId);
  // 現有的點擊邏輯...
};

const handleNodeHover = (nodeId: string, isHovering: boolean) => {
  visualEffects.triggerNodeHoverEffect(nodeId, isHovering);
  // 現有的懸停邏輯...
};
```

#### B. AI 操作動畫

```tsx
// 在 AI 工具中
const handleAIOperation = async (operation: string) => {
  // 開始動畫
  const centerPosition = { x: 400, y: 300 };
  visualEffects.animateAIGeneration(centerPosition);

  // 執行 AI 操作
  const result = await performAIOperation(operation);

  // 結果動畫
  if (result.success) {
    visualEffects.addVisualEffect({
      type: 'pulse',
      position: centerPosition,
      isActive: true,
      duration: 1000,
      color: '#10b981', // 成功綠色
    });
  }
};
```

### 5. 📱 **響應式配置**

#### A. 移動端適配

```tsx
// 檢測設備類型並調整動畫
const isMobile = useMediaQuery('(max-width: 768px)');

const visualEffects = useEnhancedVisualEffects(isViewOnlyMode, {
  reducedMotion: isMobile, // 移動端減少動畫
  particleCount: isMobile ? 6 : 12, // 移動端減少粒子數量
  animationDuration: isMobile ? 600 : 1200, // 移動端縮短動畫時間
});
```

#### B. 性能優化配置

```tsx
// 根據設備性能調整動畫質量
const performanceLevel = useDevicePerformance(); // 自定義 hook

const animationConfig = {
  high: { particles: 12, duration: 1200, effects: 'all' },
  medium: { particles: 8, duration: 800, effects: 'essential' },
  low: { particles: 4, duration: 400, effects: 'minimal' },
};

const config = animationConfig[performanceLevel];
```

## 🎯 **使用場景示例**

### 1. 🧠 **AI 概念生成動畫**

```tsx
const handleAIConceptGeneration = async () => {
  // 1. 開始魔法效果
  visualEffects.animateAIGeneration({ x: 400, y: 300 });

  // 2. 執行 AI 分析
  const concepts = await extractConcepts(text);

  // 3. 逐個動畫顯示新概念
  concepts.forEach((concept, index) => {
    setTimeout(() => {
      visualEffects.animateNodeAppearance(concept.id, 'bounce');
    }, index * 200);
  });

  // 4. 完成效果
  setTimeout(
    () => {
      visualEffects.addVisualEffect({
        type: 'sparkle',
        position: { x: 400, y: 300 },
        isActive: true,
        duration: 2000,
      });
    },
    concepts.length * 200 + 500
  );
};
```

### 2. 🏗️ **智能佈局切換**

```tsx
const handleLayoutSwitch = async (newLayout: LayoutType) => {
  // 1. 準備動畫 - 所有節點閃爍
  mapData.nodes.forEach((node, index) => {
    setTimeout(() => {
      visualEffects.addVisualEffect({
        type: 'sparkle',
        position: { x: node.x + 75, y: node.y + 35 },
        isActive: true,
        duration: 500,
      });
    }, index * 50);
  });

  // 2. 執行佈局動畫
  await visualEffects.executeEnhancedLayout(newLayout);

  // 3. 完成提示
  toast({
    title: '🎨 佈局更新完成',
    description: `已切換到${visualEffects.getLayoutDisplayName(newLayout)}佈局`,
  });
};
```

### 3. 🔗 **關係建立動畫**

```tsx
const handleCreateRelation = (sourceId: string, targetId: string) => {
  const sourceNode = nodes.find((n) => n.id === sourceId);
  const targetNode = nodes.find((n) => n.id === targetId);

  if (sourceNode && targetNode) {
    // 1. 源節點脈衝
    visualEffects.triggerNodeClickEffect(sourceId);

    // 2. 連接動畫
    setTimeout(() => {
      visualEffects.addVisualEffect({
        type: 'connection',
        position: {
          x: sourceNode.x + 75,
          y: sourceNode.y + 35,
        },
        isActive: true,
        duration: 1000,
      });
    }, 200);

    // 3. 目標節點脈衝
    setTimeout(() => {
      visualEffects.triggerNodeClickEffect(targetId);
    }, 800);

    // 4. 創建邊
    setTimeout(() => {
      const newEdge = createEdge(sourceId, targetId);
      visualEffects.animateEdgeCreation(newEdge.id);
    }, 1000);
  }
};
```

## ⚙️ **配置選項**

### 1. 🎨 **視覺效果配置**

```typescript
interface VisualEffectsConfig {
  // 動畫性能
  animationQuality: 'high' | 'medium' | 'low';
  reducedMotion: boolean;

  // 效果設置
  particleCount: number;
  effectDuration: number;

  // 顏色主題
  primaryColor: string;
  secondaryColor: string;
  aiColor: string;

  // 佈局設置
  defaultLayout: LayoutType;
  animationStagger: number;
}
```

### 2. 🏗️ **佈局引擎配置**

```typescript
interface LayoutEngineConfig {
  spacing: {
    nodeDistance: number;
    levelDistance: number;
    padding: number;
  };
  animation: {
    duration: number;
    easing: string;
    stagger: number;
  };
  constraints: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
}
```

## 🔧 **故障排除**

### 常見問題

#### 1. **動畫不流暢**

```typescript
// 解決方案：減少同時動畫數量
const MAX_CONCURRENT_ANIMATIONS = 5;
const animationQueue = useRef<Array<() => void>>([]);

const queueAnimation = (animation: () => void) => {
  if (activeAnimations.current < MAX_CONCURRENT_ANIMATIONS) {
    animation();
    activeAnimations.current++;
  } else {
    animationQueue.current.push(animation);
  }
};
```

#### 2. **內存洩漏**

```typescript
// 解決方案：正確清理效果
useEffect(() => {
  return () => {
    visualEffects.clearAllVisualEffects();
    // 清理所有定時器和動畫幀
  };
}, []);
```

#### 3. **移動端性能問題**

```typescript
// 解決方案：移動端優化
const isMobile =
  /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

if (isMobile) {
  // 減少動畫複雜度
  config.particleCount = 4;
  config.animationDuration = 400;
  config.enableComplexEffects = false;
}
```

## 📊 **性能監控**

### 動畫性能指標

```typescript
const performanceMonitor = {
  fps: 0,
  activeAnimations: 0,
  memoryUsage: 0,

  startMonitoring() {
    // 監控 FPS
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        this.fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    measureFPS();
  },
};
```

---

**總結**: 這個整合指南提供了完整的視覺增強功能整合步驟，包括安裝、配置、使用示例和故障排除。按照這個指南，您可以將所有增強的視覺效果無縫整合到 CodeMap 中，實現 Whimsical 級別的流暢動畫體驗！
