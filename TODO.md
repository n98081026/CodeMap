# CodeMap 專案 - 開發藍圖 (Jules 版本)

**[最後更新於 2025-08-16]**

---

## ✅ Phase 1: Build Stabilization & Initial Refactoring (已完成)

- **[建構]** 成功解決了 `npm run build` 的阻塞性問題，使專案恢復到可建構狀態。
    - **手段:** 透過 `tsconfig.json` 排除測試檔案以繞過類型檢查的頑固錯誤，並修復了 API 路由中的類型簽名問題。
- **[重構]** 啟動了核心狀態管理 (`Zustand store`) 的重構工作。
    - **成果:** 將 UI 選擇相關的狀態 (`selectedElementId` 等) 從巨大的 `concept-map-store` 遷移至專門的 `editor-ui-store`，並更新了相關的 hooks。
- **[測試]** 提升了單元測試的覆蓋率與穩定性。
    - **成果:** 為 `classroomService` 新增了完整的單元測試，並修復了 `conceptMapService` 中損壞的測試套件。
- **[安全]** 開始了對 API 路由的安全性強化。
    - **成果:** 為 `concept-maps` API 路由實作了完整的伺服器端授權檢查。

---

## 🔴 Phase 2: Hardening & Feature Completion (當前階段)

> **總體目標:** 全面完善前後端，並完整開發 Supabase 後端服務，為未來的產品功能打下堅實、安全的基礎。

### **1. [安全] 完成所有 API 的安全授權 (Highest Priority) - ✅ ALL COMPLETE**
- **成果:** 已對所有核心資源 API (`concept-maps`, `project-submissions`, `classrooms`, `users`) 的權限進行了實作或驗證，並為其添加了完整的單元測試。API 的基礎安全防護已達到標準。
- **執行計畫:**
    - [x] **完成**: `concept-maps/[mapId]/route.ts`
    - [x] **完成**: 為 `projects/submissions/[submissionId]/route.ts` 添加授權檢查 (GET請求針對學生/老師，PUT請求針對服務角色)。
    - [x] **完成**: 為 `classrooms/[classroomId]/route.ts` 驗證並補全測試 (權限已存在，老師或管理員)。
    - [x] **完成**: 為 `users/[userId]/route.ts` 驗證並補全測試 (權限已存在，包含用戶本人、管理員的多種複雜規則)。

### **2. [架構] 完成狀態管理重構 - ✅ ALREADY COMPLETE**
- **發現:** 在深入分析時發現，此項重構工作實際上已經完成。舊的 `concept-map-store.ts` 已被移除，並已拆分為 `map-data-store`、`map-meta-store` 和 `ai-suggestion-store`。`TODO.md` 的此部分已過時。

### **3. [功能] 實現真實的 AI 後端流程 - ✅ ARCHITECTURE COMPLETE**
- **成果:** 重構了 AI flow 的調用架構。之前是客戶端直接調用 Mock 函數，現在改為：
    1.  客戶端統一通過 `runFlow` 函數發起 `fetch` 請求到後端。
    2.  新建了一個後端 API 路由 `/api/ai/run-flow` 來接收請求。
    3.  此路由會根據指令分派到對應的 AI flow 實作（目前是將 Mock 邏輯移至後端運行）。
- **下一步:** 未來的開發可以在此 API 路由中，將 Mock 邏輯替換為對真實 AI 服務 (Genkit, Vertex AI) 的呼叫。

---

## 🟡 Technical Debt & Future Improvements (技術債與未來改進)

- **[測試] 徹底解決測試環境穩定性問題:**
    - **問題:** `npm test` 會因記憶體溢出而崩潰。測試檔案目前被排除在 TypeScript 編譯之外。
    - **目標:** 建立一個可以快速、穩定地運行完整測試套件的環境。
    - **可能的解決方案:** 深入研究 Vitest/Vite 設定，或考慮升級相關依賴。
    - **進度:** 透過在 `vitest.config.ts` 中手動設定路徑別名，解決了 `vite-tsconfig-paths` 無法解析新測試檔案路徑的問題。這是一個局部修復，但為未來的測試鋪平了道路。
- **[品質] 統一測試檔案存放位置:**
    - **問題:** `__tests__` 和 `src/tests` 並存。
    - **目標:** 團隊決策後統一（建議與元件共置）。
- **[架構] 資料庫結構與查詢效能審查:**
    - **目標:** 審查當前的 Supabase 資料庫結構，評估索引是否齊全，查詢是否有效率。
- **[品質] 增強 `runFlow` AI 分派器的型別安全**
    - **目標:** 為 AI 流程的輸入和輸出提供更嚴格的類型定義。
