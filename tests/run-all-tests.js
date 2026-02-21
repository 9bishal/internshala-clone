/**
 * Combined Test Runner
 * 
 * Runs all test suites and provides a comprehensive report
 */

const { runPublicSpaceTests } = require('./publicspace.test');
const { runLoginHistoryTests } = require('./loginhistory.test');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function banner(title) {
  const line = '═'.repeat(60);
  log(`\n${line}`, colors.cyan);
  log(`  ${title}`, colors.cyan);
  log(`${line}\n`, colors.cyan);
}

async function runAllTests() {
  banner('🧪 INTERNSHALA CLONE - COMPLETE TEST SUITE');
  
  log('Testing Environment:', colors.yellow);
  log('  Backend API: http://localhost:4000/api');
  log('  Frontend App: http://localhost:3000');
  log('  Date: ' + new Date().toLocaleString());
  log('');

  const startTime = Date.now();
  let exitCode = 0;

  try {
    // Run Public Space Tests
    banner('📱 PUBLIC SPACE FEATURE TESTS');
    await runPublicSpaceTests();

    // Wait a bit between test suites
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Run Login History Tests
    banner('🔐 LOGIN HISTORY FEATURE TESTS');
    await runLoginHistoryTests();

  } catch (error) {
    log('\n❌ Test suite encountered an error:', colors.red);
    console.error(error);
    exitCode = 1;
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  banner('📊 FINAL REPORT');
  log(`Total Execution Time: ${duration}s`, colors.yellow);
  log('');

  if (exitCode === 0) {
    log('✅ All test suites completed successfully!', colors.green);
  } else {
    log('⚠️  Some tests failed. Please review the output above.', colors.red);
  }

  log('\n' + '═'.repeat(60) + '\n', colors.cyan);

  process.exit(exitCode);
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
