#!/usr/bin/env node

/**
 * Cleanup script for CodeMap development
 * Removes temporary files created during TODO completion
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 CodeMap Cleanup Script');
console.log('=========================');

const tempFiles = [
  'tmp_rovodev_test_runner.js',
  'tmp_rovodev_performance_optimizer.js',
  'tmp_rovodev_completion_report.md',
  'tmp_rovodev_integration_test_runner.js',
  'tmp_rovodev_final_completion_summary.md',
  'tmp_rovodev_whimsical_gai_enhancements.md',
  'tmp_rovodev_whimsical_gai_completion_summary.md',
  'tmp_rovodev_enhanced_visual_completion_summary.md',
  'tmp_rovodev_cleanup.js',
];

let cleanedCount = 0;

tempFiles.forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Removed: ${file}`);
      cleanedCount++;
    } catch (error) {
      console.log(`❌ Failed to remove: ${file} - ${error.message}`);
    }
  } else {
    console.log(`⚠️  Not found: ${file}`);
  }
});

console.log(`\n🎉 Cleanup completed! Removed ${cleanedCount} temporary files.`);
console.log('\n📋 Summary of completed work:');
console.log('- ✅ Test structure reorganized');
console.log('- ✅ Unit tests added for critical components');
console.log('- ✅ Example content populated with meaningful data');
console.log('- ✅ Performance optimization tools created');
console.log('- ✅ Whimsical GAI features implemented');
console.log('- ✅ Enhanced visual effects and animations');
console.log('- ✅ Advanced layout engine with 5 algorithms');
console.log('- ✅ TODO.md updated with completion status');

console.log('\n🚀 CodeMap is now ready for the next development phase!');
