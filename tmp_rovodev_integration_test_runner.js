#!/usr/bin/env node

/**
 * Integration test runner for CodeMap
 * Executes integration tests and validates Supabase connections
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔗 CodeMap Integration Test Runner');
console.log('===================================');

// Check environment setup
function checkEnvironment() {
  console.log('\n🔍 Checking environment setup...');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️  Missing environment variables:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Set these in your .env.local file for testing');
  } else {
    console.log('✅ All required environment variables are set');
  }
  
  return missingVars.length === 0;
}

// Run specific test suites
function runTestSuite(suiteName, pattern) {
  console.log(`\n🧪 Running ${suiteName} tests...`);
  try {
    execSync(`npm run test -- ${pattern} --reporter=verbose`, { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'test'
      }
    });
    console.log(`✅ ${suiteName} tests completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${suiteName} tests failed:`, error.message);
    return false;
  }
}

// Main execution
try {
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });
  
  const envOk = checkEnvironment();
  
  console.log('\n🧪 Running Integration Test Suite...');
  
  const testResults = {
    auth: runTestSuite('Authentication Flow', 'src/tests/integration/auth-flow.test.ts'),
    conceptMap: runTestSuite('Concept Map Flow', 'src/tests/integration/concept-map-flow.test.ts'),
    projectAnalysis: runTestSuite('Project Analysis Flow', 'src/tests/integration/project-analysis-flow.test.ts'),
    classroom: runTestSuite('Classroom Management Flow', 'src/tests/integration/classroom-management-flow.test.ts')
  };
  
  // Summary
  console.log('\n📊 Integration Test Results:');
  console.log('============================');
  
  const passedTests = Object.values(testResults).filter(result => result).length;
  const totalTests = Object.keys(testResults).length;
  
  Object.entries(testResults).forEach(([suite, passed]) => {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${suite.charAt(0).toUpperCase() + suite.slice(1)} Flow`);
  });
  
  console.log(`\n📈 Overall: ${passedTests}/${totalTests} test suites passed`);
  
  if (!envOk) {
    console.log('\n⚠️  Note: Some tests may have been skipped due to missing environment variables');
  }
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All integration tests passed! CodeMap is ready for deployment.');
  } else {
    console.log('\n⚠️  Some integration tests failed. Please review the errors above.');
    process.exit(1);
  }
  
} catch (error) {
  console.error('\n❌ Integration test execution failed:', error.message);
  process.exit(1);
}