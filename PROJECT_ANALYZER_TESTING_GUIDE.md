# `projectStructureAnalyzerTool` 手動測試和驗證指南

本文檔提供了對 `projectStructureAnalyzerTool.ts` Genkit 工具進行手動測試和驗證的詳細方案。該工具負責分析用戶上傳的項目（可能是ZIP壓縮包或單個文件），提取結構信息、依賴關係、關鍵文件等，並利用AST解析和LLM摘要來生成概念圖的基礎數據。

## A. 測試目標

1.  **驗證核心功能**：工具是否能正確處理不同類型的項目輸入（ZIP包、單個文件）。
2.  **驗證文件內容處理**：工具是否基於真實文件內容進行分析，而非僅依賴mock數據或文件名。
3.  **驗證AST解析**：對於JavaScript, TypeScript, Python等語言，AST解析是否能準確提取代碼結構（函數、類、導入/導出等）。
4.  **驗證配置文件解析**：是否能從`package.json`, `pom.xml`, `requirements.txt`等文件中提取元數據和依賴。
5.  **驗證安全性限制**：新增的文件大小和數量限制是否按預期工作，以防止濫用。
6.  **驗證錯誤處理**：工具在遇到無效文件、解析錯誤、超限等情況時，是否能優雅處理並提供有用的錯誤信息。
7.  **驗證輸出結構**：`ProjectAnalysisOutput`的各個字段是否按預期填充。

## B. 準備工作

1.  **測試文件/項目準備**：
    *   **B.1. 小型合法ZIP項目**:
        *   **描述**: 一個包含少量（例如5-10個）多種類型文件的ZIP包：
            *   JavaScript (`.js`): 包含一些函數、類、導入/導出。
            *   TypeScript (`.ts`): 類似JS，但使用TS語法。
            *   Python (`.py`): 包含一些函數、類、導入。
            *   JSON (`.json`): 一個 `package.json` (包含 `name`, `version`, `dependencies`, `devDependencies`) 和一個通用JSON配置文件。
            *   Markdown (`.md`): 一個 `README.md`。
            *   文本文件 (`.txt`): 普通文本。
        *   **要求**: 總解壓大小 < 10MB，文件總數 < 50。所有文件使用UTF-8編碼。
    *   **B.2. 單個源代碼文件**:
        *   準備幾個可以直接上傳到Supabase Storage的單個 `.js`, `.ts`, `.py` 文件。
    *   **B.3. 超限測試用例 (用於驗證安全限制)**:
        *   **ZIP - 總大小超限**: 一個ZIP包，其內部文件解壓後的總大小超過100MB。
        *   **ZIP - 單文件超限**: 一個ZIP包，其中包含一個單獨解壓後大小超過10MB的文件。
        *   **ZIP - 文件數量超限**: 一個ZIP包，其中包含超過1000個（例如1005個）小文件。
        *   **單文件 - 文本超限**: 一個單獨的文本文件 (`.txt`)，其大小超過10MB。
        *   **單文件 - 二進制超限**: 一個單獨的二進製文件（例如一個小型圖片偽裝成 `.bin`），其大小超過20MB。
    *   **B.4. 特殊內容文件**:
        *   **非UTF-8文本文件**: 一個使用非UTF-8編碼（例如GBK, ISO-8859-1）並包含該編碼特有字符的文本文件。
        *   **空源代碼文件**: 一個空的 `.js` 文件，一個空的 `.ts` 文件，一個空的 `.py` 文件。
        *   **語法錯誤的源代碼文件**: 每個語言（JS, TS, PY）準備一個包含明顯語法錯誤的文件。

2.  **Supabase Storage**:
    *   確保您的 `project_archives` bucket 已創建並配置正確的訪問策略（儘管服務端調用可能繞過部分RLS，但良好實踐仍需配置）。
    *   熟悉如何上傳文件到此bucket的特定路徑。

3.  **工具觸發方式**:
    *   您需要一種可靠的方式來調用 `generateMapFromProject` Genkit flow，並能指定 `projectStoragePath` 作為輸入（指向您在Supabase Storage中上傳的測試文件或ZIP包的路徑）。
    *   **選項1: 應用前端**: 如果CodeMap應用的“上傳項目”功能已完整對接到此flow，則可通過前端UI觸發。
    *   **選項2: Genkit Developer UI**: 如果Genkit flow已配置了HTTP觸發器，可以使用Genkit的開發者UI（通常在本地運行Genkit時可用）來手動觸發並提供輸入。
    *   **選項3: 編寫測試腳本**: 使用Node.js腳本和Genkit客戶端庫來調用flow。

4.  **觀察點與日誌**:
    *   **Genkit Flow 日誌**: 監控運行Genkit flow時的控制台輸出。`projectStructureAnalyzerTool.ts` 中添加的 `console.log` 和 `console.warn` (帶有 `[Analyzer]` 或 `[POC]` 標記) 會提供關鍵的執行步驟和結果信息。
    *   **`ProjectAnalysisOutput` 結構**: 檢查flow最終返回的 `ProjectAnalysisOutput` 對象。特別關注 `projectName`, `inferredLanguagesFrameworks`, `dependencies`, `directoryStructureSummary`, `keyFiles`, `potentialArchitecturalComponents`, 和 `parsingErrors` 字段。
    *   **(可選) 生成的概念圖數據**: 如果flow的下游步驟是生成概念圖，則觀察生成的圖是否與分析結果一致。

## C. 測試用例與步驟

### C.1. 基礎功能測試 - 小型合法ZIP項目 (使用 B.1 準備的ZIP包)

1.  **操作**: 上傳 "小型合法ZIP項目" 到Supabase Storage。使用其存儲路徑觸發 `generateMapFromProject` flow。
2.  **預期結果**:
    *   **日誌**:
        *   應顯示ZIP包被成功下載和解壓的日誌。
        *   應顯示遍歷ZIP內各個文件的日誌。
        *   對於JS/TS/PY文件，應有 `[Analyzer] Analyzing JS/TS/Python: [filename]` 和 `[Analyzer] JS/TS/Python AST analysis for [filename] summary: ...` 的日誌。
        *   對於 `package.json`，應有其被解析的日誌。
    *   **`ProjectAnalysisOutput`**:
        *   `projectName`: 應從 `package.json` 或ZIP文件名推斷。
        *   `inferredLanguagesFrameworks`: 應包含 "Node.js", "JavaScript", "TypeScript", "Python", "npm" 等，並有合理的 `confidence`。
        *   `dependencies`: 應包含從 `package.json` 解析出的 `npm` 依賴。
        *   `directoryStructureSummary`: 應反映ZIP包內的目錄結構和文件計數。
        *   `keyFiles`: 應包含對 `package.json`, `README.md` 以及JS/TS/PY源文件的條目，`briefDescription` 和 `extractedSymbols` 應基於真實內容。
        *   `parsingErrors`: 應為空數組，或只包含無關緊要的警告（如對非常規文件內容的警告）。
    *   **概念圖 (如果適用)**: 節點應代表提取的代碼元素（函數、類等），邊應代表它們之間的關係（例如調用、導入）。

### C.2. 基礎功能測試 - 單個源代碼文件 (使用 B.2 準備的文件)

1.  **操作**: 分別上傳單個JS, TS, PY文件到Supabase Storage。對每個文件，使用其直接存儲路徑觸發 `generateMapFromProject` flow。
2.  **預期結果**:
    *   **日誌**:
        *   應顯示單個文件被成功下載的日誌。
        *   對應的AST分析日誌 (`[Analyzer] Analyzing JS/TS/Python...`) 應出現。
    *   **`ProjectAnalysisOutput`**:
        *   `keyFiles` 應包含該單個文件的分析結果，`extractedSymbols` 和 `details` 應準確。
        *   `inferredLanguagesFrameworks` 應能識別該文件的語言。
        *   `parsingErrors` 應為空。

### C.3. 安全性限制測試 (使用 B.3 準備的超限文件/ZIP包)

1.  **ZIP - 總大小超限**:
    *   **操作**: 上傳並分析“總大小超限”的ZIP包。
    *   **預期**:
        *   日誌中應出現 `Exceeded total uncompressed size limit... Aborting unpack.` 的警告。
        *   `ProjectAnalysisOutput.parsingErrors` 應包含此錯誤信息。
        *   分析結果可能只包含在達到限制前已解壓和處理的部分文件，或者分析提前終止。
2.  **ZIP - 單文件超限**:
    *   **操作**: 上傳並分析“單文件超限”的ZIP包。
    *   **預期**:
        *   日誌中應出現 `File '[filename]' (size: ...) exceeds individual file size limit... Skipping.` 的警告。
        *   該超大文件應被跳過，不進行內容分析。
        *   `ProjectAnalysisOutput.parsingErrors` 應包含此跳過信息。
3.  **ZIP - 文件數量超限**:
    *   **操作**: 上傳並分析“文件數量超限”的ZIP包。
    *   **預期**:
        *   日誌中應出現 `Exceeded maximum file count limit... Aborting unpack.` 的警告。
        *   `ProjectAnalysisOutput.parsingErrors` 應包含此錯誤信息。
        *   分析結果可能只包含前 `MAX_FILE_COUNT` (例如1000) 個文件。
4.  **單文件 - 文本超限 (>10MB)**:
    *   **操作**: 上傳並分析“文本超限”的單個文本文件。
    *   **預期**:
        *   日誌中 `downloadProjectFile` 函數應輸出警告信息，提示文件大小超限並跳過文本轉換。
        *   `ProjectAnalysisOutput.parsingErrors` 中應記錄 `Could not read content for expected text-based file: [filename]`。
5.  **單文件 - 二進制超限 (>20MB)**:
    *   **操作**: 上傳並分析“二進制超限”的單個文件。
    *   **預期**:
        *   日誌中 `downloadProjectFileAsBuffer` 函數應輸出警告信息，提示文件大小超限並跳過。
        *   後續分析（如果依賴此Buffer）應能優雅處理（例如，將此文件標記為無法分析）。

### C.4. 特殊內容文件測試 (使用 B.4 準備的文件)

1.  **非UTF-8文本文件**:
    *   **操作**: 將其包含在一個小型ZIP包中進行分析，或作為單個文件分析。
    *   **預期**:
        *   日誌中，`unpackZipBuffer` 或 `downloadProjectFile` 在嘗試 `toString('utf8')` 時，可能會因為無效的UTF-8序列而產生包含替換字符 `\uFFFD` 的字符串，或者根據 `isLikelyText` 和 `contentType` 將其視為二進制。
        *   如果內容被傳遞給AST解析器，解析器可能會失敗。
        *   `ProjectAnalysisOutput.parsingErrors` 中應記錄相關的解碼或解析錯誤。
2.  **空源代碼文件 (JS, TS, PY)**:
    *   **操作**: 分別分析這些空文件。
    *   **預期**:
        *   AST解析器應能處理空內容（例如，返回一個空的AST或特定的“無內容”指示）。
        *   工具不應崩潰。
        *   `ProjectAnalysisOutput.keyFiles` 中對應的條目可能 `extractedSymbols` 為空，`briefDescription` 可能指示“空文件”或“無可分析的代碼元素”。
        *   `parsingErrors` 中不應有嚴重錯誤，但可能有警告或提示。
3.  **語法錯誤的源代碼文件 (JS, TS, PY)**:
    *   **操作**: 分別分析這些包含語法錯誤的文件。
    *   **預期**:
        *   對應的AST解析函數 (`analyzeJavaScriptAST`, `analyzeTypeScriptAST`, `analyzePythonAST`) 應能捕獲解析錯誤。
        *   `ProjectAnalysisOutput.parsingErrors` 中應包含針對該文件的解析錯誤信息（例如，`[filename]: JS AST Error - Unexpected token (1:5)`)。
        *   工具不應因單個文件的語法錯誤而導致整個項目分析失敗。

### C.5. 驗證AST分析的準確性 (基於 C.1 和 C.2 的結果)

*   **日誌檢查**:
    *   仔細查看 `[Analyzer] JS/TS/Python AST analysis for [filename] summary: ...` 日誌。
    *   日誌中報告的函數數量、類數量、導入/導出數量等是否與實際源代碼文件中的情況一致？
*   **`ProjectAnalysisOutput.keyFiles` 檢查**:
    *   對於每個分析過的源代碼文件，檢查其在 `keyFiles` 中的條目。
    *   `extractedSymbols` 字段是否包含了文件中主要的函數名、類名等？
    *   `details` 字段（例如 `JS AST Nodes: N`）是否反映了提取到的節點數量？
    *   `briefDescription` 是否包含了來自LLM的語義目的摘要（如果適用且LLM調用成功）？
*   **`ProjectAnalysisOutput.potentialArchitecturalComponents` (如果適用)**:
    *   檢查是否基於真實的代碼結構和依賴關係推斷出了合理的架構組件。

## D. 注意事項

*   **LLM 依賴**: 部分分析結果（如 `semanticPurpose`）依賴於 `summarizeCodeElementPurposeFlow` LLM調用。測試時需確保Genkit環境配置了有效的LLM提供者。如果LLM調用失敗或返回不理想，這不完全是 `projectStructureAnalyzerTool` 本身的錯誤，但應記錄下來。
*   **選擇器依賴 (針對本工具的內部邏輯)**: 本工具內部沒有UI選擇器，但它生成的 `DetailedNode` 的 `id` 和 `type` 對下游消費者（如 `generateMapFromAnalysisOutput` flow）很重要，確保其生成邏輯穩定。
*   **迭代測試**: 由於分析邏輯複雜，建議逐步增加測試項目的複雜度。先從最簡單的單個文件開始，再到小型項目，最後是包含特殊情況和邊緣用例的項目。

此測試指南旨在全面覆蓋 `projectStructureAnalyzerTool` 的核心功能和健壯性。執行這些測試將有助於發現潛在問題並確保工具的可靠性。
