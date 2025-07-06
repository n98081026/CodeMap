#!/usr/bin/env node

/**
 * Performance optimization script for CodeMap
 * Analyzes and suggests improvements for large project handling
 */

const fs = require('fs');
const path = require('path');

console.log('⚡ CodeMap Performance Optimizer');
console.log('================================');

// Performance optimization recommendations
const optimizations = [
  {
    category: 'React Flow Performance',
    items: [
      'Implement node virtualization for large concept maps (>100 nodes)',
      'Add memoization to custom node components',
      'Optimize edge rendering with simplified paths for distant zoom levels',
      'Implement progressive loading for large project analysis',
    ],
  },
  {
    category: 'AI Processing',
    items: [
      'Add streaming responses for long-running AI operations',
      'Implement chunked processing for large files',
      'Add caching for repeated AI analysis requests',
      'Optimize AST parsing with worker threads',
    ],
  },
  {
    category: 'Memory Management',
    items: [
      'Implement cleanup for unused concept map data',
      'Add garbage collection hints for large file processing',
      'Optimize Zustand store with selective subscriptions',
      'Implement lazy loading for non-critical components',
    ],
  },
  {
    category: 'Network Optimization',
    items: [
      'Add request debouncing for real-time features',
      'Implement compression for large concept map data',
      'Add offline support with service workers',
      'Optimize Supabase queries with proper indexing',
    ],
  },
];

// Check current bundle size
function analyzeBundleSize() {
  console.log('\n📦 Bundle Size Analysis:');
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
  if (fs.existsSync(nextConfigPath)) {
    console.log('✅ Next.js configuration found');
    console.log(
      '💡 Recommendation: Run `npm run build` and analyze bundle with @next/bundle-analyzer'
    );
  }
}

// Check for performance anti-patterns
function checkPerformancePatterns() {
  console.log('\n🔍 Performance Pattern Analysis:');

  const srcDir = path.join(process.cwd(), 'src');
  let issues = 0;

  // Check for missing React.memo in components
  const componentFiles = findFiles(srcDir, /\.tsx$/).filter(
    (file) => file.includes('/components/') && !file.includes('test')
  );

  componentFiles.forEach((file) => {
    const content = fs.readFileSync(file, 'utf8');
    if (
      content.includes('export default function') &&
      !content.includes('React.memo')
    ) {
      console.log(
        `⚠️  Consider memoizing: ${path.relative(process.cwd(), file)}`
      );
      issues++;
    }
  });

  if (issues === 0) {
    console.log('✅ No obvious performance issues detected');
  }
}

function findFiles(dir, pattern) {
  let results = [];
  const list = fs.readdirSync(dir);

  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath, pattern));
    } else if (pattern.test(file)) {
      results.push(filePath);
    }
  });

  return results;
}

// Main execution
try {
  analyzeBundleSize();
  checkPerformancePatterns();

  console.log('\n🎯 Performance Optimization Recommendations:');
  optimizations.forEach((category) => {
    console.log(`\n📋 ${category.category}:`);
    category.items.forEach((item) => {
      console.log(`   • ${item}`);
    });
  });

  console.log('\n✨ Next Steps:');
  console.log('1. Run `npm run build` to analyze current bundle size');
  console.log('2. Implement React.memo for frequently re-rendering components');
  console.log('3. Add performance monitoring with Web Vitals');
  console.log('4. Test with large concept maps (>50 nodes)');
} catch (error) {
  console.error('❌ Error during performance analysis:', error.message);
}
