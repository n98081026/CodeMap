# `projectStructureAnalyzerTool` 手動測試和驗證指南 (v2)

本文檔提供了對 `projectStructureAnalyzerTool.ts` Genkit 工具進行手動測試和驗證的詳細方案。該工具負責分析用戶上傳的項目（可能是ZIP壓縮包或單個文件），提取結構信息、依賴關係、關鍵文件等，並利用AST解析和LLM摘要來生成概念圖的基礎數據。**此版本(v2)已更新，以包含對遞歸目錄分析和增強的文件類型/描述功能的測試。**

## A. 測試目標

1.  **驗證核心功能**: 工具是否能正確處理不同類型的項目輸入（ZIP包、單個文件）。
2.  **驗證文件內容處理**: 工具是否基於真實文件內容進行分析，而非僅依賴mock數據或文件名。
3.  **驗證AST解析**: 對於JavaScript, TypeScript, Python等語言，AST解析是否能準確提取代碼結構（函數、類、導入/導出等）。
4.  **驗證配置文件和清單文件解析**: 是否能從`package.json`, `pom.xml`, `requirements.txt`, `.csproj`, `build.gradle`等文件中提取元數據和依賴。
5.  **驗證多樣化文件類型識別**: `determineEffectiveFileType` 是否能準確識別包括 Dockerfile, CI/CD YAML, shell腳本, env文件, 各類配置文件 (XML, properties, ini, toml), HTML, CSS 等在內的多種文件類型。
6.  **驗證遞歸目錄分析 (`directoryStructureSummary`)**:
    *   是否能正確構建項目的目錄層次結構？
    *   每個目錄的 `fileCounts` 是否準確？
    *   `inferredPurpose` 是否基於啟發式規則（目錄名、主要文件類型）合理推斷？
    *   `MAX_DIR_DEPTH_FOR_SUMMARY` 限制是否生效？
7.  **驗證 `keyFiles` 條目的完整性和準確性**:
    *   `type` 字段是否反映了增強後的 `determineEffectiveFileType` 的識別結果？
    *   `briefDescription` 是否為特定文件類型提供了有意義的預定義描述？
    *   對於通用配置文件/腳本，`summarizeGenericFileFlow` (LLM摘要) 是否被適當調用，其結果是否更新了 `briefDescription`？
8.  **驗證安全性限制**: 新增的文件大小和數量限制是否按預期工作。
9.  **驗證錯誤處理**: 工具在遇到無效文件、解析錯誤、超限等情況時，是否能優雅處理並提供有用的錯誤信息。
10. **驗證輸出結構 (`ProjectAnalysisOutput`)**: 所有字段是否按預期填充，數據是否一致。

## B. 準備工作

1.  **測試文件/項目準備**:
    *   **B.1. 結構複雜的小型合法ZIP項目 (NEW)**:
        *   **描述**: 一個包含多層目錄結構 (至少3-4層深) 和多種文件類型的ZIP包：
            *   源代碼: JS, TS, Python 文件分佈在不同子目錄 (例如 `src/services`, `src/components`, `src/utils`, `app/api`, `lib/core`)。
            *   配置文件:
                *   根目錄: `package.json`, `pom.xml` (或 `build.gradle`), `.csproj` (選一個主要的), `requirements.txt`, `Dockerfile`, `docker-compose.yml`, `.env.example`。
                *   子目錄: `.github/workflows/ci.yml`, `scripts/deploy.sh`, `config/settings.xml`, `config/app.properties`。
            *   文檔: `README.md` (根目錄), `docs/feature-a.md`。
            *   其他: `public/index.html`, `public/css/style.css`, 一些通用 `.json` 和 `.txt` 文件。
        *   **要求**: 總解壓大小 < 15MB，文件總數 < 100。所有文本文件使用UTF-8編碼。
    *   **B.2. 單個特殊類型文件**:
        *   準備單獨的 `Dockerfile`, `docker-compose.yml`, `.gitlab-ci.yml`, `my-script.sh`, `.env`, `config.xml`, `app.ini`, `style.css`, `index.html` 文件。
    *   **B.3. 超限測試用例 (同之前版本)**: Zip Bomb, 單個大文件ZIP, 文件過多ZIP, 超大單文本文件, 超大單二進製文件。
    *   **B.4. 特殊內容文件 (同之前版本)**: 非UTF-8文本, 空源代碼文件, 語法錯誤的源代碼文件。

2.  **Supabase Storage**: 同之前版本。

3.  **工具觸發方式**: 同之前版本。

4.  **觀察點與日誌**: 同之前版本。特別關注 `[Analyzer]` 標記的日誌，以及 `summarizeGenericFileFlow` 的調用日誌。

## C. 測試用例與步驟

### C.1. 綜合功能測試 - 結構複雜的小型ZIP項目 (使用 B.1 準備的ZIP包)

1.  **操作**: 上傳 "結構複雜的小型合法ZIP項目" 到Supabase Storage。觸發 `generateMapFromProject` flow。
2.  **預期結果**:
    *   **日誌**:
        *   ZIP下載和解壓成功。文件遍歷。
        *   JS/TS/PY文件的AST分析日誌。
        *   `package.json`, `pom.xml` (或等效) 的解析日誌。
        *   **新增**: `determineEffectiveFileType` 對各種新類型文件（Dockerfile, YAML, SH, XML, INI等）的識別日誌。
        *   **新增**: 如果 `summarizeGenericFileFlow` 被觸發，應有其請求和響應日誌。
    *   **`ProjectAnalysisOutput`**:
        *   `projectName`, `inferredLanguagesFrameworks`, `dependencies`: 應準確。
        *   **`directoryStructureSummary` (重點驗證)**:
            *   是否包含多層目錄結構的摘要？
            *   每個列出目錄的 `path` 是否正確？
            *   `fileCounts` 是否準確反映了該目錄下各類型文件的數量？
            *   `inferredPurpose` 是否基於目錄名（如 `src`, `tests`, `.github/workflows`）和內容啟發式規則給出了合理的推斷？
        *   **`keyFiles` (重點驗證)**:
            *   是否包含了項目中所有重要文件（源代碼、主要配置、CI/CD、Dockerfile等）？
            *   每個文件的 `type` 是否被 `determineEffectiveFileType` 準確識別 (例如 `dockerfile`, `github_workflow_yaml`, `shell_script`, `xml_config`, `source_code_js` 等)？
            *   `briefDescription`:
                *   對於AST分析的文件，是否包含分析摘要？
                *   對於 `Dockerfile`, `*.sh` 等有預定義描述的類型，是否顯示了正確的預定義描述？
                *   對於觸發了 `summarizeGenericFileFlow` 的文件（如通用XML, INI, TOML, 部分YAML），`briefDescription` 是否是LLM生成的摘要？如果LLM失敗，是否回退到默認描述？
            *   `extractedSymbols` 對於源代碼文件是否準確？
        *   `parsingErrors`: 應儘可能少。記錄LLM摘要失敗的錯誤（如果發生）。
    *   **概念圖 (如果適用)**: 應能反映更豐富的項目結構和文件類型。

### C.2. 特定文件類型識別與描述測試 (使用 B.2 準備的單個文件)

1.  **操作**: 分別上傳 B.2 中準備的各類特殊文件 (`Dockerfile`, `docker-compose.yml`, `.gitlab-ci.yml`, `my-script.sh`, `.env`, `config.xml`, `app.ini`, `style.css`, `index.html`) 到Supabase。對每個文件，使用其直接存儲路徑觸發分析。
2.  **預期結果**:
    *   **`ProjectAnalysisOutput.keyFiles`**:
        *   應包含該單個文件的條目。
        *   `filePath`: 正確。
        *   `type`: 應被 `determineEffectiveFileType` 準確識別為對應的類型 (e.g., `dockerfile`, `docker_compose_config`, `gitlab_ci_yaml`, `shell_script`, `env_config`, `xml_config`, `text_config`, `css`, `html`)。
        *   `briefDescription`:
            *   對於 `Dockerfile`, `shell_script` 等，應顯示預定義的描述。
            *   對於 `config.xml`, `app.ini` 等，應嘗試調用 `summarizeGenericFileFlow`。檢查日誌確認LLM是否被調用，以及 `briefDescription` 是否是LLM的輸出或回退描述。
    *   **日誌**: 確認對應文件的類型識別和（如果適用）LLM摘要流程的日誌。

### C.3. 安全性限制測試 (同之前版本 - 使用 B.3)

*   **驗證點**: ZIP總大小、單個解壓文件大小、ZIP內文件數量限制是否如預期般觸發並記錄錯誤。單個下載文件的體積限制是否生效。

### C.4. 特殊內容文件測試 (同之前版本 - 使用 B.4)

*   **驗證點**: 對非UTF-8文件、空源代碼文件、語法錯誤的源代碼文件的處理是否健壯，錯誤信息是否清晰。

### C.5. 驗證AST分析的準確性 (同之前版本 - 基於 C.1 和單個源代碼文件測試)

*   **驗證點**: `extractedSymbols`, AST節點計數，LLM對代碼元素摘要的質量。

## D. 注意事項 (部分同之前版本)

*   **LLM 依賴**: `summarizeCodeElementPurposeFlow` 和新增的 `summarizeGenericFileFlow` 都依賴LLM。測試時確保LLM可用。關注LLM調用的成功率和摘要質量。
*   **迭代測試**: 建議先用最簡單的單個文件測試新增的文件類型識別和LLM摘要，再用複雜ZIP項目進行整體測試。
*   **日誌級別**: 如有必要，調整 `projectStructureAnalyzerTool.ts` 中的日誌輸出級別或詳細程度，以便更好地追蹤分析過程。

此更新後的測試指南v2更側重於驗證遞歸目錄分析的準確性，以及對擴展文件類型的識別和描述生成（包括LLM摘要）的正確性。
