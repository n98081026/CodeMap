// 測試修復腳本 - 檢查關鍵文件的語法
const fs = require('fs');
const path = require('path');

console.log('🔍 檢查關鍵文件的語法修復狀態...\n');

// 檢查的文件列表
const filesToCheck = [
  'src/ai/tools/project-analyzer-tool.ts',
  'src/components/concept-map/genai-modals.tsx',
  'src/components/tutorial/app-tutorial.tsx',
  'src/types/zodSchemas.ts',
  'tsconfig.json',
];

let allGood = true;

filesToCheck.forEach((file) => {
  const filePath = path.join(__dirname, file);

  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - 文件存在`);

    const content = fs.readFileSync(filePath, 'utf8');

    // 檢查常見的語法問題
    const issues = [];

    // 檢查未終止的字符串
    if (
      (content.includes("'") && !content.match(/'/g)) ||
      content.match(/'/g).length % 2 !== 0
    ) {
      issues.push('可能有未終止的單引號字符串');
    }

    // 檢查未匹配的括號
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`大括號不匹配: ${openBraces} 開 vs ${closeBraces} 關`);
    }

    // 檢查 TypeScript 文件的基本語法
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      if (content.includes('import') && !content.includes('from')) {
        issues.push('可能有不完整的 import 語句');
      }
    }

    if (issues.length > 0) {
      console.log(`⚠️  ${file} - 發現問題:`);
      issues.forEach((issue) => console.log(`   - ${issue}`));
      allGood = false;
    } else {
      console.log(`✅ ${file} - 語法檢查通過`);
    }
  } else {
    console.log(`❌ ${file} - 文件不存在`);
    allGood = false;
  }
});

console.log('\n📊 總結:');
if (allGood) {
  console.log('🎉 所有檢查的文件都沒有明顯的語法問題！');
} else {
  console.log('⚠️  發現一些需要修復的問題，請檢查上面的詳細信息。');
}

console.log('\n🚀 下一步建議:');
console.log('1. 安裝 Node.js 環境');
console.log('2. 運行 npm install 安裝依賴');
console.log('3. 運行 npm run lint 檢查代碼風格');
console.log('4. 運行 npm run typecheck 檢查類型');
console.log('5. 運行 npm run dev 啟動開發服務器');
