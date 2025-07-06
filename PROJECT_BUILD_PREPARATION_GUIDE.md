```markdown
# Next.js 專案建構前整備指南

本指南旨在協助開發者在使用 TypeScript 的 Next.js 應用程式執行 `next build` 前，系統性地檢查並確保專案達到生產環境的品質標準。

## 1. 程式碼品質保證

確保程式碼的風格一致性、可讀性以及潛在錯誤的早期發現是生產建構前的首要步驟。

### 1.1. ESLint 與 Prettier 設定與執行

*   **目標**: 統一程式碼風格，靜態分析找出潛在錯誤。
*   **核心工具與設定**:
    *   **`package.json`**:
        *   已確認包含必要的開發依賴：`eslint`, `prettier`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `eslint-config-prettier`, `eslint-plugin-prettier`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `eslint-config-next`, `@next/eslint-plugin-next`。
        *   相關腳本已定義：`lint`, `lint:fix`, `format`, `format:check`。
    *   **`eslint.config.js`**:
        *   使用 Flat Config 格式，配置了 TypeScript 解析、Next.js 規則、Prettier 整合 (`eslint-config-prettier` 和 `eslint-plugin-prettier`)。
        *   `parserOptions.project = true` 已設定，允許型別相關的 linting。
        *   **建議**: 清理 `plugins` 物件中重複的插件宣告 (雖然 ESLint 可能會處理，但保持清晰更好)。檢視被暫時關閉的規則 (如 `react-hooks/exhaustive-deps`, `@next/next/no-duplicate-head`)，評估是否可以重新啟用或調整。
    *   **`.prettierrc.json`**: 存在並已定義格式化規則。
    *   **`.eslintignore` & `.prettierignore`**: 已設定，忽略了不應檢查的檔案/目錄。

*   **執行流程**:
    1.  **格式化**: 在建構前，執行 `npm run format` (或 `yarn format`) 確保所有程式碼都已根據 Prettier 規則格式化。考慮將其整合到 Git pre-commit hook。
    2.  **Linting**: 執行 `npm run lint` (或 `yarn lint`)。
    3.  **修正 Lint 錯誤/警告**:
        *   優先執行 `npm run lint:fix` (或 `yarn lint:fix`) 進行自動修正。
        *   手動修正剩餘無法自動解決的問題。
        *   **目標**: 在 `next build` 前，理想情況下應**無 ESLint 錯誤**。警告也應逐一檢視並盡可能解決。
        *   **注意**: `next.config.ts` 中的 `eslint: { ignoreDuringBuilds: true }` 選項應在生產建構流程中設為 `false` (或移除)，以確保 ESLint 問題在建構時能被捕獲。

### 1.2. TypeScript 型別檢查

*   **目標**: 確保型別安全，減少執行時錯誤。
*   **核心工具與設定**:
    *   **`package.json`**: `typecheck` 腳本已定義為 `tsc --noEmit`。
    *   **`tsconfig.json`**: `compilerOptions.strict` 已設定為 `true`，這是推薦的最佳實踐，應保持。
*   **執行流程**:
    1.  執行 `npm run typecheck` (或 `yarn typecheck`)。
    2.  **修正所有型別錯誤**: 在執行 `next build` 前，此命令**必須成功通過，不應有任何型別錯誤**。
    3.  **注意**: `next.config.ts` 中的 `typescript: { ignoreBuildErrors: true }` 選項**不應**被視為常態。雖然 `package.json` 的 `build` 腳本會先執行 `typecheck`，但為確保生產品質，應致力於解決所有型別錯誤，並考慮在生產建構流程中將此選項設為 `false`。

## 2. 專案結構最佳實踐

良好的專案結構有助於可維護性和團隊協作。

*   **2.1. 目錄結構檢視**:
    *   **`src/app`**: App Router 核心，包含頁面、佈局、路由群組 (`(app)`, `(auth)`) 及 API 路由 (`api/`)，結構清晰。
        *   **待檢視**: `src/app/application/` 的具體角色及其與 `(app)` 路由群組的關係，確保無冗餘。
    *   **`src/components`**: 共享元件，包含 `ui/` (基礎UI) 及按功能/區塊模組化的子目錄，組織良好。
    *   **`src/lib`, `src/hooks`, `src/contexts`, `src/services`, `src/styles`, `src/types`, `public/`, `src/ai`**: 均已按功能職責劃分，符合常見實踐。
    *   **測試檔案位置**:
        *   目前散佈於各模組。
        *   **強烈建議**: 遵循 `TODO.md` 中的計畫，將測試檔案遷移到各自模組下的 `__tests__` 目錄中，以提升結構清晰度。

*   **2.2. 檔案與元件命名**:
    *   目前風格尚可 (元件 PascalCase，檔案 kebab-case/camelCase)。
    *   **建議**: 進一步統一非元件 `.ts`/`.tsx` 檔案的命名風格 (例如，全部使用 kebab-case)。

*   **2.3. 模組化與關注點分離**:
    *   專案已在很大程度上遵循此原則。
    *   持續保持元件和函式的職責單一性。

## 3. 效能優化項目檢查

確保應用程式效能是提供良好使用者體驗的關鍵。

### 3.1. 圖片優化

*   **使用 `next/image`**:
    *   全面檢查專案，將原生 `<img>` 標籤替換為 Next.js 的 `<Image>` 元件。
    *   確保為 `<Image>` 元件提供 `width` 和 `height` 屬性 (或 `fill` 屬性以配合 CSS)，避免佈局位移。
    *   對首屏或重要的 LCP (Largest Contentful Paint) 圖片使用 `priority` 屬性。
    *   `next.config.ts` 中的 `images.remotePatterns` 已允許 `placehold.co`，如有其他外部圖源需一併加入。
*   **圖片格式與大小**:
    *   優先使用 WebP、AVIF 等現代圖片格式。
    *   確保上傳到專案或 CMS 的圖片都經過適當壓縮。

### 3.2. 動態載入 (Dynamic Imports)

*   **使用 `next/dynamic`**:
    *   對於非首屏必需的元件、大型第三方庫或僅在特定互動後顯示的模組 (如複雜圖表、編輯器核心)，應使用 `next/dynamic` 進行程式碼分割和延遲載入。
    *   例如，可以審查 `src/components/concept-map/flow-canvas-core.tsx` 或其他大型儀表板元件是否適合動態載入。
*   **`React.lazy` 與 `Suspense`**: 也可用於元件級別的延遲載入，作為 `next/dynamic` 的補充。

### 3.3. Bundle 分析

*   **工具**: `@next/bundle-analyzer` 已在 `package.json` 中配置。
*   **執行**: 執行 `npm run analyze` (或 `yarn analyze`)。
*   **分析**:
    *   檢視生成的 HTML 分析報告，找出過大的 JavaScript chunk。
    *   識別是否有不必要的依賴被打包，或是否有大型依賴可以被更輕量的替代品取代。
    *   確認程式碼分割 (Code Splitting) 是否按預期工作。

### 3.4. React Memoization

*   **`React.memo`, `useMemo`, `useCallback`**:
    *   根據 `TODO.md` 的提示，並在遇到效能瓶頸時，合理使用這些 React API 來避免不必要的重新渲染。
    *   特別關注列表渲染、傳遞給子元件的回呼函式以及複雜計算。
    *   **建議**: 重新審視 `eslint-plugin-react-hooks` 的 `exhaustive-deps` 規則 (目前在 `eslint.config.js` 中為 `"off"`)，考慮啟用並修正相關警告，以幫助正確管理 `useMemo`/`useCallback` 的依賴。

### 3.5. 減少 Client-Side JavaScript

*   App Router 預設元件為 Server Components。開發時應有意識地選擇，僅在必要時 (如需互動性、生命週期方法) 才使用 `"use client"` 將元件標記為 Client Component。
*   盡可能將純展示邏輯保留在 Server Components 中。

### 3.6. 檢查 `next.config.ts` 中的設定

*   **`eslint: { ignoreDuringBuilds: true }`**: **強烈建議**在生產建構流程中將此設為 `false` (或移除該行)，以確保 ESLint 問題在建構時能被捕獲。
*   **`webpack` 設定**: 目前對 `async_hooks` 和 `fs` 的 client-side fallback (`async_hooks: false, fs: false`) 是合理的，有助於避免在客戶端打包不必要的 Node.js 核心模組。

## 4. 建構前最終檢查步驟

在執行 `next build` 之前的最後一道防線。

### 4.1. 環境變數確認

*   參考 `DEPLOYMENT_GUIDE.md`，確認所有生產環境所需的環境變數 (如 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_AI_API_KEY` 等) 均已準備就緒。
*   在 `.env.production` (或 `.env.local`，取決於部署策略) 中正確設定這些變數。
*   **極其重要**: 確保包含敏感金鑰的 `.env` 檔案**絕對不能**提交到版本控制系統。檢查 `.gitignore` 是否已包含 `*.env*` (可排除 `.env.example`)。
*   確認 CI/CD 系統中已安全配置好所有生產環境變數。
*   檢查程式碼中沒有硬編碼的敏感資訊或金鑰。

### 4.2. 錯誤處理機制檢視

*   **全域錯誤處理 (App Router)**:
    *   檢查 `src/app` 目錄下是否已建立 `error.tsx` (用於處理特定路由區段的錯誤) 和 `global-error.tsx` (用於處理根 `layout.tsx` 的錯誤)。若無，建議添加以提供更友好的錯誤頁面。
*   **API 路由錯誤處理**:
    *   審查 `src/app/api/**/*.ts` 中的 API 路由，確保它們有一致的錯誤回傳格式，並能妥善處理各種錯誤情況 (使用 try-catch，回傳適當的 HTTP 狀態碼和 JSON 錯誤訊息)。
*   **前端錯誤邊界 (Error Boundaries)**:
    *   對於應用程式中可能出錯且影響範圍可控的 UI 部分 (如第三方嵌入、複雜的動態元件)，考慮使用 React Error Boundaries 來捕獲其子元件樹中的 JavaScript 錯誤，記錄錯誤並顯示備用 UI。

### 4.3. 依賴檢查與更新

*   執行 `npm outdated` (或 `yarn outdated`) 檢查是否有過期依賴。
*   **更新策略**:
    *   優先更新 patch 版本的安全性或錯誤修復。
    *   對於 minor 或 major 版本的更新，需謹慎評估，查閱更新日誌，並在開發分支進行充分測試後再合併。
*   執行 `npm run depcheck` (腳本已在 `package.json` 定義) 來識別並考慮移除專案中未使用的依賴。

### 4.4. 移除 `console.log` 和開發者工具

*   全局搜索並移除或註解掉所有用於偵錯的 `console.log(...)`, `console.warn(...)`, `console.error(...)` 語句 (除非是刻意用於生產環境監控的日誌)。
    *   **建議**: 在 `eslint.config.js` 中啟用 `no-console` 規則 (例如設為 `"warn"`) 以協助檢查。
*   確保開發者工具 (如 Redux DevTools) 在生產建構中被正確禁用或移除。

### 4.5. 測試套件執行

*   執行 `npm run test` (或 `yarn test`) 運行所有自動化測試 (單元測試、整合測試等)。
*   **確保所有測試通過**。高測試覆蓋率是保證程式碼品質的重要手段。

### 4.6. 手動最終驗收測試 (UAT)

*   除了自動化測試，還應進行一次全面的手動 UAT。
*   模擬真實用戶場景，測試所有核心功能流程，包括：
    *   使用者註冊、登入、登出。
    *   學生/教師儀表板的核心操作。
    *   概念圖的創建、編輯、保存、載入、分享等。
    *   專案上傳、分析過程的觸發與結果展示。
    *   互動式教程系統 (`src/components/tutorial/app-tutorial.tsx`)。
*   檢查應用在不同主流瀏覽器和裝置尺寸下的響應式設計和兼容性。
*   可參考 `MANUAL_TUTORIAL_TESTING_GUIDE.md` 和 `PROJECT_ANALYZER_TESTING_GUIDE.md (v2)` 作為測試案例的起點。

## 5. 執行 `next build` 與解讀輸出

一切準備就緒後，執行生產建構。

### 5.1. 執行建構

*   **指令**: `npm run build` (或 `yarn build`)。
*   **前置檢查**: 此指令已在 `package.json` 中配置為先執行 `npm run lint && npm run typecheck`。確保這兩個前置步驟都成功通過。
*   **`next.config.js` 注意事項**:
    *   再次確認 `eslint: { ignoreDuringBuilds: false }` (或已移除該選項)。
    *   再次確認 `typescript: { ignoreBuildErrors: false }` (或已移除該選項，並確保 `typecheck` 腳本已修正所有錯誤)。

### 5.2. 解讀 `next build` 輸出資訊

仔細觀察建構完成後終端機的輸出：

*   **Route (app)**:
    *   **Size**: 每個路由的初始 JS 大小。
    *   **First Load JS**: 首次載入該路由的總 JS 大小。
    *   留意 Next.js 的顏色標記 (綠色: 良好, 黃色: 注意, 紅色: 建議優化)。對於黃色或紅色的路由，考慮使用 Bundle Analyzer 進一步分析。
*   **Rendering Indicators**:
    *   ○ **Static**: 建構時渲染為 HTML。
    *   λ **Server**: 請求時伺服器端渲染 (Server Components 或 SSR)。
    *   ● **SSG**: 建構時生成靜態 HTML (通常用於 Pages Router 的 `getStaticProps`)。
    *   ◇ **ISR**: 增量靜態再生。
*   **First Load JS shared by all**: 所有頁面共享的 JS 檔案總大小。此值應盡可能小。
*   **Warnings/Errors**:
    *   **錯誤 (Errors)**: 必須解決，否則建構通常會失敗。
    *   **警告 (Warnings)**: 雖不中止建構，但應仔細閱讀並盡可能解決，它們可能指向潛在問題。

## 6. 後續步驟 (建構完成後)

*   **部署**: 按照 `DEPLOYMENT_GUIDE.md` 中的指南將 `.next` 目錄部署到生產環境。
*   **監控**: 部署後，使用應用程式效能監控 (APM) 工具 (如 Sentry, Vercel Analytics, New Relic 等) 和日誌管理系統來追蹤應用程式的健康狀況、效能指標和潛在錯誤。

```
