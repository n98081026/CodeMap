# 專案邏輯分析

## 1. 整體架構

本專案採用 Next.js 的 App Router 進行路由管理，並將路由分為以下幾個群組：

*   `(app)`: 需要身份驗證的應用程式主體部分，包含了學生、老師、管理員的操作介面。
*   `(auth)`: 處理身份驗證相關的頁面，如登入、註冊。
*   `api`: 處理後端 API 路由，與 Supabase 進行互動。
*   `application`: 這個目錄看起來與 `(app)` 有些重複，在後續的分析中，我會釐清它的作用，並建議是否需要整合。

`src/app/layout.tsx` 是整個應用的根佈局，它包裹了 `(app)` 和 `(auth)` 的佈局，並提供了 `AuthProvider` 來管理全域的身份驗證狀態。

## 2. 狀態管理

專案使用 `Zustand` 來進行全域狀態管理，主要的 store 是 `src/stores/concept-map-store.ts`。這個 store 負責管理：

*   **概念圖資料 (`mapData`)**: 包含節點 (`nodes`) 和邊 (`edges`) 的陣列。
*   **使用者操作狀態**: 例如 `selectedElementId`、`editingNodeId`、`isConnectingMode` 等。
*   **AI 功能狀態**: 例如 `aiExtractedConcepts`、`aiSuggestedRelations`、`stagedMapData`、`ghostPreviewData` 等。
*   **歷史紀錄**: 使用 `zundo` middleware 來實現撤銷/重做功能。

## 3. 核心元件

*   **`src/components/concept-map/flow-canvas-core.tsx`**: 這是概念圖的核心畫布元件，基於 `reactflow` 函式庫。它負責渲染節點和邊，並處理使用者的互動操作，例如拖曳、點擊、連線等。
*   **`src/components/concept-map/custom-node.tsx`**: 這是自定義的節點元件，它定義了節點的樣式和行為。
*   **`src/components/concept-map/genai-modals.tsx`**: 這是一系列的 AI 功能彈出視窗，例如「抓重點」、「建議關聯」、「擴展概念」等。

## 4. 資料流

專案的資料流大致如下：

1.  **後端**: 使用 Supabase 作為後端服務，包含了資料庫、身份驗證、儲存等功能。
2.  **API 層**: `src/app/api` 目錄下的 API 路由，負責處理前端的請求，並與 Supabase 進行互動。
3.  **服務層**: `src/services` 目錄下的檔案，封裝了與 Supabase 互動的邏輯，例如 `userService.ts`、`classroomService.ts` 等。
4.  **前端**:
    *   **頁面元件**: `src/app/(app)` 和 `src/app/(auth)` 下的頁面元件，負責發起 API 請求，並將取得的資料傳遞給子元件。
    *   **狀態管理**: `Zustand` store (`concept-map-store.ts`) 負責管理從後端取得的資料，以及前端的 UI 狀態。
    *   **UI 元件**: `src/components` 目錄下的元件，負責渲染資料和處理使用者互動。

## 5. AI 功能

專案的 AI 功能主要由 `src/ai/flows` 目錄下的 Genkit flows 來實現。這些 flows 會被 `src/ai/tools` 目錄下的工具呼叫，並透過 `src/components/concept-map/genai-modals.tsx` 中的彈出視窗與使用者互動。

*   **`project-analyzer-tool.ts`**: 這是一個核心的 AI 工具，它會分析使用者上傳的專案，並提取出概念和關聯。
*   **`summarize-generic-file-flow.ts`**: 這個 flow 負責總結通用檔案的內容。
*   **`extract-concepts.ts`**: 這個 flow 負責從文字中提取概念。
*   **`suggest-relations.ts`**: 這個 flow 負責建議概念之間的關聯。

## 6. 型別定義

專案的型別定義主要集中在 `src/types` 目錄下，其中 `index.ts` 匯出了大部分的型別。`zodSchemas.ts` 使用 `Zod` 來定義資料的 schema，並用於表單驗證。

---

接下來，我將開始修復型別錯誤。
