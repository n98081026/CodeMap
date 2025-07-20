# CodeMap 交互式教程手動測試指南

本文檔提供了對 CodeMap 應用程式中 React Joyride 交互式教程進行手動測試的詳細步驟和驗證標準。

## A. 通用準備工作

1.  **啟動應用程式**:
    - 在您的開發環境中運行 `npm run dev` 以啟動 CodeMap 應用程式。
2.  **打開瀏覽器開發者工具**:
    - 建議使用 Chrome、Firefox 或 Edge 瀏覽器。
    - 打開開發者工具，主要關注以下面板：
      - **Console**: 查看教程庫 (React Joyride) 的調試日誌以及任何潛在的錯誤信息。
      - **Application** (Chrome/Edge) / **Storage** (Firefox): 用於查看和管理 Local Storage，教程的完成狀態和當前步驟索引存儲在此。
3.  **管理教程狀態 (Local Storage)**:
    - 教程的完成狀態通過 Local Storage 中的鍵值對進行跟踪。鍵的格式通常為 `[tutorialKey]_completed` (值為 `'true'`) 和 `[tutorialKey]_stepIndex` (值為數字字符串)。
    - **初次測試或重新測試**: 為確保教程按預期為新用戶觸發，請在測試前清除相應的 Local Storage 條目。例如，要測試 `dashboardTutorial`，請刪除 `dashboardTutorial_completed` 和 `dashboardTutorial_stepIndex`。
    - **測試持久性**: 完成或跳過教程後，檢查 Local Storage 中是否正確設置了 `[tutorialKey]_completed: 'true'`。刷新頁面或重新登錄後，該教程不應再次自動啟動（除非是設計為可重複觸發的）。
4.  **React Joyride 調試模式**:
    - 在 `src/components/tutorial/app-tutorial.tsx` 文件中，可以取消 `<Joyride ... />` 組件末尾 `// debug` 的註釋，改為 `debug={true}`。這將在瀏覽器控制台中輸出詳細的 Joyride 事件和狀態信息，有助於調試。

## B. 特定教程測試流程

### B.1. 儀表板介紹 (`dashboardTutorial`)

- **觸發條件**:
  1.  清除 Local Storage 中的 `dashboardTutorial_completed` 和 `dashboardTutorial_stepIndex`。
  2.  使用任一角色（學生、教師、管理員）登錄系統。
  3.  成功登錄並導航到對應角色的主儀表板頁面。
- **預期行為**: 教程應自動開始。
- **步驟驗證**:
  1.  **歡迎語**:
      - **目標**: 頁面主體 (`body`)。
      - **內容**: 「歡迎使用 CodeMap！...」
      - **驗證**: 彈窗是否居中顯示？內容是否正確？
  2.  **側邊欄導航**:
      - **目標**: `.sidebar-nav-container` (或其他 `SidebarNav` 組件的根元素選擇器)。
      - **內容**: 「這裡是主導航欄...」
      - **驗證**: 側邊欄是否被準確高亮？彈窗位置是否合理（例如在右側）？文字是否正確？
  3.  **主內容區域**:
      - **目標**: `.main-layout-content-area` (或其他 `MainLayout` 中主內容區域的選擇器)。
      - **內容**: 「這個區域將顯示您選擇的功能頁面...」
      - **驗證**: 主內容區域是否被準確高亮？文字是否正確？
  4.  **用戶菜單**:
      - **目標**: `.navbar-user-button` (或其他用戶頭像/下拉菜單的選擇器)。
      - **內容**: 「點擊這裡可以管理您的個人資料或登出。」
      - **驗證**: 用戶菜單觸發器是否被準確高亮？彈窗位置是否合理（例如在下方末端）？文字是否正確？
  5.  **角色特定儀表板鏈接**:
      - **學生**:
        - 目標1: `a[href='/student/concept-maps']` (我的概念圖)
        - 目標2: `a[href='/student/projects/submit']` (提交專案)
      - **教師**:
        - 目標1: `a[href='/teacher/classrooms']` (管理教室)
      - **管理員**:
        - 目標1: `a[href='/admin/users']` (用戶管理)
        - 目標2: `a[href='/admin/settings']` (系統設定)
      - **驗證**: 根據登錄用戶的角色，對應的鏈接/卡片是否被準確高亮？說明文字是否正確？
- **教程控件測試**:
  - **「下一步」按鈕**: 點擊後是否正確導向下一教程步驟？
  - **「上一步」按鈕**: (非第一步時) 點擊後是否正確返回上一教程步驟？
  - **「跳過」按鈕**: 點擊後教程是否立即終止？
  - **「完成」按鈕**: (在最後一步時) 點擊後教程是否關閉？
- **狀態持久性驗證**:
  - 完成或跳過教程後，刷新頁面。
  - 登出後重新登錄。
  - **預期**: 教程不應再次自動啟動。Local Storage 中 `dashboardTutorial_completed` 應為 `'true'`，`dashboardTutorial_stepIndex` 應被清除或為初始值。

### B.2. 專案上傳與AI分析指引 (`projectUploadTutorial`)

- **觸發條件**:
  1.  清除 Local Storage 中的 `projectUploadTutorial_completed` 和 `projectUploadTutorial_stepIndex`。
  2.  以 **學生** 身份登錄。
  3.  導航到「提交專案」頁面 (`/student/projects/submit`)。
- **預期行為**: 教程應在頁面加載一段短延遲後自動開始（約200ms）。
- **步驟驗證** (_注意：以下選擇器是基於推測的，請根據 `ProjectUploadForm.tsx` 的實際DOM結構進行驗證和調整，或確保組件已添加推薦的 `data-tutorial-id` 屬性_):
  1.  **介紹頁面功能**:
      - **目標**: `.project-upload-form-container` (頁面主容器)。
      - **內容**: 「歡迎來到專案提交頁面！...」
      - **驗證**: 彈窗是否居中？內容是否正確？
  2.  **文件上傳區域**:
      - **目標**: (推測) `.file-upload-dropzone` 或 `input[type='file']` 的父容器。_需要確認或添加 `data-tutorial-id='project-file-dropzone'`_。
      - **內容**: 「點擊或拖拽您的專案壓縮文件...」
      - **驗證**: 文件上傳區域是否準確高亮？
  3.  **用戶目標輸入框**:
      - **目標**: `textarea[name='userGoals']`。
      - **內容**: 「請在這裡簡要描述您希望通過AI分析達成的目標...」
      - **驗證**: 目標輸入框是否準確高亮？
  4.  **提交按鈕**:
      - **目標**: (推測) `button[type='submit']` 且包含特定文本或class，例如 `.submit-project-button`。_需要確認或添加 `data-tutorial-id='project-submit-button'`_。
      - **內容**: 「填寫完成後，點擊這裡開始上傳和分析...」
      - **驗證**: 提交按鈕是否準確高亮？
- **教程控件和狀態持久性**: 同 B.1。檢查 `projectUploadTutorial_completed`。

### B.3. 概念地圖編輯器基礎 (`editorTutorial`)

- **觸發條件**:
  1.  清除 Local Storage 中的 `editorTutorial_completed` 和 `editorTutorial_stepIndex`。
  2.  登錄後，打開/創建任何概念地圖，進入編輯器頁面 (`/concept-maps/editor/[mapId]`)。
- **預期行為**: 教程應在頁面和地圖數據加載完成一段短延遲後自動開始（約500ms）。
- **步驟驗證** (_選擇器基於推測和 `EditorToolbar.tsx` 中建議添加的 `data-tutorial-id`_):
  1.  **編輯器介紹**:
      - **目標**: `.concept-map-editor-container` (編輯器頁面主容器)。
      - **內容**: 「歡迎來到概念地圖編輯器！...」
  2.  **保存按鈕**:
      - **目標**: `button[data-tutorial-id='editor-save-map']`。
      - **內容**: 「完成編輯後，記得點擊這裡保存您的地圖。」
  3.  **添加節點按鈕**:
      - **目標**: `button[data-tutorial-id='editor-add-node']`。
      - **內容**: 「點擊此按鈕在畫布上添加一個新的概念節點。」
  4.  **添加邊按鈕**:
      - **目標**: `button[data-tutorial-id='editor-add-edge']`。
      - **內容**: 「使用此按鈕或拖拽節點連接樁來連接兩個節點。」
  5.  **AI工具按鈕/菜單**:
      - **目標**: `button[aria-label='AI Tools']` (AI工具下拉菜單的觸發器)。
      - **內容**: 「這裡集成了多種AI工具...」
  6.  **畫布區域**:
      - **目標**: `.react-flow__pane` (React Flow 的交互畫布)。
      - **內容**: 「這是您的畫布區域...」
  7.  **屬性檢查器 (觸發按鈕)**:
      - **目標**: `#tutorial-target-toggle-properties-button` (打開屬性檢查器的按鈕)。
      - **內容**: 「點擊此按鈕打開屬性面板...」
- **教程控件和狀態持久性**: 同 B.1。檢查 `editorTutorial_completed`。

### B.4. 使用AI工具 - 提取概念 (`extractConceptsToolTutorial`)

- **觸發條件**:
  1.  清除 Local Storage 中的 `extractConceptsToolTutorial_completed` 和 `extractConceptsToolTutorial_stepIndex`。
  2.  在概念地圖編輯器頁面。
  3.  **手動觸發**: 需要一個UI元素（例如 `EditorToolbar.tsx` 中的一個臨時測試按鈕或幫助菜單中的一個選項）來調用 `useTutorialStore` 的 `startOrResumeTutorial('extractConceptsToolTutorial', 0, true)`。
      - **臨時按鈕示例 (可添加到 `EditorToolbar.tsx` 的 JSX 中進行測試)**:
        ```tsx
        // 確保導入 useTutorialStore 和 Button
        // const { startOrResumeTutorial } = useTutorialStore();
        <Button
          onClick={() =>
            startOrResumeTutorial('extractConceptsToolTutorial', 0, true)
          }
        >
          Test AI: Extract Concepts Tutorial
        </Button>
        ```
- **預期行為**: 點擊觸發元素後，教程開始。
- **步驟驗證** (_選擇器基於推測，需要驗證並可能在組件中添加 `data-tutorial-id`_):
  1.  **教程介紹**:
      - **目標**: `.react-flow__pane`。
      - **內容**: 「現在來學習如何使用 AI 從節點文本中提取關鍵概念。」
  2.  **選擇節點提示**:
      - **目標**: `.custom-node.selected` (React Flow 通常會給選中的節點添加 `selected` class，或者是一個更通用的提示，指示用戶選擇節點)。
      - **內容**: 「首先，請確保您已選中一個包含一些文本內容的節點...」
      - **驗證**: 如果沒有節點被選中，此步驟是否能正確引導用戶？
  3.  **打開AI工具菜單**:
      - **目標**: `button[aria-label='AI Tools']`。
      - **內容**: 「點擊AI工具按鈕，打開AI功能菜單。」
  4.  **選擇「提取概念」工具**:
      - **目標**: `button[data-tutorial-id='ai-tool-extract-concepts']` (_確保 `EditorToolbar.tsx` 中「提取概念」的 `DropdownMenuItem` 或按鈕有此ID_)。
      - **內容**: 「然後，從菜單中選擇「提取概念」。」
  5.  **「提取概念」模態框**:
      - **目標**: `[role='dialog'][aria-labelledby='extract-concepts-title']` (_確認 `ExtractConceptsModal` 的 `DialogContent` 是否有此 aria 屬性，或為其添加特定 class/ID，如 `.extract-concepts-modal-content`_)。
      - **內容**: 「這是提取概念的對話框...」
  6.  **模態框中的「提取」按鈕**:
      - **目標**: `button[type='submit'][data-tutorial-id='extract-concepts-submit']` (_確保模態框內的提交按鈕有此ID_)。
      - **內容**: 「點擊此按鈕開始提取。」
  7.  **查看結果 - AI建議面板觸發按鈕**:
      - **目標**: `button[data-tutorial-id='editor-toggle-ai-panel']` (_確保 `EditorToolbar.tsx` 中AI建議面板的切換按鈕有此ID_)。
      - **內容**: 「提取完成後，AI生成的概念會顯示在AI建議面板中...」
  8.  **AI建議面板內容**:
      - **目標**: `.ai-suggestion-panel` (_確認 `AISuggestionPanel.tsx` 的根元素有此 class 或其他可定位標識符_)。
      - **內容**: 「在這裡，您可以看到提取出的概念列表...」
  9.  **教程完成提示**:
      - **目標**: `body`。
      - **內容**: 「太棒了！您已經學會了如何使用AI提取概念...」
- **教程控件和狀態持久性**: 同 B.1。檢查 `extractConceptsToolTutorial_completed`。

## C. UI/UX 細化和樣式測試點 (適用於所有教程)

- **顏色和字體**:
  - 工具提示框、按鈕、文本顏色是否與 CodeMap 主題（包括亮色和暗色模式）協調一致？
  - 字體是否正確應用了 'Inter' (或應用程式指定的字體)？
- **圓角和邊框**:
  - 工具提示框和按鈕的圓角、邊框樣式是否與應用程式的整體 UI 風格（例如 ShadCN/UI 組件風格）一致？
  - `AppTutorial.tsx` 中 `styles` prop 裡設置的 `hsl(var(--card))`、`hsl(var(--primary))`、`var(--radius)` 等是否生效？
- **可讀性**:
  - 工具提示框中的標題和內容文字大小、行高、對比度是否確保了良好的可讀性？
- **遮罩層 (Overlay)**:
  - 顏色和透明度 (`overlayColor: 'hsla(var(--background-hsl), 0.7)'`) 是否合適？
  - 是否有效引導用戶注意力到高亮元素？
  - _注意_: 驗證 `globals.css` 中是否存在 `--background-hsl` 這樣的原始 HSL 值變量，如果不存在，`hsla(var(--background-hsl), 0.7)` 可能無法正確解析。如果 `--background` 是 `hsl(...)` 格式，則需要調整。
- **高亮目標元素 (Spotlight)**:
  - 目標元素是否被準確、清晰地高亮？
  - 高亮區域的 `borderRadius: 'var(--radius-sm)'` 是否生效？(需確認 `--radius-sm` 在 `globals.css` 中已定義)。
- **響應式和佈局**:
  - 在不同的瀏覽器窗口大小下，教程的工具提示框是否顯示正常，沒有溢出、錯位或遮擋重要內容？
- **按鈕文本和國際化**:
  - `locale` prop 中定義的中文按鈕文本（「上一步」、「下一步」、「跳過」、「完成」、「關閉」）是否正確顯示？
- **交互流暢性**:
  - 教程步驟之間的過渡是否流暢？
  - 點擊控件的響應是否及時？
- **`:root` CSS 變量**:
  - 確認 `AppTutorial.tsx` 中 `styles` prop 使用的 CSS 變量（如 `--card`, `--primary`, `--border`, `--radius`, `--shadow-lg`）均已在 `globals.css` 的 `:root` 或 `.dark` 選擇器中正確定義。

## D. 調試技巧

- **瀏覽器控制台**: 密切關注是否有來自 React Joyride 的錯誤或警告，特別是關於找不到 `target` 元素的。
- **Joyride `debug` prop**: 在 `<Joyride debug />` 中啟用此 prop 會在控制台輸出大量詳細信息。
- **元素檢查器**: 使用瀏覽器開發者工具的元素檢查器來驗證目標元素的確切選擇器 (ID, class, `data-tutorial-id` 屬性等)。
- **逐步測試**: 隔離測試每個教程流程，有助於定位問題。
- **Local Storage 管理**: 熟悉如何清除特定教程的 Local Storage 條目以重複測試。

通過遵循這些測試步驟和標準，應能全面評估交互式教程功能的正確性、可用性和視覺效果。
