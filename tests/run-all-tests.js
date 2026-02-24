/**
 * Master Test Runner - Internshala Clone
 * 
 * Runs ALL test suites for the 6 project tasks:
 * 1. Public Space (posts, likes, comments, shares, friend-based limits)
 * 2. Forgot Password (once-per-day, password generator, OTP)
 * 3. Subscription Plans (plans, pricing, Razorpay, time window)
 * 4. Resume Creation (premium check, OTP, Razorpay, save)
 * 5. Multi-Language (6 languages, French OTP, translations)
 * 6. Login History (device tracking, Chrome OTP, mobile time restriction)
 */

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

function banner() {
  log('\n' + '█'.repeat(60), colors.cyan);
  log('█                                                          █', colors.cyan);
  log('█      INTERNSHALA CLONE — COMPLETE TEST SUITE             █', colors.cyan);
  log('█      Testing All 6 Project Tasks                         █', colors.cyan);
  log('█                                                          █', colors.cyan);
  log('█'.repeat(60), colors.cyan);
}

async function runAllTests() {
  banner();

  const testModules = [
    { name: '1. Public Space', file: './publicspace.test.js', fn: 'runPublicSpaceTests' },
    { name: '2. Forgot Password', file: './forgotpassword.test.js', fn: 'runForgotPasswordTests' },
    { name: '3. Subscription Plans', file: './subscription.test.js', fn: 'runSubscriptionTests' },
    { name: '4. Resume Creation', file: './resume.test.js', fn: 'runResumeTests' },
    { name: '5. Multi-Language', file: './language.test.js', fn: 'runLanguageTests' },
    { name: '6. Login History', file: './loginhistory.test.js', fn: 'runLoginHistoryTests' },
  ];

  const results = [];

  for (const module of testModules) {
    log(`\n${'─'.repeat(60)}`, colors.magenta);
    log(`TASK ${module.name}`, colors.magenta);
    log('─'.repeat(60), colors.magenta);

    try {
      const testModule = require(module.file);
      if (testModule[module.fn]) {
        await testModule[module.fn]();
        results.push({ name: module.name, status: 'completed' });
      } else {
        log(`  ⚠️  Test function ${module.fn} not found in ${module.file}`, colors.yellow);
        results.push({ name: module.name, status: 'skipped' });
      }
    } catch (error) {
      log(`  ✗ Error running ${module.name}: ${error.message}`, colors.red);
      results.push({ name: module.name, status: 'error', error: error.message });
    }
  }

  // Final Summary
  log('\n' + '█'.repeat(60), colors.cyan);
  log('█  OVERALL RESULTS                                         █', colors.cyan);
  log('█'.repeat(60), colors.cyan);

  for (const result of results) {
    const icon = result.status === 'completed' ? '✅' : result.status === 'skipped' ? '⊘' : '❌';
    const color = result.status === 'completed' ? colors.green : result.status === 'skipped' ? colors.yellow : colors.red;
    log(`  ${icon} ${result.name}: ${result.status}`, color);
  }

  const completed = results.filter(r => r.status === 'completed').length;
  log(`\n  Completed: ${completed}/${results.length} test suites`, completed === results.length ? colors.green : colors.yellow);
  log('█'.repeat(60) + '\n', colors.cyan);
}

runAllTests()
  .then(() => {
    log('All test suites executed.', colors.green);
    process.exit(0);
  })
  .catch((error) => {
    log('Master test runner failed:', colors.red);
    console.error(error);
    process.exit(1);
  });
