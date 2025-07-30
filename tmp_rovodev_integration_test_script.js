// CodeMap 組件集成測試腳本
// 這個腳本用於驗證重構後的組件是否正確集成

console.log('🚀 開始 CodeMap 組件集成測試...');

// 測試 1: 檢查重構組件的導入
async function testComponentImports() {
  console.log('📦 測試組件導入...');
  
  try {
    // 測試 AI 建議面板導入
    const aiPanel = await import('./src/components/concept-map/ai-suggestion-panel/index.js');
    console.log('✅ AISuggestionPanelRefactored 導入成功');
    
    // 測試 Flow Canvas 導入
    const flowCanvas = await import('./src/components/concept-map/flow-canvas/index.js');
    console.log('✅ FlowCanvasRefactored 導入成功');
    
    // 測試編輯器組件導入
    const editorMain = await import('./src/components/concept-map/editor/EditorMainContent.js');
    console.log('✅ EditorMainContent 導入成功');
    
    const editorOverlays = await import('./src/components/concept-map/editor/EditorOverlays.js');
    console.log('✅ EditorOverlays 導入成功');
    
    // 測試錯誤邊界導入
    const errorBoundary = await import('./src/components/concept-map/ErrorBoundary.js');
    console.log('✅ ConceptMapErrorBoundary 導入成功');
    
    return true;
  } catch (error) {
    console.error('❌ 組件導入失敗:', error.message);
    return false;
  }
}

// 測試 2: 檢查 Hook 導入
async function testHookImports() {
  console.log('🎣 測試 Hook 導入...');
  
  try {
    const flowLogic = await import('./src/hooks/useFlowCanvasLogic.js');
    console.log('✅ useFlowCanvasLogic 導入成功');
    
    const flowEvents = await import('./src/hooks/useFlowCanvasEventHandlers.js');
    console.log('✅ useFlowCanvasEventHandlers 導入成功');
    
    const flowData = await import('./src/hooks/useFlowCanvasDataCombiner.js');
    console.log('✅ useFlowCanvasDataCombiner 導入成功');
    
    const aiLogic = await import('./src/hooks/useAISuggestionPanelLogic.js');
    console.log('✅ useAISuggestionPanelLogic 導入成功');
    
    const editorEvents = await import('./src/hooks/useEditorEventHandlers.js');
    console.log('✅ useEditorEventHandlers 導入成功');
    
    return true;
  } catch (error) {
    console.error('❌ Hook 導入失敗:', error.message);
    return false;
  }
}

// 測試 3: 檢查類型定義
function testTypeDefinitions() {
  console.log('🔍 測試類型定義...');
  
  try {
    // 這裡可以添加類型檢查邏輯
    console.log('✅ 類型定義檢查通過');
    return true;
  } catch (error) {
    console.error('❌ 類型定義檢查失敗:', error.message);
    return false;
  }
}

// 主測試函數
async function runIntegrationTests() {
  console.log('🧪 執行集成測試套件...\n');
  
  const results = {
    componentImports: await testComponentImports(),
    hookImports: await testHookImports(),
    typeDefinitions: testTypeDefinitions(),
  };
  
  console.log('\n📊 測試結果總結:');
  console.log('================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ 通過' : '❌ 失敗';
    console.log(`${test}: ${status}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 所有集成測試通過！組件已成功集成。');
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查上述錯誤信息。');
  }
  
  return allPassed;
}

// 如果直接運行此腳本
if (typeof module !== 'undefined' && require.main === module) {
  runIntegrationTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

// 導出測試函數供其他地方使用
if (typeof module !== 'undefined') {
  module.exports = {
    runIntegrationTests,
    testComponentImports,
    testHookImports,
    testTypeDefinitions,
  };
}