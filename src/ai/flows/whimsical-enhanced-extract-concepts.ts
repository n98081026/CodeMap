'use server';

/**
 * @fileOverview Whimsical 風格的增強概念提取流程
 * 具有上下文感知和教育導向的智能概念提取
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WhimsicalExtractConceptsInputSchema = z.object({
  text: z.string().describe('要提取概念的文本內容'),
  existingConcepts: z.array(z.string()).optional().describe('地圖上已存在的概念列表'),
  userGoals: z.string().optional().describe('用戶的學習目標或意圖'),
  mapContext: z.string().optional().describe('當前概念圖的整體上下文'),
  difficultyLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional().describe('目標難度級別'),
});

export type WhimsicalExtractConceptsInput = z.infer<typeof WhimsicalExtractConceptsInputSchema>;

const WhimsicalExtractedConceptItemSchema = z.object({
  concept: z.string().describe('提取的關鍵概念'),
  context: z.string().describe('概念的上下文解釋'),
  source: z.string().optional().describe('概念來源的具體文本片段'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).describe('概念的難度級別'),
  category: z.enum(['core', 'supporting', 'advanced', 'prerequisite']).describe('概念在學習路徑中的類別'),
  relationships: z.array(z.string()).optional().describe('與現有概念的潛在關係'),
  pedagogicalNote: z.string().optional().describe('教學建議或學習提示'),
});

export type WhimsicalExtractedConceptItem = z.infer<typeof WhimsicalExtractedConceptItemSchema>;

const WhimsicalExtractConceptsOutputSchema = z.object({
  concepts: z.array(WhimsicalExtractedConceptItemSchema).describe('提取的概念列表'),
  learningPath: z.object({
    prerequisites: z.array(z.string()).describe('建議的前置概念'),
    coreSequence: z.array(z.string()).describe('核心學習順序'),
    extensions: z.array(z.string()).describe('延伸概念'),
  }).optional().describe('建議的學習路徑'),
  mapImprovements: z.object({
    suggestedGroupings: z.array(z.object({
      title: z.string(),
      concepts: z.array(z.string()),
      reasoning: z.string(),
    })).optional().describe('建議的概念分組'),
    layoutSuggestion: z.string().optional().describe('佈局建議'),
  }).optional().describe('地圖改進建議'),
});

export type WhimsicalExtractConceptsOutput = z.infer<typeof WhimsicalExtractConceptsOutputSchema>;

export async function whimsicalExtractConcepts(input: WhimsicalExtractConceptsInput): Promise<WhimsicalExtractConceptsOutput> {
  return whimsicalExtractConceptsFlow(input);
}

const whimsicalPrompt = ai.definePrompt({
  name: 'whimsicalExtractConceptsPrompt',
  input: { schema: WhimsicalExtractConceptsInputSchema },
  output: { schema: WhimsicalExtractConceptsOutputSchema },
  prompt: `你是一位專業的教育技術專家和概念圖分析師，擅長創建 Whimsical 風格的直觀、美觀且教育有效的概念圖。

## 當前情境分析
{{#if existingConcepts}}
**現有概念圖包含：**
{{#each existingConcepts}}
- {{this}}
{{/each}}
{{/if}}

{{#if userGoals}}
**用戶學習目標：** {{userGoals}}
{{/if}}

{{#if mapContext}}
**地圖整體上下文：** {{mapContext}}
{{/if}}

{{#if difficultyLevel}}
**目標難度級別：** {{difficultyLevel}}
{{/if}}

## 要分析的內容
{{{text}}}

## 任務要求

請以 Whimsical 的設計哲學為指導，提取 3-7 個最重要的概念。每個概念都應該：

### 1. 概念提取原則
- **清晰性**：概念名稱簡潔明瞭（1-4 個詞）
- **相關性**：與現有概念形成良好的層次結構
- **教育性**：符合指定的難度級別和學習目標
- **獨特性**：避免與現有概念重複

### 2. 教育導向分析
為每個概念提供：
- **難度級別**：基於認知負荷和先備知識要求
- **學習類別**：在整體學習路徑中的位置
- **教學建議**：如何最好地理解和記憶這個概念

### 3. Whimsical 風格考量
- 概念應該能夠形成視覺上吸引人的佈局
- 關係應該清晰且邏輯性強
- 整體結構應該支持直觀的探索和理解

### 4. 智能建議
基於分析結果，提供：
- **學習路徑**：概念的學習順序建議
- **分組建議**：邏輯相關的概念組合
- **佈局建議**：視覺組織的最佳方式

## 輸出格式
返回 JSON 格式，包含提取的概念、學習路徑建議和地圖改進建議。

## 範例輸出結構
{
  "concepts": [
    {
      "concept": "用戶認證流程",
      "context": "確保系統安全性的核心機制，涉及身份驗證和授權",
      "source": "用戶登錄時需要驗證身份...",
      "difficulty": "intermediate",
      "category": "core",
      "relationships": ["數據庫安全", "會話管理"],
      "pedagogicalNote": "建議先理解基本的安全概念，再學習具體的認證實現"
    }
  ],
  "learningPath": {
    "prerequisites": ["基礎安全概念"],
    "coreSequence": ["用戶認證流程", "會話管理", "權限控制"],
    "extensions": ["多因素認證", "單點登錄"]
  },
  "mapImprovements": {
    "suggestedGroupings": [
      {
        "title": "安全機制",
        "concepts": ["用戶認證", "數據加密", "訪問控制"],
        "reasoning": "這些概念都與系統安全相關，應該組織在一起便於理解"
      }
    ],
    "layoutSuggestion": "建議使用層次化佈局，將安全相關概念放在中心位置"
  }
}`,
});

const whimsicalExtractConceptsFlow = ai.defineFlow(
  {
    name: 'whimsicalExtractConceptsFlow',
    inputSchema: WhimsicalExtractConceptsInputSchema,
    outputSchema: WhimsicalExtractConceptsOutputSchema,
  },
  async (input) => {
    const { output } = await whimsicalPrompt(input);
    return output!;
  }
);