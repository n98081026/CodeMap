# CodeMap 測試執行計畫

## 當前狀態分析

- ✅ 基本測試框架已設置 (Vitest + Testing Library)
- ✅ 部分組件已有測試 (AISuggestionPanel, useConceptMapAITools 等)
- ❌ 缺少完整的測試覆蓋率
- ❌ 範例內容需要完善

## 優先執行任務

### 1. 補完關鍵組件測試 (高優先級)

- [ ] EditorToolbar 組件測試
- [ ] FlowCanvasCore 組件測試
- [ ] ConceptMapStore 更完整測試
- [ ] 服務層測試 (classroomService, conceptMapService 等)

### 2. 範例內容完善 (中優先級)

- [ ] 檢查現有範例 JSON 文件
- [ ] 添加預覽圖片
- [ ] 完善範例描述

### 3. 整合測試 (中優先級)

- [ ] API 路由測試
- [ ] 端到端用戶流程測試

### 4. 性能優化測試 (低優先級)

- [ ] 大型專案處理測試
- [ ] 記憶體使用測試

## 執行順序

1. 先檢查現有測試運行狀況
2. 補完關鍵組件測試
3. 完善範例內容
4. 添加整合測試
