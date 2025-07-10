@echo off
echo 🧹 清理臨時修復文件...

echo 刪除修復腳本...
if exist "tmp_rovodev_lint_fix_script.js" del "tmp_rovodev_lint_fix_script.js"
if exist "tmp_rovodev_advanced_lint_fixes.js" del "tmp_rovodev_advanced_lint_fixes.js"
if exist "tmp_rovodev_test_fixes.js" del "tmp_rovodev_test_fixes.js"

echo 保留重要文檔...
echo - tmp_rovodev_final_lint_summary.md (修復總結)
echo - tmp_rovodev_code_review_report.md (代碼審查報告)
echo - tmp_rovodev_final_status.md (最終狀態報告)

echo ✅ 清理完成！

echo.
echo 📋 建議下一步：
echo 1. npm run lint
echo 2. npm run typecheck  
echo 3. npm run dev
echo 4. 手動檢查剩餘警告

pause